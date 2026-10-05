/**
 * Serves the deploy page in deploy/ at http://localhost:5173. Wallet
 * extensions don't connect to pages opened straight from disk (file://).
 *
 * Usage: node scripts/serve-deploy-page.js [port]
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'deploy');
const PORT = Number(process.argv[2] || 5173);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css' };

if (!fs.existsSync(path.join(ROOT, 'contracts.js'))) {
  console.error('deploy/contracts.js is missing. Run `npm run deploy-page` (or scripts/build-deploy-page.js) first.');
  process.exit(1);
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const file = path.normalize(path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname));
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Deploy page: http://localhost:${PORT}`);
});
