import { ENUMS, LIMITS, TRANSITIONS } from "../config.js";

export function isClientRefValid(clientRef) {
  return typeof clientRef === "string" && /^CLI-\d{4}$/.test(clientRef.trim());
}

export function isNonEmptyString(v, min = 1) {
  return typeof v === "string" && v.trim().length >= min;
}

export function hasFileExtension(filename) {
  return typeof filename === "string" && /\.[A-Za-z0-9]+$/.test(filename.trim());
}

export function isAllowedDocType(docType) {
  return ENUMS.DOC_TYPES.includes(docType);
}

export function isAllowedContentType(contentType) {
  return ENUMS.CONTENT_TYPES.includes(contentType);
}

export function isAllowedStatus(status) {
  return ENUMS.STATUSES.includes(status);
}

export function decodeBase64ToText(base64) {
  if (!isNonEmptyString(base64, 1)) {
    return { ok: false, error: "contentBase64 is required" };
  }
  try {
    const buf = Buffer.from(base64, "base64");
    if (buf.length === 0) return { ok: false, error: "Decoded content is empty" };
    if (buf.length > LIMITS.MAX_DOC_BYTES) return { ok: false, error: "Document content exceeds size limit" };
    const text = buf.toString("utf8");
    return { ok: true, text, sizeBytes: buf.length };
  } catch {
    return { ok: false, error: "contentBase64 is not valid Base64" };
  }
}

function unknownFields(payload, allowed) {
  const keys = Object.keys(payload ?? {});
  return keys.filter((k) => !allowed.includes(k));
}

export function validateCreate(payload) {
  const errors = [];
  const allowed = ["clientRef", "docType", "filename", "contentType", "contentBase64"];
  const unknown = unknownFields(payload, allowed);
  if (unknown.length) errors.push(`Unknown fields: ${unknown.join(", ")}`);

  const { clientRef, docType, filename, contentType, contentBase64 } = payload ?? {};

  if (!isClientRefValid(clientRef)) errors.push("clientRef must match format CLI-####");
  if (!isAllowedDocType(docType)) errors.push(`docType must be one of: ${ENUMS.DOC_TYPES.join(", ")}`);
  if (!isNonEmptyString(filename, 3) || !hasFileExtension(filename)) errors.push("filename must be provided and contain an extension");
  if (!isAllowedContentType(contentType)) errors.push(`contentType must be one of: ${ENUMS.CONTENT_TYPES.join(", ")}`);

  const decoded = decodeBase64ToText(contentBase64);
  if (!decoded.ok) errors.push(decoded.error);

  return { ok: errors.length === 0, errors, decoded };
}

export function validatePut(payload) {
  const errors = [];
  const allowed = ["clientRef", "docType", "filename", "contentType", "contentBase64"];
  const unknown = unknownFields(payload, allowed);
  if (unknown.length) errors.push(`Unknown fields: ${unknown.join(", ")}`);

  const { clientRef, docType, filename, contentType, contentBase64 } = payload ?? {};

  if (clientRef !== undefined && !isClientRefValid(clientRef)) errors.push("clientRef must match format CLI-####");
  if (docType !== undefined && !isAllowedDocType(docType)) errors.push(`docType must be one of: ${ENUMS.DOC_TYPES.join(", ")}`);
  if (filename !== undefined && (!isNonEmptyString(filename, 3) || !hasFileExtension(filename))) errors.push("filename must be provided and contain an extension");
  if (contentType !== undefined && !isAllowedContentType(contentType)) errors.push(`contentType must be one of: ${ENUMS.CONTENT_TYPES.join(", ")}`);

  let decoded = null;
  if (contentBase64 !== undefined) {
    decoded = decodeBase64ToText(contentBase64);
    if (!decoded.ok) errors.push(decoded.error);
  }

  return { ok: errors.length === 0, errors, decoded };
}

export function validateStatusChange(currentStatus, newStatus, reason) {
  const errors = [];
  if (!isAllowedStatus(newStatus)) errors.push(`status must be one of: ${ENUMS.STATUSES.join(", ")}`);
  if (currentStatus === "PROCESSED") errors.push("PROCESSED documents cannot be modified");
  if (newStatus === "REJECTED" && !isNonEmptyString(reason, 3)) errors.push("reason is required when status is REJECTED");

  const allowed = TRANSITIONS[currentStatus] ?? [];
  if (newStatus !== "REJECTED" && !allowed.includes(newStatus)) {
    errors.push(`Invalid status transition from ${currentStatus} to ${newStatus}`);
  }
  if (newStatus === "REJECTED" && !allowed.includes("REJECTED")) {
    errors.push(`Invalid status transition from ${currentStatus} to REJECTED`);
  }

  return { ok: errors.length === 0, errors };
}

export function validateDelete(reason) {
  if (!isNonEmptyString(reason, 3)) {
    return { ok: false, errors: ["reason is required for delete"] };
  }
  return { ok: true, errors: [] };
}
