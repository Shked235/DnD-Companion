/**
 * Интеграционный прогон комнаты: HTTP-создание + два WebSocket-клиента.
 * Запуск: node scripts/smoke.mjs (сервер должен быть запущен).
 */
const BASE = process.env.SMOKE_BASE || 'http://localhost:8787';
const WS_BASE = BASE.replace(/^http/, 'ws');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

function check(condition, message) {
  if (!condition) fail(message);
  console.log(`✓ ${message}`);
}

function connect(code, name, key = '') {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({ code, name, key });
    const ws = new WebSocket(`${WS_BASE}/ws?${params}`);
    const client = { ws, states: [], role: null, errors: [], you: null };
    const timer = setTimeout(() => reject(new Error('таймаут подключения')), 8000);
    ws.addEventListener('open', () => {
      clearTimeout(timer);
      setTimeout(() => resolve(client), 350);
    });
    ws.addEventListener('error', (event) => {
      clearTimeout(timer);
      reject(new Error(`ошибка WebSocket: ${event?.message || 'неизвестно'}`));
    });
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(String(event.data));
      if (msg.t === 'welcome') {
        client.role = msg.role;
        client.you = msg.you;
        client.states.push(msg.room);
      }
      if (msg.t === 'state') client.states.push(msg.room);
      if (msg.t === 'error') client.errors.push(msg.message);
    });
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lastState = (client) => client.states[client.states.length - 1];

async function main() {
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json());
  check(health.ok === true, 'сервер отвечает на /api/health');

  const created = await fetch(`${BASE}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Smoke-комната', gmName: 'Мастер Смоук' }),
  }).then((r) => r.json());
  check(Boolean(created.code && created.key), `комната создана (код ${created.code})`);

  const info = await fetch(`${BASE}/api/rooms/${created.code}`).then((r) => r.json());
  check(info.exists === true && info.name === 'Smoke-комната', 'карточка комнаты доступна по коду');

  const gm = await connect(created.code, 'Мастер Смоук', created.key);
  const player = await connect(created.code, 'Игрок Смоук');
  check(gm.role === 'gm', 'ключ Мастера даёт роль gm');
  check(player.role === 'player', 'без ключа роль player');
  await sleep(250);
  check(lastState(gm).players.length === 2, 'оба участника видны в состоянии');
  check(player.states.length >= 2, 'игрок получает широковещательные обновления');

  gm.ws.send(JSON.stringify({ t: 'token:add', name: 'Гоблин', x: 200, y: 200, color: 'enemy', hp: { current: 7, max: 7 } }));
  await sleep(200);
  player.ws.send(JSON.stringify({ t: 'token:add', name: 'Игрок Смоук', x: 300, y: 300, hp: { current: 12, max: 12 } }));
  await sleep(250);
  const tokens = lastState(player).tokens;
  check(tokens.length === 2, 'два токена синхронизированы игроку');
  const own = tokens.find((t) => t.name === 'Игрок Смоук');
  check(own && own.ownerId === player.you.id, 'токен игрока принадлежит игроку');

  player.ws.send(JSON.stringify({ t: 'token:move', id: own.id, x: 420, y: 260 }));
  await sleep(200);
  const moved = lastState(gm).tokens.find((t) => t.id === own.id);
  check(moved.x === 420 && moved.y === 260, 'игрок двигает свой токен');

  const enemy = lastState(gm).tokens.find((t) => t.name === 'Гоблин');
  player.ws.send(JSON.stringify({ t: 'token:move', id: enemy.id, x: 10, y: 10 }));
  await sleep(200);
  check(player.errors.length > 0, 'чужой токен двигать нельзя (сервер отказал)');

  player.ws.send(JSON.stringify({ t: 'chat', text: 'Привет, стол!' }));
  player.ws.send(JSON.stringify({ t: 'roll', label: 'Скрытность', total: 18, detail: 'd20 [14] +4' }));
  await sleep(250);
  const chat = lastState(gm).chat;
  check(chat.some((m) => m.text === 'Привет, стол!'), 'сообщение чата доставлено');
  check(chat.some((m) => m.type === 'roll' && m.total === 18), 'бросок попал в общий лог');

  player.ws.send(JSON.stringify({ t: 'handout:add', title: 'Взлом', text: 'Нельзя' }));
  await sleep(200);
  check(player.errors.some((e) => e.includes('Мастер')), 'хендаут от игрока отклонён');
  gm.ws.send(JSON.stringify({ t: 'handout:add', title: 'Письмо', text: 'Встречаемся в таверне.' }));
  await sleep(200);
  check(lastState(player).handouts.length === 1, 'хендаут Мастера доставлен');

  gm.ws.send(
    JSON.stringify({
      t: 'init:set',
      order: [
        { name: 'Гоблин', value: 17, tokenId: enemy.id, hp: 7, maxHp: 7 },
        { name: 'Игрок', value: 12, tokenId: own.id, hp: 12, maxHp: 12 },
      ],
    }),
  );
  await sleep(200);
  const init = lastState(player).initiative;
  check(init.active === true && init.order.length === 2, 'инициатива собрана');
  gm.ws.send(JSON.stringify({ t: 'init:turn', delta: 1 }));
  await sleep(200);
  check(lastState(player).initiative.turn === 1, 'ход передан следующему');

  gm.ws.send(JSON.stringify({ t: 'map', patch: { showGrid: false, title: 'Тестовая карта' } }));
  await sleep(200);
  check(lastState(player).map.showGrid === false, 'настройки карты синхронизированы');

  gm.ws.send(
    JSON.stringify({ t: 'integration', vortexUrl: 'https://vortex.longstoryshort.app/room/test-room' }),
  );
  await sleep(250);
  check(
    String(lastState(player).integration?.vortexUrl || '').includes('vortex.longstoryshort.app'),
    'ссылка на комнату Vortex доставлена',
  );
  const errorsBefore = player.errors.length;
  player.ws.send(JSON.stringify({ t: 'integration', vortexUrl: 'https://example.com/room/1' }));
  await sleep(200);
  check(player.errors.length > errorsBefore, 'игрок не может менять ссылку Vortex');

  const sheetPlayer = player;
  sheetPlayer.ws.send(JSON.stringify({ t: 'sheet', character: { id: 'c1', name: 'Кайра', level: 3, classes: [{ classId: 'ranger' }], ac: 14, hp: { current: 20, max: 28 }, initiative: 3 } }));
  await sleep(250);
  const seen = lastState(gm).players.find((p) => p.id === player.you.id);
  check(seen.characterName === 'Кайра', 'лист персонажа виден Мастеру');

  gm.ws.close();
  player.ws.close();
  await sleep(150);
  console.log('\nВсе проверки пройдены.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
