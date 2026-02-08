import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = 3000;

export const STORAGE_MODE = "async";

export const ROOT_DIR = path.resolve(__dirname, "..");

export const PATHS = {
  PUBLIC_DIR: path.join(ROOT_DIR, "public"),
  DATA_DIR: path.join(ROOT_DIR, "data"),
  DOC_INDEX: path.join(ROOT_DIR, "data", "documents.json"),
  AUDIT_LOG: path.join(ROOT_DIR, "data", "audit.log"),
  BLOB_DIR: path.join(ROOT_DIR, "data", "blobs"),
  EXPORT_DIR: path.join(ROOT_DIR, "data", "exports")
};

export const LIMITS = {
  MAX_BODY_BYTES: 1_000_000,
  MAX_DOC_BYTES: 200_000
};

export const ENUMS = {
  DOC_TYPES: ["ID_PROOF", "ADDRESS_PROOF", "BANK_STATEMENT", "SIGNED_FORM"],
  STATUSES: ["RECEIVED", "VALIDATED", "QUEUED", "PROCESSED", "REJECTED"],
  CONTENT_TYPES: ["text/plain"]
};

export const TRANSITIONS = {
  RECEIVED: ["VALIDATED", "REJECTED"],
  VALIDATED: ["QUEUED", "REJECTED"],
  QUEUED: ["PROCESSED", "REJECTED"],
  PROCESSED: [],
  REJECTED: []
};
