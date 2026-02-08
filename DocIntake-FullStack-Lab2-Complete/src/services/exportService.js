import { documentRepository } from "../repositories/documentRepository.js";
import { appendAudit, writeExport } from "../utils/fileStore.js";
import { todayKeyLocal, tsForFilename } from "../utils/time.js";

function countBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const k = keyFn(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

export const exportService = {
  async generateDailyExport() {
    const docs = await documentRepository.list();
    const today = todayKeyLocal();

    const todaysDocs = docs.filter((d) => (d.createdAt ?? "").startsWith(today));
    const summary = {
      date: today,
      total: todaysDocs.length,
      byStatus: countBy(todaysDocs, (d) => d.status),
      byDocType: countBy(todaysDocs, (d) => d.docType)
    };

    const filename = `export-${tsForFilename()}.json`;
    const payload = {
      generatedAt: new Date().toISOString(),
      ...summary,
      documents: todaysDocs
    };

    await writeExport(filename, payload);
    await appendAudit({ action: "EXPORT_GENERATED", filename, summary });

    return { file: filename, summary };
  }
};
