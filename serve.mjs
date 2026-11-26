import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/fonts/manrope-latin.woff2', ['fonts/manrope-latin.woff2', 'font/woff2']],
  ['/fonts/noto-sans-bengali.woff2', ['fonts/noto-sans-bengali.woff2', 'font/woff2']],
  ['/theme.js', ['theme.js', 'text/javascript']],
  ['/app.mjs', ['app.mjs', 'text/javascript']],
  ['/analysis-engine.mjs', ['analysis-engine.mjs', 'text/javascript']],
  ['/analysis-motion.mjs', ['analysis-motion.mjs', 'text/javascript']],
  ['/sample-scripts.mjs', ['sample-scripts.mjs', 'text/javascript']],
]);

const port = Number(process.env.PORT ?? 4173);
const server = createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }

  const asset = assets.get(request.url.split('?')[0]);
  if (!asset) {
    response.writeHead(404).end();
    return;
  }

  try {
    const [file, type] = asset;
    const body = await readFile(new URL(file, import.meta.url));
    response.writeHead(200, {
      'Content-Type': type.startsWith('text/') ? `${type}; charset=utf-8` : type,
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch (error) {
    console.error(error.message);
    response.writeHead(500).end();
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`ScriptSignal is running at http://127.0.0.1:${server.address().port}/`);
});
