import http from 'node:http';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'rooms.json');
const PORT = Number(process.env.PORT || 8787);

/** @type {Map<string, any>} */
const rooms = new Map();

/* ---------- сохранение ---------- */

let saveTimer = null;
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const payload = [...rooms.values()].map((room) => ({ ...room, players: [] }));
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (error) {
      console.warn('[rooms] не удалось сохранить состояние:', error.message);
    }
  }, 600);
}

function loadRooms() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const list = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!Array.isArray(list)) return;
    for (const room of list) {
      if (!room?.code) continue;
      rooms.set(room.code, { ...room, players: [] });
    }
    console.log(`[rooms] загружено комнат: ${rooms.size}`);
  } catch (error) {
    console.warn('[rooms] не удалось прочитать rooms.json:', error.message);
  }
}

/* ---------- модель комнаты ---------- */

function makeCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 5 }, () => alphabet[crypto.randomInt(alphabet.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function newRoom(name, gmName) {
  const room = {
    code: makeCode(),
    name: name?.toString().slice(0, 60) || 'Новая комната',
    gmKey: crypto.randomBytes(12).toString('hex'),
    createdAt: Date.now(),
    map: {
      image: null,
      width: 1600,
      height: 1000,
      gridSize: 64,
      showGrid: true,
      title: '',
    },
    integration: { vortexUrl: '' },
    tokens: [],
    initiative: { order: [], turn: 0, round: 1, active: false },
    chat: [
      {
        id: crypto.randomUUID(),
        type: 'system',
        who: 'Система',
        text: `Комната создана. Мастер: ${gmName || 'без имени'}.`,
        at: Date.now(),
      },
    ],
    handouts: [],
    players: [],
  };
  rooms.set(room.code, room);
  scheduleSave();
  return room;
}

function publicRoom(room) {
  return {
    code: room.code,
    name: room.name,
    map: room.map,
    tokens: room.tokens,
    initiative: room.initiative,
    chat: room.chat.slice(-120),
    handouts: room.handouts,
    integration: room.integration ?? { vortexUrl: '' },
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      role: p.role,
      characterName: p.characterName || null,
      character: p.character || null,
      online: true,
    })),
  };
}

function systemMessage(room, text) {
  room.chat.push({ id: crypto.randomUUID(), type: 'system', who: 'Система', text, at: Date.now() });
  if (room.chat.length > 300) room.chat.splice(0, room.chat.length - 300);
}

/* ---------- HTTP ---------- */

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error('too large'));
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('invalid json'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

function serveStatic(req, res, pathname) {
  if (!fs.existsSync(DIST)) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(
      '<!doctype html><meta charset="utf-8"><title>DnD Companion</title><body style="background:#333d29;color:#c2c5aa;font-family:sans-serif;padding:40px"><h1>Сервер работает</h1><p>Сборка не найдена. Запустите <code>npm run dev</code> для разработки или <code>npm run build</code>, затем перезапустите сервер.</p></body>',
    );
    return;
  }
  const safePath = pathname === '/' ? '/index.html' : pathname;
  let filePath = path.join(DIST, path.normalize(safePath).replace(/^([/\\])+/, ''));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname === '/api/health') {
      json(res, 200, { ok: true, rooms: rooms.size });
      return;
    }
    if (url.pathname === '/api/network') {
      const entries = [];
      for (const [iface, list] of Object.entries(os.networkInterfaces())) {
        for (const item of list ?? []) {
          if (item && item.family === 'IPv4' && !item.internal && !item.address.startsWith('169.254.')) {
            entries.push({ address: item.address, iface });
          }
        }
      }
      const rank = (entry) =>
        /radmin/i.test(entry.iface)
          ? -1
          : entry.address.startsWith('192.168.')
            ? 0
            : entry.address.startsWith('10.')
              ? 1
              : /^172\.(1[6-9]|2\d|3[01])\./.test(entry.address)
                ? 2
                : 3;
      const seen = new Set();
      const unique = entries
        .sort((a, b) => rank(a) - rank(b))
        .filter((entry) => {
          if (seen.has(entry.address)) return false;
          seen.add(entry.address);
          return true;
        });
      const reachable = await Promise.all(
        unique.map(async (entry) => {
          try {
            const probe = await fetch(`http://${entry.address}:${PORT}/api/health`, {
              signal: AbortSignal.timeout(1200),
            });
            return probe.ok ? entry : null;
          } catch {
            return null;
          }
        }),
      );
      const working = reachable.filter(Boolean);
      json(res, 200, { addresses: working.length ? working : unique, port: PORT });
      return;
    }
    if (url.pathname === '/api/rooms' && req.method === 'POST') {
      const body = await readBody(req);
      const room = newRoom(body.name, body.gmName);
      json(res, 201, { code: room.code, key: room.gmKey, name: room.name });
      return;
    }
    const match = url.pathname.match(/^\/api\/rooms\/([A-Z0-9]{4,8})$/i);
    if (match && req.method === 'GET') {      const room = rooms.get(match[1].toUpperCase());
      if (!room) {
        json(res, 404, { exists: false });
        return;
      }
      json(res, 200, { exists: true, name: room.name, players: room.players.length });
      return;
    }
    if (url.pathname === '/api/import/lss' && req.method === 'GET') {
      const target = url.searchParams.get('url') || '';
      let parsedUrl;
      try {
        parsedUrl = new URL(target);
      } catch {
        json(res, 400, { error: 'Нужна корректная ссылка на персонажа Long Story Short' });
        return;
      }
      const allowedHost = ['longstoryshort.app', 'www.longstoryshort.app'].includes(parsedUrl.hostname);
      const allowedPath = /^\/characters\/[a-z0-9-]+\/?$/i.test(parsedUrl.pathname);
      if (parsedUrl.protocol !== 'https:' || !allowedHost || !allowedPath) {
        json(res, 400, { error: 'Поддерживаются только ссылки вида https://longstoryshort.app/characters/<id>/' });
        return;
      }
      const pagePath = parsedUrl.pathname.replace(/\/$/, '');
      const slug = pagePath.replace(/^\/characters\//, '');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await fetch(`https://longstoryshort.app/page-data/characters/${slug}/page-data.json`, {
          headers: { 'User-Agent': 'DnD-Companion/1.0', Accept: 'application/json' },
          signal: controller.signal,
        });
        if (!response.ok) {
          json(res, 502, { error: `Long Story Short ответил ${response.status}` });
          return;
        }
        const data = await response.json();
        const page = data?.result?.pageContext;
        const gender = url.searchParams.get('gender') === 'female' ? 'female' : 'male';
        const rawValue = page?.raw?.[gender] ?? page?.raw?.male ?? page?.raw?.female;
        if (!rawValue) {
          json(res, 404, { error: 'В ответе LSS нет данных персонажа' });
          return;
        }
        const raw = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue;
        json(res, 200, {
          raw,
          label: page?.character?.[gender] ?? page?.character?.male ?? page?.character?.female ?? null,
          sourceUrl: `https://longstoryshort.app${pagePath}/`,
        });
      } catch (error) {
        json(res, 502, { error: `Не удалось получить персонажа: ${error.message}` });
      } finally {
        clearTimeout(timer);
      }
      return;
    }
    if (url.pathname.startsWith('/api/')) {
      json(res, 404, { error: 'not found' });
      return;
    }
    serveStatic(req, res, url.pathname);
  } catch (error) {
    json(res, 400, { error: error.message });
  }
});

/* ---------- WebSocket ---------- */

const wss = new WebSocketServer({ noServer: true });
/** @type {Map<any, { code: string, playerId: string }>} */
const sockets = new Map();

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (url.pathname !== '/ws') {
    socket.destroy();
    return;
  }
  const code = (url.searchParams.get('code') || '').toUpperCase();
  const room = rooms.get(code);
  if (!room) {
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, { code, url });
  });
});

function broadcast(room) {
  const payload = JSON.stringify({ t: 'state', room: publicRoom(room) });
  for (const [ws, meta] of sockets) {
    if (meta.code === room.code && ws.readyState === ws.OPEN) ws.send(payload);
  }
}

function touch(room) {
  scheduleSave();
  broadcast(room);
}

wss.on('connection', (ws, req, info) => {
  const { url } = info;
  const code = info.code;
  const room = rooms.get(code);
  if (!room) {
    ws.close(4004, 'room not found');
    return;
  }
  const key = url.searchParams.get('key') || '';
  const role = key && key === room.gmKey ? 'gm' : 'player';
  const name = (url.searchParams.get('name') || 'Игрок').toString().slice(0, 40);
  const playerId = crypto.randomUUID();

  const player = { id: playerId, name, role, character: null, characterName: null };
  room.players.push(player);
  sockets.set(ws, { code, playerId });
  systemMessage(room, `${name} присоединился${role === 'gm' ? ' как Мастер' : ''}.`);

  ws.send(JSON.stringify({ t: 'welcome', role, you: { id: playerId, name, role }, room: publicRoom(room) }));
  touch(room);

  const deny = (reason) => {
    ws.send(JSON.stringify({ t: 'error', message: reason }));
  };

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (!msg || typeof msg.t !== 'string') return;
    const me = room.players.find((p) => p.id === playerId);
    if (!me) return;
    const isGm = me.role === 'gm';

    switch (msg.t) {
      case 'chat': {
        const text = String(msg.text || '').slice(0, 2000).trim();
        if (!text) return;
        room.chat.push({ id: crypto.randomUUID(), type: 'msg', who: me.name, text, at: Date.now() });
        break;
      }
      case 'roll': {
        const label = String(msg.label || 'Бросок').slice(0, 120);
        const detail = String(msg.detail || '').slice(0, 200);
        const total = Number(msg.total) || 0;
        const tone = msg.crit ? 'crit' : msg.critFail ? 'fail' : 'normal';
        room.chat.push({
          id: crypto.randomUUID(),
          type: 'roll',
          who: me.name,
          text: label,
          detail,
          total,
          tone,
          at: Date.now(),
        });
        break;
      }
      case 'token:move': {
        const token = room.tokens.find((t) => t.id === msg.id);
        if (!token) return;
        if (!isGm && token.ownerId !== playerId) return deny('Можно двигать только своего персонажа');
        token.x = clamp(Number(msg.x), 0, room.map.width);
        token.y = clamp(Number(msg.y), 0, room.map.height);
        break;
      }
      case 'token:add': {
        if (!isGm) {
          if (me.tokenCreated) return deny('У вас уже есть токен в этой комнате');
          const token = {
            id: crypto.randomUUID(),
            name: me.name,
            x: clamp(Number(msg.x), 0, room.map.width),
            y: clamp(Number(msg.y), 0, room.map.height),
            size: 1,
            color: 'pc',
            image: typeof me.character?.image === 'string' ? me.character.image : null,
            hp: { current: Math.max(1, Number(me.character?.hp) || 10), max: Math.max(1, Number(me.character?.hpMax) || 10) },
            ownerId: playerId,
            kind: 'pc',
          };
          room.tokens.push(token);
          me.tokenCreated = true;
          break;
        }
        const token = {
          id: crypto.randomUUID(),
          name: String(msg.name || 'Токен').slice(0, 40),
          x: clamp(Number(msg.x), 0, room.map.width),
          y: clamp(Number(msg.y), 0, room.map.height),
          size: Math.max(1, Math.min(4, Number(msg.size) || 1)),
          color: msg.color === 'enemy' ? 'enemy' : 'pc',
          image: typeof msg.image === 'string' && msg.image.length < 400000 ? msg.image : null,
          hp: { current: Number(msg.hp?.current) || 10, max: Number(msg.hp?.max) || 10 },
          ownerId: msg.ownerId || null,
          kind: msg.color === 'enemy' ? 'npc' : 'pc',
        };
        room.tokens.push(token);
        break;
      }
      case 'token:update': {
        if (!isGm) return deny('Менять токены может Мастер');
        const token = room.tokens.find((t) => t.id === msg.id);
        if (!token) return;
        if (msg.patch?.hp) {
          token.hp.current = clamp(Number(msg.patch.hp.current), 0, 9999);
          if (msg.patch.hp.max) token.hp.max = clamp(Number(msg.patch.hp.max), 1, 9999);
        }
        if (typeof msg.patch?.name === 'string') token.name = msg.patch.name.slice(0, 40);
        if (typeof msg.patch?.image === 'string') token.image = msg.patch.image.slice(0, 400000);
        if (msg.patch?.color) token.color = msg.patch.color === 'enemy' ? 'enemy' : 'pc';
        break;
      }
      case 'token:remove': {
        if (!isGm) return deny('Удалять токены может Мастер');
        room.tokens = room.tokens.filter((t) => t.id !== msg.id);
        room.initiative.order = room.initiative.order.filter((e) => e.tokenId !== msg.id);
        break;
      }
      case 'map': {
        if (!isGm) return deny('Менять карту может Мастер');
        const patch = msg.patch || {};
        if (typeof patch.image === 'string' && patch.image.length < 2_500_000) room.map.image = patch.image;
        if (patch.image === null) room.map.image = null;
        if (typeof patch.title === 'string') room.map.title = patch.title.slice(0, 80);
        if (typeof patch.showGrid === 'boolean') room.map.showGrid = patch.showGrid;
        if (Number(patch.width) > 200) room.map.width = clamp(Number(patch.width), 200, 6000);
        if (Number(patch.height) > 200) room.map.height = clamp(Number(patch.height), 200, 6000);
        if (Number(patch.gridSize) >= 24) room.map.gridSize = clamp(Number(patch.gridSize), 24, 200);
        break;
      }
      case 'init:set': {
        if (!isGm) return deny('Инициативу ведёт Мастер');
        const order = Array.isArray(msg.order) ? msg.order.slice(0, 60) : [];
        room.initiative.order = order.map((e) => ({
          id: crypto.randomUUID(),
          name: String(e.name || '—').slice(0, 40),
          value: Number(e.value) || 0,
          tokenId: e.tokenId || null,
          hp: e.hp ?? null,
          maxHp: e.maxHp ?? null,
          characterId: e.characterId || null,
        }));
        room.initiative.turn = 0;
        room.initiative.round = 1;
        room.initiative.active = room.initiative.order.length > 0;
        break;
      }
      case 'init:turn': {
        if (!isGm) return deny('Инициативу ведёт Мастер');
        const { order } = room.initiative;
        if (!order.length) return;
        const delta = msg.delta === -1 ? -1 : 1;
        let turn = room.initiative.turn + delta;
        let round = room.initiative.round;
        if (turn >= order.length) {
          turn = 0;
          round += 1;
        }
        if (turn < 0) {
          turn = order.length - 1;
          round = Math.max(1, round - 1);
        }
        room.initiative.turn = turn;
        room.initiative.round = round;
        break;
      }
      case 'init:reset': {
        if (!isGm) return deny('Инициативу ведёт Мастер');
        room.initiative = { order: [], turn: 0, round: 1, active: false };
        break;
      }
      case 'handout:add': {
        if (!isGm) return deny('Хендауты раздаёт Мастер');
        const title = String(msg.title || 'Без названия').slice(0, 80);
        const text = String(msg.text || '').slice(0, 6000);
        room.handouts.push({ id: crypto.randomUUID(), title, text, at: Date.now() });
        systemMessage(room, `Мастер выдал хендаут «${title}».`);
        break;
      }
      case 'handout:remove': {
        if (!isGm) return deny('Хендауты раздаёт Мастер');
        room.handouts = room.handouts.filter((h) => h.id !== msg.id);
        break;
      }
      case 'integration': {
        if (!isGm) return deny('Ссылку Vortex меняет Мастер');
        const rawUrl = String(msg.vortexUrl || '').trim();
        if (!rawUrl) {
          room.integration = { vortexUrl: '' };
          break;
        }
        let parsed;
        try {
          parsed = new URL(rawUrl);
        } catch {
          return deny('Некорректная ссылка Vortex');
        }
        if (parsed.protocol !== 'https:' || parsed.hostname !== 'vortex.longstoryshort.app') {
          return deny('Поддерживаются только ссылки vortex.longstoryshort.app');
        }
        room.integration = { vortexUrl: parsed.toString().slice(0, 500) };
        systemMessage(room, 'Мастер добавил ссылку на комнату Vortex.');
        break;
      }
      case 'sheet': {
        const ch = msg.character;
        if (!ch || typeof ch !== 'object') return;
        me.character = {
          id: String(ch.id || '').slice(0, 60),
          name: String(ch.name || '').slice(0, 60),
          level: Number(ch.level) || 1,
          classId: String(ch.classes?.[0]?.classId || ''),
          speciesId: String(ch.speciesId || ''),
          ac: Number(ch.ac) || 10,
          hp: Number(ch.hp?.current) || 0,
          hpMax: Number(ch.hp?.max) || 1,
          initiative: Number(ch.initiative) || 0,
          abilities: ch.abilities || null,
          skillProfs: ch.skillProfs || null,
          spells: Array.isArray(ch.spells?.known) ? ch.spells.known.slice(0, 40) : [],
          weapons: Array.isArray(ch.attacks)
            ? ch.attacks.slice(0, 12).map((a) => ({ name: a.name, toHit: a.toHit, damage: a.damage, damageType: a.damageType }))
            : [],
        };
        me.characterName = me.character.name;
        break;
      }
      case 'ping':
        ws.send(JSON.stringify({ t: 'pong', at: Date.now() }));
        return;
      default:
        return;
    }
    touch(room);
  });

  ws.on('close', () => {
    sockets.delete(ws);
    room.players = room.players.filter((p) => p.id !== playerId);
    systemMessage(room, `${name} покинул комнату.`);
    touch(room);
  });
});

function clamp(value, min, max) {
  const n = Number.isFinite(value) ? value : min;
  return Math.max(min, Math.min(max, n));
}

/* ---------- heartbeat ---------- */

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.readyState === ws.OPEN) ws.ping();
  }
}, 30000);
wss.on('close', () => clearInterval(heartbeat));

loadRooms();
server.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] DnD Companion слушает http://localhost:${PORT}`);
  console.log(`[server] WebSocket: ws://localhost:${PORT}/ws`);
  const addresses = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const item of list ?? []) {
      if (item && item.family === 'IPv4' && !item.internal) addresses.push(item.address);
    }
  }
  if (addresses.length) console.log(`[server] в локальной сети: http://${addresses[0]}:${PORT}`);
  const codespace = process.env.CODESPACE_NAME;
  const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
  if (codespace && forwardingDomain) {
    console.log(`[server] Codespaces (порт ${PORT} → Public): https://${codespace}-${PORT}.${forwardingDomain}`);
  }
});
