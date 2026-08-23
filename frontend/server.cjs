const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const root = __dirname;
const indexPath = path.join(root, "index.html");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function getFilePath(pathname) {
  if (pathname === "/" || !path.extname(pathname)) return indexPath;

  const relativePath = pathname.replace(/^\/+/, "");
  const candidate = path.resolve(root, relativePath);
  const rootPrefix = `${root}${path.sep}`;
  if (candidate !== root && !candidate.startsWith(rootPrefix)) return null;
  return candidate;
}

const server = http.createServer((request, response) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Bad request");
    return;
  }

  const filePath = getFilePath(pathname);
  if (!filePath) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    response.writeHead(200, {
      "Content-Type": mime[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(data);
  });
});

server.listen(4173, "127.0.0.1", () => {
  console.log("AustralFinance preview on http://127.0.0.1:4173");
});
