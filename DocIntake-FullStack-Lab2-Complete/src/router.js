import { serveStatic } from "./controllers/uiController.js";
import { handleApi } from "./controllers/documentController.js";
import { sendError } from "./utils/response.js";

export async function router(req, res) {
  const pathname = new URL(req.url, "http://localhost").pathname;

  if (pathname.startsWith("/api/") || pathname.startsWith("/demo/")) {
    return await handleApi(req, res);
  }

  if (req.method === "GET") {
    return await serveStatic(req, res);
  }

  return sendError(res, 405, "Method not allowed");
}
