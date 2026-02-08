import fs from "fs";
import path from "path";
import { PATHS } from "../config.js";
import { sendError } from "../utils/response.js";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

const PUBLIC_ROOT = path.resolve(PATHS.PUBLIC_DIR);

export async function serveStatic(req, res) {
  const urlPath = new URL(req.url, "http://localhost").pathname;

  const relPath = (urlPath === "/" ? "index.html" : urlPath.replace(/^\/+/, ""))
    .replaceAll("..", "");

  const filePath = path.resolve(PUBLIC_ROOT, relPath);

  if (!filePath.startsWith(PUBLIC_ROOT)) {
    return sendError(res, 403, "Forbidden");
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return sendError(res, 404, "Not found");
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] ?? "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": mime,
    "Cache-Control": "no-store"
  });

  fs.createReadStream(filePath).pipe(res);
}
