const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
};

// Route to file mapping for the three interfaces + root
const routeFiles = {
  "/": "index.html",
  "/markets": "markets/market.html",
  "/oracle": "oracle/oracle.html",
  "/infrastructure": "infra/infrastructure.html",
};

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const fileName = routeFiles[pathname] ? routeFiles[pathname] : pathname;
  const filePath = path.join(root, fileName);
  if (!filePath.startsWith(root)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": mime[path.extname(filePath)] || "application/octet-stream" });
    response.end(data);
  });
});

server.listen(4173, "127.0.0.1", () => console.log("AustralFinance preview on http://127.0.0.1:4173"));