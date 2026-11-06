import { createServer } from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';

const scrypt = promisify(scryptCallback);
const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, 'data');
const dbFile = path.join(dataDir, 'app.json');
const sessions = new Map();
const PORT = Number(process.env.PORT || 4173);

const emptyDb = () => ({ users: [], blocks: [], reports: [] });
async function readDb() {
  try { return JSON.parse(await fs.readFile(dbFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    await fs.mkdir(dataDir, { recursive: true });
    const initial = emptyDb();
    await fs.writeFile(dbFile, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }
}
async function writeDb(db) {
  await fs.mkdir(dataDir, { recursive: true });
  const temporary = `${dbFile}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(db, null, 2), 'utf8');
  await fs.rename(temporary, dbFile);
}
function reply(res, status, value, headers = {}) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
  res.end(JSON.stringify(value));
}
async function body(req) {
  let raw = '';
  for await (const part of req) {
    raw += part;
    if (raw.length > 100_000) throw new Error('İstek çok büyük.');
  }
  return raw ? JSON.parse(raw) : {};
}
function sessionId(req) {
  const cookie = req.headers.cookie || '';
  return cookie.split(';').map(x => x.trim()).find(x => x.startsWith('sid='))?.slice(4);
}
async function currentUser(req) {
  const id = sessions.get(sessionId(req));
  if (!id) return null;
  const db = await readDb();
  return db.users.find(user => user.id === id) || null;
}
function publicUser(user) {
  return { id: user.id, username: user.username, displayName: user.displayName, score: user.score || 0, preferences: user.preferences || {} };
}
function setSession(res, userId) {
  const sid = randomBytes(32).toString('hex');
  sessions.set(sid, userId);
  res.setHeader('set-cookie', `sid=${sid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    if (req.method === 'GET' && url.pathname === '/api/me') {
      const user = await currentUser(req);
      return reply(res, 200, { user: user ? publicUser(user) : null });
    }
    if (req.method === 'POST' && url.pathname === '/api/register') {
      const input = await body(req);
      const username = String(input.username || '').trim().toLowerCase();
      const displayName = String(input.displayName || '').trim();
      const password = String(input.password || '');
      if (!/^[a-z0-9_]{3,24}$/.test(username)) return reply(res, 400, { error: 'Kullanıcı adı 3-24 karakter olmalı; harf, sayı ve alt çizgi kullanılabilir.' });
      if (displayName.length < 2 || displayName.length > 32) return reply(res, 400, { error: 'Görünen ad 2-32 karakter olmalı.' });
      if (password.length < 10 || password.length > 128) return reply(res, 400, { error: 'Parola 10-128 karakter arasında olmalı.' });
      const db = await readDb();
      if (db.users.some(user => user.username === username)) return reply(res, 409, { error: 'Bu kullanıcı adı kullanılıyor.' });
      const salt = randomBytes(16).toString('hex');
      const passwordHash = (await scrypt(password, salt, 64)).toString('hex');
      const user = { id: randomUUID(), username, displayName, salt, passwordHash, score: 0, preferences: { theme: 'system', palette: 'cream', language: 'tr' }, createdAt: new Date().toISOString() };
      db.users.push(user);
      await writeDb(db);
      setSession(res, user.id);
      return reply(res, 201, { user: publicUser(user) });
    }
    if (req.method === 'POST' && url.pathname === '/api/login') {
      const input = await body(req);
      const username = String(input.username || '').trim().toLowerCase();
      const db = await readDb();
      const user = db.users.find(row => row.username === username);
      if (!user) return reply(res, 401, { error: 'Kullanıcı adı veya parola hatalı.' });
      const candidate = Buffer.from(await scrypt(String(input.password || ''), user.salt, 64));
      const expected = Buffer.from(user.passwordHash, 'hex');
      if (candidate.length !== expected.length || !timingSafeEqual(candidate, expected)) return reply(res, 401, { error: 'Kullanıcı adı veya parola hatalı.' });
      setSession(res, user.id);
      return reply(res, 200, { user: publicUser(user) });
    }
    if (req.method === 'POST' && url.pathname === '/api/logout') {
      sessions.delete(sessionId(req));
      res.setHeader('set-cookie', 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
      return reply(res, 200, { ok: true });
    }
    if (req.method === 'DELETE' && url.pathname === '/api/account') {
      const user = await currentUser(req);
      if (!user) return reply(res, 401, { error: 'Hesabı silmek için önce giriş yap.' });
      const db = await readDb();
      db.users = db.users.filter(row => row.id !== user.id);
      db.blocks = db.blocks.filter(row => row.ownerId !== user.id);
      db.reports = db.reports.filter(row => row.userId !== user.id);
      await writeDb(db);
      for (const [sid, id] of sessions) if (id === user.id) sessions.delete(sid);
      res.setHeader('set-cookie', 'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
      return reply(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/score') {
      const user = await currentUser(req);
      if (!user) return reply(res, 401, { error: 'Puan kaydetmek için giriş yap.' });
      const input = await body(req);
      const points = Number(input.points);
      if (!Number.isInteger(points) || points < 0 || points > 5) return reply(res, 400, { error: 'Puan değeri geçersiz.' });
      const db = await readDb();
      const row = db.users.find(item => item.id === user.id);
      row.score = (row.score || 0) + points;
      await writeDb(db);
      return reply(res, 200, { score: row.score });
    }
    if (req.method === 'GET' && url.pathname === '/api/leaderboard') {
      const db = await readDb();
      const rows = db.users.map(user => ({ username: user.username, displayName: user.displayName, score: user.score || 0 }))
        .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName, 'tr')).slice(0, 100);
      return reply(res, 200, { rows });
    }
    if (req.method === 'GET' && url.pathname === '/api/blocks') {
      const user = await currentUser(req);
      if (!user) return reply(res, 401, { error: 'Engellenenler listesini görmek için giriş yap.' });
      const db = await readDb();
      return reply(res, 200, { rows: db.blocks.filter(row => row.ownerId === user.id) });
    }
    if (req.method === 'POST' && url.pathname === '/api/blocks') {
      const user = await currentUser(req);
      if (!user) return reply(res, 401, { error: 'Bu işlem için giriş yap.' });
      const input = await body(req);
      const label = String(input.label || '').trim().slice(0, 48);
      if (label.length < 2) return reply(res, 400, { error: 'En az iki karakter gir.' });
      const db = await readDb();
      const row = { id: randomUUID(), ownerId: user.id, label, createdAt: new Date().toISOString() };
      db.blocks.push(row);
      await writeDb(db);
      return reply(res, 201, { row });
    }
    if (req.method === 'DELETE' && url.pathname.startsWith('/api/blocks/')) {
      const user = await currentUser(req);
      if (!user) return reply(res, 401, { error: 'Bu işlem için giriş yap.' });
      const id = url.pathname.split('/').at(-1);
      const db = await readDb();
      db.blocks = db.blocks.filter(row => !(row.id === id && row.ownerId === user.id));
      await writeDb(db);
      return reply(res, 200, { ok: true });
    }
    if (req.method === 'POST' && url.pathname === '/api/support') {
      const input = await body(req);
      const message = String(input.message || '').trim();
      const category = String(input.category || 'Diğer').slice(0, 32);
      if (message.length < 10 || message.length > 3000) return reply(res, 400, { error: 'Mesaj 10-3000 karakter arasında olmalı.' });
      const user = await currentUser(req);
      const db = await readDb();
      db.reports.push({ id: randomUUID(), userId: user?.id || null, category, message, createdAt: new Date().toISOString(), status: 'new' });
      await writeDb(db);
      return reply(res, 201, { ok: true });
    }
    if (req.method === 'PATCH' && url.pathname === '/api/preferences') {
      const user = await currentUser(req);
      if (!user) return reply(res, 401, { error: 'Tercihleri hesabına kaydetmek için giriş yap.' });
      const input = await body(req);
      const allowed = { theme: ['system', 'light', 'dark'], palette: ['cream', 'ocean', 'lavender', 'forest'], language: ['tr', 'en'] };
      user.preferences ||= {};
      for (const [key, values] of Object.entries(allowed)) if (values.includes(input[key])) user.preferences[key] = input[key];
      const db = await readDb();
      const index = db.users.findIndex(row => row.id === user.id);
      db.users[index] = user;
      await writeDb(db);
      return reply(res, 200, { preferences: user.preferences });
    }
    if (req.method === 'GET' && url.pathname === '/') {
      const html = await fs.readFile(path.join(root, 'index.html'));
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(html);
    }
    if (req.method === 'GET' && url.pathname === '/health') return reply(res, 200, { ok: true, mode: 'local-development' });
    return reply(res, 404, { error: 'Bulunamadı.' });
  } catch (error) {
    console.error(error);
    return reply(res, 400, { error: error.message || 'İstek işlenemedi.' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Yol Arkadaşım yerel geliştirme sunucusu: http://127.0.0.1:${PORT}`);
  console.log(`Veriler bu klasörde saklanır: ${dbFile}`);
});
