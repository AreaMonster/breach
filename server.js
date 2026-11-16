#!/usr/bin/env node
// BREACH server: serves the game and a small leaderboard API. No dependencies.
// Usage: node server.js                      (0.0.0.0:8080, scores in ./data/scores.json)
//        PORT=4444 HOST=127.0.0.1 SCORES_FILE=/var/lib/breach/scores.json node server.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const SCORES_FILE = process.env.SCORES_FILE || path.join(ROOT, 'data', 'scores.json');
const TYPES = { '.html':'text/html; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.LICENSE':'text/plain; charset=utf-8' };

const MAPS = ['yard', 'foundry', 'cryo', 'district', 'reactor', 'outpost', 'vault'];
const MODES = ['waves', 'blitz'];
const DIFFS = ['easy', 'normal', 'hard'];
const KEEP = 50;            // scores kept per map+mode
const POST_GAP_MS = 8000;   // one submission per IP per 8 s

// ---------- score storage ----------
let scores = {};
try { const j = JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8')); if (j && typeof j === 'object' && !Array.isArray(j)) scores = j; } catch (e) { /* first run */ }
let saving = false, dirty = false;
function save() {
  if (saving) { dirty = true; return; }
  saving = true;
  const tmp = SCORES_FILE + '.tmp';
  fs.mkdir(path.dirname(SCORES_FILE), { recursive: true }, () => {
    fs.writeFile(tmp, JSON.stringify(scores), err => {
      const done = () => { saving = false; if (dirty) { dirty = false; save(); } };
      if (err) { console.error('could not save scores:', err.message); return done(); }
      fs.rename(tmp, SCORES_FILE, err2 => { if (err2) console.error('could not save scores:', err2.message); done(); });
    });
  });
}
const lastPost = new Map();
setInterval(() => { const t = Date.now(); for (const [ip, at] of lastPost) if (t - at > 60000) lastPost.delete(ip); }, 60000).unref();

function json(res, code, body) {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(s), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(s);
}
const isInt = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

function getScores(url, res) {
  const map = url.searchParams.get('map'), mode = url.searchParams.get('mode');
  if (!MAPS.includes(map) || !MODES.includes(mode)) return json(res, 400, { error: 'bad map or mode' });
  json(res, 200, { scores: (scores[mode + ':' + map] || []).slice(0, 10) });
}
function postScore(req, res) {
  const ip = req.socket.remoteAddress || '?', now = Date.now();
  if (now - (lastPost.get(ip) || 0) < POST_GAP_MS) return json(res, 429, { error: 'slow down' });
  if (!/^application\/json/i.test(req.headers['content-type'] || '')) return json(res, 415, { error: 'json only' });
  let body = '', over = false;
  req.on('data', c => { body += c; if (body.length > 1024) { over = true; req.destroy(); } });
  req.on('end', () => {
    if (over) return;
    let d; try { d = JSON.parse(body); } catch (e) { return json(res, 400, { error: 'bad json' }); }
    if (!d || typeof d !== 'object') return json(res, 400, { error: 'bad body' });
    const name = String(d.name == null ? '' : d.name).replace(/[^A-Za-z0-9 _-]/g, '').trim().slice(0, 12).toUpperCase() || 'ANON';
    if (!MAPS.includes(d.map) || !MODES.includes(d.mode) || !DIFFS.includes(d.diff)) return json(res, 400, { error: 'bad map, mode or diff' });
    if (!isInt(d.wave, 1, 300) || !isInt(d.score, 1, 20000000)) return json(res, 400, { error: 'bad score' });
    // loose plausibility cap; scores come from the browser, so this only stops the laziest fakes
    if (d.score > (d.mode === 'blitz' ? 600000 : d.wave * 90000)) return json(res, 400, { error: 'implausible score' });
    lastPost.set(ip, now);
    const key = d.mode + ':' + d.map, list = scores[key] || (scores[key] = []);
    list.push({ name, score: d.score, wave: d.wave, diff: d.diff, at: new Date(now).toISOString().slice(0, 10) });
    list.sort((a, b) => b.score - a.score); list.length = Math.min(list.length, KEEP);
    save();
    json(res, 200, { ok: true, rank: list.findIndex(r => r.score === d.score && r.name === name) + 1 });
  });
}

// ---------- static files: only the game itself ----------
function serveStatic(rel, req, res) {
  if (rel === '/') rel = '/index.html';
  if (rel !== '/index.html' && !/^\/vendor\/[A-Za-z0-9._-]+$/.test(rel)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
  const file = path.join(ROOT, rel);
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': rel === '/index.html' ? 'no-cache' : 'public, max-age=86400', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}

http.createServer((req, res) => {
  let url; try { url = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400); return res.end(); }
  if (url.pathname === '/api/scores') {
    if (req.method === 'GET') return getScores(url, res);
    if (req.method === 'POST') return postScore(req, res);
    res.writeHead(405); return res.end();
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  serveStatic(url.pathname, req, res);
}).listen(PORT, HOST, () => console.log(`BREACH running at http://${HOST}:${PORT}/  (scores: ${SCORES_FILE})`));
