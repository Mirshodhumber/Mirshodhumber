import http from "http";
import { PORT } from "./config.js";
import { router } from "./router.js";
import { withRequestLogger } from "./middleware/requestLogger.js";
import { sendError } from "./utils/response.js";

const handler = withRequestLogger(async (req, res) => {
  try {
    await router(req, res);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendError(res, 500, "Internal server error");
  }
});

const server = http.createServer(handler);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
