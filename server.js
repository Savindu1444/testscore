// Cricket Live Server — serves the scorer app and one separate overlay URL per graphic
// for OBS Browser Source / vMix Web Browser input. No dependencies: needs Node 18+.
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';       // set HOST=127.0.0.1 to allow this computer only
const INDEX = path.join(__dirname, 'public', 'index.html');
const MAX_BODY = 5 * 1024 * 1024;

let last = null;                // latest match state pushed by the scoring page
const clients = new Set();      // connected overlay pages (Server-Sent Events)

function json(res, obj, code = 200) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  // Bodies over MAX_BODY are discarded (not stored) and answered with 413 once fully received.
  return new Promise((resolve, reject) => {
    let size = 0, over = false; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > 64 * MAX_BODY) { req.destroy(); return; }   // hard stop for absurd uploads
      if (size > MAX_BODY) { over = true; chunks.length = 0; return; }
      if (!over) chunks.push(c);
    });
    req.on('end', () => over ? reject(Object.assign(new Error('too large'), { code: 413 })) : resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function broadcast(data) {
  const line = `event: state\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) { try { c.write(line); } catch (e) { clients.delete(c); } }
}
const isPage = p => p === '/' || p === '/control' || p === '/index.html' || /^\/overlay\/[a-z]+\/?$/.test(p) || /^\/live(\/[A-Za-z0-9_-]+)?\/?$/.test(p);   // app, overlays, public live pages

const server = http.createServer(async (req, res) => {
  let u; try { u = new URL(req.url, 'http://localhost'); } catch (e) { res.writeHead(400); return res.end(); }
  const p = u.pathname;

  if (p === '/api/health') return json(res, { cricket: true, overlays: clients.size, hasMatch: !!last });

  if (p === '/api/stream') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 1000\n\n');
    clients.add(res);
    if (last) res.write(`event: state\ndata: ${JSON.stringify(last)}\n\n`);
    const ka = setInterval(() => { try { res.write(': keepalive\n\n'); } catch (e) { clearInterval(ka); } }, 15000);
    req.on('close', () => { clearInterval(ka); clients.delete(res); });
    return;
  }

  if (p === '/api/state' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const msg = JSON.parse(body);
      if (!msg || typeof msg !== 'object' || Array.isArray(msg)) throw new Error('bad');
      last = msg; broadcast(msg);
      return json(res, { ok: true, overlays: clients.size });
    } catch (e) { return json(res, { error: e.code === 413 ? 'Payload too large' : 'Invalid JSON' }, e.code === 413 ? 413 : 400); }
  }

  // Live values for vMix Data Sources / other tools (JSON)
  if (p === '/api/fields.json') return json(res, (last && last.fields) || {});

  if (isPage(p) && (req.method === 'GET' || req.method === 'HEAD')) {
    fs.readFile(INDEX, (err, buf) => {
      if (err) { res.writeHead(500); return res.end('public/index.html is missing'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : buf);
    });
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found');
});

server.listen(PORT, HOST, () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  console.log('\nCricket Live Server is running\n');
  console.log('  Scoring page (open on the scoring device):');
  console.log('    http://localhost:' + PORT + '/');
  ips.forEach(ip => console.log('    http://' + ip + ':' + PORT + '/   (other devices on this network)'));
  console.log('\n  In OBS / vMix use the overlay links shown in the Broadcast tab, for example:');
  console.log('    http://' + (ips[0] || 'localhost') + ':' + PORT + '/overlay/scoreboard');
  console.log('    http://' + (ips[0] || 'localhost') + ':' + PORT + '/overlay/batcard?inn=1\n');
  if (HOST === '0.0.0.0') console.log('  Note: anyone on your network can reach this server. Use it on a trusted network, or start with HOST=127.0.0.1 for this computer only.\n');
});
