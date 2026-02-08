export const processingService = {
  validateContent({ text, filename, contentType }) {
    const trimmed = (text ?? "").trim();

    if (trimmed.length === 0) {
      return { ok: false, reason: "Empty document content" };
    }

    if (contentType === "text/plain") {
      const ext = (filename ?? "").toLowerCase().split(".").pop();
      if (ext !== "txt") {
        return { ok: false, reason: "filename extension does not match contentType" };
      }
    }

    return { ok: true };
  }
};
