import { documentRepository } from "../repositories/documentRepository.js";
import { appendAudit, readBlob, writeBlob } from "../utils/fileStore.js";
import { newId } from "../utils/id.js";
import { sha256Hex } from "../utils/checksum.js";
import { nowIso } from "../utils/time.js";
import { processingService } from "./processingService.js";
import { validateStatusChange } from "../utils/validators.js";

export const documentService = {
  async list(filters) {
    const docs = await documentRepository.list();
    const { status, docType, clientRef } = filters ?? {};

    return docs.filter((d) => {
      const okStatus = status ? d.status === status : true;
      const okType = docType ? d.docType === docType : true;
      const okClient = clientRef ? (d.clientRef ?? "").includes(clientRef) : true;
      return okStatus && okType && okClient;
    });
  },

  async get(id) {
    return await documentRepository.getById(id);
  },

  async getContent(id) {
    const doc = await documentRepository.getById(id);
    if (!doc) return { ok: false, status: 404, message: "Document not found" };

    const text = await readBlob(id);
    await appendAudit({ action: "CONTENT_READ", docId: id });

    return { ok: true, doc, text };
  },

  async create({ clientRef, docType, filename, contentType, decoded }) {
    const id = newId();
    const createdAt = nowIso();

    const checksum = sha256Hex(decoded.text);

    const baseDoc = {
      id,
      clientRef,
      docType,
      filename,
      contentType,
      sizeBytes: decoded.sizeBytes,
      checksum,
      status: "RECEIVED",
      reason: null,
      createdAt,
      updatedAt: createdAt
    };

    await writeBlob(id, decoded.text);

    const validation = processingService.validateContent({
      text: decoded.text,
      filename,
      contentType
    });

    const finalDoc = validation.ok
      ? { ...baseDoc, status: "VALIDATED" }
      : { ...baseDoc, status: "REJECTED", reason: validation.reason };

    await documentRepository.saveNew(finalDoc);

    await appendAudit({
      action: "CREATE",
      docId: id,
      clientRef,
      docType,
      status: finalDoc.status
    });

    if (finalDoc.status !== baseDoc.status) {
      await appendAudit({
        action: "STATUS_CHANGE",
        docId: id,
        from: baseDoc.status,
        to: finalDoc.status,
        reason: finalDoc.reason
      });
    }

    return finalDoc;
  },

  async updatePut(id, updates, decodedOrNull) {
    const existing = await documentRepository.getById(id);
    if (!existing) return { ok: false, status: 404, message: "Document not found" };
    if (existing.status === "PROCESSED") return { ok: false, status: 409, message: "PROCESSED documents cannot be modified" };

    const updated = await documentRepository.replaceById(id, (doc) => {
      const next = {
        ...doc,
        clientRef: updates.clientRef ?? doc.clientRef,
        docType: updates.docType ?? doc.docType,
        filename: updates.filename ?? doc.filename,
        contentType: updates.contentType ?? doc.contentType,
        updatedAt: nowIso()
      };

      if (decodedOrNull?.ok) {
        next.sizeBytes = decodedOrNull.sizeBytes;
        next.checksum = sha256Hex(decodedOrNull.text);
      }

      return next;
    });

    if (decodedOrNull?.ok) {
      await writeBlob(id, decodedOrNull.text);
      await appendAudit({ action: "CONTENT_REPLACED", docId: id });
    }

    await appendAudit({ action: "UPDATE", docId: id });

    return { ok: true, doc: updated };
  },

  async patchStatus(id, newStatus, reason) {
    const existing = await documentRepository.getById(id);
    if (!existing) return { ok: false, status: 404, message: "Document not found" };

    const v = validateStatusChange(existing.status, newStatus, reason);
    if (!v.ok) return { ok: false, status: 409, message: "Invalid status change", details: v.errors };

    const updated = await documentRepository.replaceById(id, (doc) => ({
      ...doc,
      status: newStatus,
      reason: newStatus === "REJECTED" ? reason : null,
      updatedAt: nowIso()
    }));

    await appendAudit({
      action: "STATUS_CHANGE",
      docId: id,
      from: existing.status,
      to: newStatus,
      reason: newStatus === "REJECTED" ? reason : null
    });

    return { ok: true, doc: updated };
  },

  async deleteLogical(id, reason) {
    const existing = await documentRepository.getById(id);
    if (!existing) return { ok: false, status: 404, message: "Document not found" };
    if (existing.status === "PROCESSED") return { ok: false, status: 409, message: "PROCESSED documents cannot be deleted" };

    const updated = await documentRepository.replaceById(id, (doc) => ({
      ...doc,
      status: "REJECTED",
      reason,
      updatedAt: nowIso()
    }));

    await appendAudit({ action: "DELETE", docId: id, reason });
    await appendAudit({ action: "STATUS_CHANGE", docId: id, from: existing.status, to: "REJECTED", reason });

    return { ok: true, doc: updated };
  }
};
