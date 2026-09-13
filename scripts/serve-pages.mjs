import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';

const base = '/ielts-wordflow';
const distRoot = resolve(process.cwd(), 'dist');
const argumentsByName = new Map(
  process.argv.slice(2).reduce((entries, value, index, values) => {
    if (value.startsWith('--') && values[index + 1] !== undefined) {
      entries.push([value.slice(2), values[index + 1]]);
    }
    return entries;
  }, []),
);
const host = argumentsByName.get('host') ?? '127.0.0.1';
const port = Number(argumentsByName.get('port') ?? '4173');
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webmanifest', 'application/manifest+json; charset=utf-8'],
]);

function builtFile(pathname) {
  if (pathname === base || pathname === `${base}/`) {
    return resolve(distRoot, 'index.html');
  }
  if (!pathname.startsWith(`${base}/`)) {
    return undefined;
  }

  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname.slice(base.length + 1));
  } catch {
    return undefined;
  }

  const candidate = resolve(distRoot, relativePath);
  if (!candidate.startsWith(`${distRoot}${sep}`)) {
    return undefined;
  }
  if (!existsSync(candidate) || !statSync(candidate).isFile()) {
    return undefined;
  }
  return candidate;
}

function sendFile(response, path, status) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': contentTypes.get(extname(path)) ?? 'application/octet-stream',
  });
  createReadStream(path).pipe(response);
}

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? '/', `http://${host}:${port}`).pathname;
  const path = builtFile(pathname);

  if (path === undefined) {
    sendFile(response, resolve(distRoot, '404.html'), 404);
    return;
  }
  sendFile(response, path, 200);
});

server.listen(port, host, () => {
  console.log(`Pages-like server listening at http://${host}:${port}${base}/`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
