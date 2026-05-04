const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = process.env.FRONTEND_PORT || process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL || "";
const API_PROXY_URL =
  process.env.API_PROXY_URL || process.env.BACKEND_URL || "http://localhost:3001";
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendConfig(res) {
  res.writeHead(200, {
    "Content-Type": "application/javascript; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(`window.API_BASE_URL = ${JSON.stringify(API_BASE_URL)};`);
}

function redirectToIndex(res) {
  res.writeHead(302, {
    Location: "/",
    "Cache-Control": "no-store"
  });
  res.end();
}

async function proxyApiRequest(req, res, requestUrl) {
  const targetUrl = new URL(`${requestUrl.pathname}${requestUrl.search}`, API_PROXY_URL);

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        Accept: req.headers.accept || "application/json",
        "User-Agent": "sp500-stock-dashboard-frontend/1.0"
      }
    });
    const body = Buffer.from(await response.arrayBuffer());
    const headers = {
      "Content-Type":
        response.headers.get("content-type") || "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    };

    res.writeHead(response.status, headers);
    res.end(body);
  } catch (error) {
    sendJson(res, 502, { error: "Could not reach backend API" });
  }
}

function sendStaticFile(res, requestPath) {
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(
    PUBLIC_DIR,
    safePath === "/" ? "index.html" : safePath
  );
  const resolvedPath = path.resolve(filePath);

  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(resolvedPath, (error, content) => {
    if (error) {
      fs.readFile(path.join(PUBLIC_DIR, "index.html"), (fallbackError, html) => {
        if (fallbackError) {
          sendJson(res, 404, { error: "Not found" });
          return;
        }

        res.writeHead(200, { "Content-Type": MIME_TYPES[".html"] });
        res.end(html);
      });
      return;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream"
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const startedAt = Date.now();
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  res.on("finish", () => {
    console.log(
      `[frontend] ${req.method} ${requestUrl.pathname}${requestUrl.search} -> ${res.statusCode} (${Date.now() - startedAt}ms)`
    );
  });

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (requestUrl.pathname.startsWith("/api/")) {
    proxyApiRequest(req, res, requestUrl);
    return;
  }

  if (requestUrl.pathname === "/config.js") {
    sendConfig(res);
    return;
  }

  if (
    requestUrl.pathname === "/dashboard" ||
    requestUrl.pathname === "/dashboard.html"
  ) {
    redirectToIndex(res);
    return;
  }

  sendStaticFile(res, requestUrl.pathname);
});

server.listen(PORT, () => {
  console.log(`Frontend running at http://localhost:${PORT}`);
  console.log(`Browser API base URL: ${API_BASE_URL || "same origin"}`);
  console.log(`Proxying API requests to ${API_PROXY_URL}`);
});
