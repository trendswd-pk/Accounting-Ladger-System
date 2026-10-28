import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

import { log, themePath } from './util.js';

const ROOT = themePath('Nova-IMP-Docs');

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

function resolveRequest(url) {
  const decoded = decodeURIComponent(url.split('?')[0]);
  const target = path.join(ROOT, path.normalize(decoded));

  // Keep the server inside the docs folder even if the path tries to climb out.
  if (!target.startsWith(ROOT)) return null;

  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    return path.join(target, 'index.html');
  }
  return target;
}

export function serveDocs({ port = 4000 } = {}) {
  const server = http.createServer((request, response) => {
    const file = resolveRequest(request.url);

    if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-cache'
    });
    fs.createReadStream(file).pipe(response);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      log.error(`Port ${port} already in use — try: node src/cli.js serve --port=${port + 1}`);
      process.exit(1);
    }
    throw error;
  });

  server.listen(port, () => {
    log.step('Docs server');
    log.ok(`http://localhost:${port}`);
    log.info('Ctrl+C to stop');
  });

  return server;
}
