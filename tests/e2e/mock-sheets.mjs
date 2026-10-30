// Stand-in for the Apps Script web app during e2e: records every POST to /exec.
import { createServer } from 'node:http';

const records = [];
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' };

createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS); return res.end(); }
  if (req.url === '/records' && req.method === 'GET') { res.writeHead(200, { ...CORS, 'content-type': 'application/json' }); return res.end(JSON.stringify(records)); }
  if (req.url === '/records' && req.method === 'DELETE') { records.length = 0; res.writeHead(204, CORS); return res.end(); }
  if (req.url === '/exec' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      records.push(JSON.parse(body));
      res.writeHead(200, { ...CORS, 'content-type': 'application/json' });
      res.end('{"ok":true}');
    });
    return;
  }
  res.writeHead(404, CORS); res.end();
}).listen(8790, () => console.log('mock sheets on :8790'));
