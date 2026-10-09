// Dependency-free static server: serves public/ and data/ (as /data/*).
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json" };
const port = process.env.PORT || 3000;

http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, "http://x").pathname); }
  catch { res.writeHead(400).end("Bad request"); return; }
  const isData = url.startsWith("/data/");
  const dir = path.join(root, isData ? "data" : "public");
  const file = path.normalize(path.join(dir, isData ? url.slice(6) : url === "/" ? "index.html" : url));
  if (!file.startsWith(dir + path.sep)) { res.writeHead(403).end("Forbidden"); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }).end(buf);
  });
}).listen(port, () => console.log(`Timesheets app running at http://localhost:${port}`));
