import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Character } from '../data/types';
import { deriveCharacter } from '../lib/rules/character';
import { formatMod, rollDice } from '../lib/rules/core';
import { useAppState } from '../lib/store';
import { CopyButton, Icon, Modal, toast } from '../lib/ui';
import { LssSheetModal } from '../components/LssSheetModal';
import type { DiceRollPayload } from '@longstoryshort/vtt-sdk';
import {
  fetchRoomInfo,
  getRoomKey,
  wsUrl,
  type ChatMessage,
  type RoomState,
} from '../lib/room';

type Status = 'connecting' | 'online' | 'closed';

const DICE = [4, 6, 8, 10, 12, 20, 100];

export default function RoomPage() {
  const { code: rawCode } = useParams();
  const code = (rawCode || '').toUpperCase();
  const { profile, characters } = useAppState();

  const [room, setRoom] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<Status>('connecting');
  const [role, setRole] = useState<'gm' | 'player'>('player');
  const [you, setYou] = useState<{ id: string; name: string; role: 'gm' | 'player' } | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'chat' | 'handouts' | 'sheet'>(() => {
    const saved = localStorage.getItem(`dnd-companion:room-tab:${code}`);
    return saved === 'handouts' || saved === 'sheet' ? saved : 'chat';
  });
  const [chatText, setChatText] = useState('');
  const [measure, setMeasure] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<{ a: { x: number; y: number } | null; b: { x: number; y: number } | null }>({
    a: null,
    b: null,
  });
  const [sheetId, setSheetId] = useState(() => localStorage.getItem(`dnd-companion:room-sheet:${code}`) ?? '');
  const [handoutOpen, setHandoutOpen] = useState(false);
  const [initOpen, setInitOpen] = useState(false);
  const [mapMenu, setMapMenu] = useState(false);
  const [tokenOpen, setTokenOpen] = useState(false);
  const [vortexDraft, setVortexDraft] = useState('');
  const [lssOpen, setLssOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const viewRef = useRef({ x: 0, y: 0, s: 0.7 });
  const [view, setView] = useState({ x: 0, y: 0, s: 0.7 });
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    try {
      localStorage.setItem(`dnd-companion:room-tab:${code}`, tab);
    } catch {
      /* ignore */
    }
  }, [tab, code]);

  useEffect(() => {
    try {
      if (sheetId) localStorage.setItem(`dnd-companion:room-sheet:${code}`, sheetId);
      else localStorage.removeItem(`dnd-companion:room-sheet:${code}`);
    } catch {
      /* ignore */
    }
  }, [sheetId, code]);

  useEffect(() => {
    if (sheetId && characters.length && !characters.some((c) => c.id === sheetId)) {
      setSheetId('');
    }
  }, [characters, sheetId]);

  const send = useCallback((msg: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  const handleLssRoll = useCallback(
    (roll: DiceRollPayload) => {
      const match = roll.total.match(/-?\d+/);
      const total = match ? Number(match[0]) : 0;
      send({
        t: 'roll',
        label: `${roll.characterName}: ${roll.title}`,
        total,
        detail: [roll.formula, roll.breakdown].filter(Boolean).join(' · '),
        crit: roll.isCrit && roll.critKind !== 'failure',
        critFail: roll.critKind === 'failure',
      });
    },
    [send],
  );

  /* ---------- подключение ---------- */
  useEffect(() => {
    if (!code) return;
    let closed = false;
    let retry = 0;
    let timer: number | undefined;

    async function connect() {
      setStatus('connecting');
      const info = await fetchRoomInfo(code).catch(() => ({ exists: false }));
      if (closed) return;
      if (!info.exists) {
        setError('Комната с таким кодом не найдена. Проверьте код или создайте новую.');
        setStatus('closed');
        return;
      }
      const key = getRoomKey(code);
      const ws = new WebSocket(wsUrl(code, profile.name, key));
      wsRef.current = ws;
      ws.onopen = () => {
        retry = 0;
        setStatus('online');
        setError('');
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.t === 'welcome') {
            setRole(msg.role);
            setYou(msg.you);
            setRoom(msg.room);
          } else if (msg.t === 'state') {
            setRoom(msg.room);
          } else if (msg.t === 'error') {
            toast(String(msg.message), 'danger');
          }
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        if (closed) return;
        setStatus('closed');
        if (retry < 5) {
          retry += 1;
          timer = window.setTimeout(connect, 1200 * retry);
        }
      };
    }

    connect();
    return () => {
      closed = true;
      window.clearTimeout(timer);
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, [code, profile.name]);

  /* ---------- вписать карту в экран ---------- */
  const fittedRef = useRef(false);
  useEffect(() => {
    if (!room || fittedRef.current) return;
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const s = Math.min(rect.width / room.map.width, rect.height / room.map.height) * 0.94;
    const next = { s, x: (rect.width - room.map.width * s) / 2, y: (rect.height - room.map.height * s) / 2 };
    fittedRef.current = true;
    setView(next);
  }, [room]);

  /* ---------- зум ---------- */
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const current = viewRef.current;
      const factor = Math.exp(-event.deltaY * 0.0012);
      const s = Math.max(0.15, Math.min(3, current.s * factor));
      const cx = event.clientX - rect.left;
      const cy = event.clientY - rect.top;
      const x = cx - ((cx - current.x) * s) / current.s;
      const y = cy - ((cy - current.y) * s) / current.s;
      const next = { x, y, s };
      viewRef.current = next;
      setView(next);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    setVortexDraft(room?.integration?.vortexUrl ?? '');
  }, [room?.code, room?.integration?.vortexUrl]);

  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [room?.chat.length, tab]);

  const sendSheet = useCallback(
    (character: Character) => {
      const d = deriveCharacter(character);
      send({
        t: 'sheet',
        character: {
          id: character.id,
          name: character.name,
          level: d.level,
          classes: character.classes,
          speciesId: character.speciesId,
          ac: d.ac,
          hp: { current: character.hp.current, max: d.hpMax },
          initiative: d.initiative,
          abilities: character.abilities,
          skillProfs: character.skillProfs,
          spells: { known: character.spells.known },
          attacks: d.attacks,
        },
      });
    },
    [send],
  );

  useEffect(() => {
    if (!room || status !== 'online' || !you) return;
    const mine = characters.find((c) => c.id === sheetId);
    if (mine) sendSheet(mine);
  }, [sheetId, status, you, room?.code]);

  if (error) {
    return (
      <div className="page">
        <div className="empty">
          <Icon name="map" size={44} />
          <h3>Комната недоступна</h3>
          <p className="muted">{error}</p>
          <Link className="btn btn-primary" to="/rooms">
            К списку комнат
          </Link>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="page">
        <div className="empty">
          <Icon name="clock" size={42} />
          <h3>{status === 'connecting' ? 'Подключаемся к комнате…' : 'Комната закрыта'}</h3>
          <p className="muted">
            {status === 'connecting'
              ? 'Проверяем код и устанавливаем соединение с сервером.'
              : 'Соединение потеряно. Проверьте, что сервер приложения запущен, и обновите страницу.'}
          </p>
          <Link className="btn btn-ghost" to="/rooms">
            Назад
          </Link>
        </div>
      </div>
    );
  }

  const map = room.map;
  const isGm = role === 'gm';

  const toMap = (clientX: number, clientY: number) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    const v = viewRef.current;
    const left = rect?.left ?? 0;
    const top = rect?.top ?? 0;
    return { x: (clientX - left - v.x) / v.s, y: (clientY - top - v.y) / v.s };
  };

  const startPan = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const start = { mx: e.clientX, my: e.clientY, x: view.x, y: view.y };
    setDragging(true);
    const move = (ev: PointerEvent) => {
      const next = { ...viewRef.current, x: start.x + (ev.clientX - start.mx), y: start.y + (ev.clientY - start.my) };
      viewRef.current = next;
      setView(next);
    };
    const up = () => {
      setDragging(false);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onViewportClick = (e: React.MouseEvent) => {
    if (!measure) return;
    const point = toMap(e.clientX, e.clientY);
    if (!measurePoints.a || (measurePoints.a && measurePoints.b)) {
      setMeasurePoints({ a: point, b: null });
    } else {
      setMeasurePoints({ a: measurePoints.a, b: point });
    }
  };

  const measureFeet = (() => {
    if (!measurePoints.a || !measurePoints.b) return null;
    const dx = measurePoints.b.x - measurePoints.a.x;
    const dy = measurePoints.b.y - measurePoints.a.y;
    const squares = Math.hypot(dx, dy) / map.gridSize;
    return Math.max(0, Math.round(squares)) * 5;
  })();

  const startTokenDrag = (e: React.PointerEvent, tokenId: string, tx: number, ty: number, canMove: boolean) => {
    if (!canMove) return;
    e.stopPropagation();
    const scale = viewRef.current.s;
    const start = { mx: e.clientX, my: e.clientY, x: tx, y: ty };
    setDrag({ id: tokenId, x: tx, y: ty });
    const move = (ev: PointerEvent) => {
      const x = Math.max(0, Math.min(map.width, start.x + (ev.clientX - start.mx) / scale));
      const y = Math.max(0, Math.min(map.height, start.y + (ev.clientY - start.my) / scale));
      setDrag({ id: tokenId, x, y });
    };
    const up = (ev: PointerEvent) => {
      const x = Math.max(0, Math.min(map.width, start.x + (ev.clientX - start.mx) / scale));
      const y = Math.max(0, Math.min(map.height, start.y + (ev.clientY - start.my) / scale));
      send({ t: 'token:move', id: tokenId, x, y });
      setDrag(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const addToken = (name: string, hp: number, kind: 'pc' | 'enemy') => {
    const center = toMap(
      (viewportRef.current?.getBoundingClientRect().left ?? 0) + (viewportRef.current?.clientWidth ?? 0) / 2,
      (viewportRef.current?.getBoundingClientRect().top ?? 0) + (viewportRef.current?.clientHeight ?? 0) / 2,
    );
    send({
      t: 'token:add',
      name,
      x: center.x,
      y: center.y,
      size: 1,
      color: isGm ? kind : 'pc',
      hp: { current: hp, max: hp },
    });
    setTokenOpen(false);
  };

  const uploadMap = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Нужен файл изображения', 'danger');
      return;
    }
    try {
      const image = await downscaleImage(file, 2000);
      send({ t: 'map', patch: { image: image.dataUrl, width: image.width, height: image.height } });
      fittedRef.current = false;
      toast('Карта загружена', 'success');
    } catch {
      toast('Не удалось прочитать изображение', 'danger');
    }
  };

  const rollDiceToChat = (expression: string, label: string) => {
    try {
      const result = rollDice(expression);
      send({ t: 'roll', label, total: result.total, detail: result.text });
    } catch {
      toast('Неверная формула броска', 'danger');
    }
  };

  const submitChat = () => {
    const text = chatText.trim();
    if (!text) return;
    if (/^\/r\s+/i.test(text)) {
      const expression = text.replace(/^\/r\s+/i, '');
      rollDiceToChat(expression, expression);
    } else {
      send({ t: 'chat', text });
    }
    setChatText('');
  };

  const buildInitiative = () => {
    const entries: { name: string; value: number; tokenId: string | null; hp: number | null; maxHp: number | null; characterId: string | null }[] = [];
    const usedTokens = new Set<string>();
    for (const player of room.players) {
      const ch = player.character;
      const roll = Math.floor(Math.random() * 20) + 1;
      if (ch) {
        const token = room.tokens.find((t) => t.ownerId === player.id && !usedTokens.has(t.id));
        if (token) usedTokens.add(token.id);
        entries.push({
          name: `${player.name}${ch.name ? ` (${ch.name})` : ''}`,
          value: roll + (ch.initiative || 0),
          tokenId: token?.id ?? null,
          hp: ch.hp,
          maxHp: ch.hpMax,
          characterId: ch.id,
        });
      } else {
        entries.push({ name: player.name, value: roll, tokenId: null, hp: null, maxHp: null, characterId: null });
      }
    }
    for (const token of room.tokens) {
      if (usedTokens.has(token.id)) continue;
      entries.push({
        name: token.name,
        value: Math.floor(Math.random() * 20) + 1,
        tokenId: token.id,
        hp: token.hp.current,
        maxHp: token.hp.max,
        characterId: null,
      });
    }
    entries.sort((a, b) => b.value - a.value);
    send({ t: 'init:set', order: entries });
    setInitOpen(false);
    toast('Инициатива брошена', 'success');
  };

  const activeTokenId = room.initiative.active
    ? room.initiative.order[room.initiative.turn]?.tokenId ?? null
    : null;

  return (
    <div className="room-shell">
      {/* Левая колонка */}
      <aside className="room-col">
        <div className="room-head">
          <Icon name="users" size={16} />
          <h3>Стол</h3>
          <span className="chip" style={{ marginLeft: 'auto' }}>{room.players.length}</span>
        </div>
        <div className="room-col-body">
          <div className="row-between">
            <div>
              <div className="serif" style={{ fontSize: 17, color: 'var(--text-strong)' }}>{room.name}</div>
              <button
                className="tiny mono"
                style={{ background: 'none', border: 0, color: 'var(--c-a68a64)', letterSpacing: '0.2em', cursor: 'pointer', padding: 0 }}
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    toast('Код комнаты скопирован', 'success');
                  } catch {
                    toast(`Код: ${code}`);
                  }
                }}
                title="Скопировать код"
              >
                {code}
              </button>
            </div>
            <span className={`chip${isGm ? ' chip-accent' : ''}`}>{isGm ? 'Мастер' : 'Игрок'}</span>
          </div>

          <div className="panel" style={{ padding: 10 }}>
            <div className="tiny" style={{ marginBottom: 6 }}>Участники</div>
            <div className="col" style={{ gap: 2 }}>
              {room.players.map((player) => (
                <div key={player.id} className="party-item">
                  <span className="dot" />
                  <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {player.name}
                    {player.characterName ? <span className="hint"> · {player.characterName}</span> : null}
                  </span>
                  <span className="role">{player.role === 'gm' ? 'Мастер' : 'Игрок'}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel" style={{ padding: 10 }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <div className="tiny">Инициатива</div>
              {isGm ? (
                <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => setInitOpen(true)} title="Собрать инициативу">
                  <Icon name="dice" size={14} />
                </button>
              ) : null}
            </div>
            {room.initiative.active ? (
              <>
                <div className="col" style={{ gap: 4 }}>
                  {room.initiative.order.map((entry, idx) => (
                    <div key={entry.id} className={`init-row${idx === room.initiative.turn ? ' active' : ''}`}>
                      <span className="num">{entry.value}</span>
                      <span className="nm">{entry.name}</span>
                      <span className="hp">{entry.hp !== null ? `${entry.hp}/${entry.maxHp ?? '?'}` : ''}</span>
                    </div>
                  ))}
                </div>
                <div className="row-between" style={{ marginTop: 8 }}>
                  <span className="tiny">Раунд {room.initiative.round}</span>
                  {isGm ? (
                    <div className="row" style={{ gap: 4 }}>
                      <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => send({ t: 'init:turn', delta: -1 })} title="Назад">
                        <Icon name="arrowLeft" size={14} />
                      </button>
                      <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => send({ t: 'init:turn', delta: 1 })} title="Следующий">
                        <Icon name="arrowRight" size={14} />
                      </button>
                      <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => send({ t: 'init:reset' })} title="Сбросить">
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="hint">
                {isGm ? 'Нажмите на кубик, чтобы собрать всех участников и бросить инициативу.' : 'Мастер ещё не начал бой.'}
              </div>
            )}
          </div>

          <div className="panel" style={{ padding: 10 }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <div className="tiny">Vortex</div>
              <Icon name="map" size={13} />
            </div>
            {isGm ? (
              <div className="col" style={{ gap: 6 }}>
                <input
                  className="input input-sm"
                  placeholder="https://vortex.longstoryshort.app/room/..."
                  value={vortexDraft}
                  onChange={(e) => setVortexDraft(e.target.value)}
                  onBlur={() => {
                    if (vortexDraft.trim() !== (room.integration?.vortexUrl ?? '')) {
                      send({ t: 'integration', vortexUrl: vortexDraft.trim() });
                    }
                  }}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => send({ t: 'integration', vortexUrl: vortexDraft.trim() })}
                >
                  Сохранить ссылку
                </button>
              </div>
            ) : null}
            {room.integration?.vortexUrl ? (
              <>
                <a
                  className="btn btn-primary btn-sm btn-block"
                  style={{ marginTop: 8 }}
                  href={room.integration.vortexUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Icon name="play" size={13} />
                  Открыть комнату Vortex
                </a>
                <button
                  className="btn btn-ghost btn-sm btn-block"
                  style={{ marginTop: 6 }}
                  onClick={() => {
                    const base = room.integration!.vortexUrl.replace(/\/+$/, '');
                    const loggerUrl = base.endsWith('/logger') ? `${base}/` : `${base}/logger/`;
                    window.open(loggerUrl, 'vortex-logger', 'popup=yes,width=440,height=780');
                  }}
                >
                  <Icon name="dice" size={13} /> Лог бросков Vortex
                </button>
              </>
            ) : (
              <div className="hint">
                {isGm
                  ? 'Вставьте ссылку на свою комнату Vortex — её увидят все участники.'
                  : 'Мастер ещё не добавил ссылку на комнату Vortex.'}
              </div>
            )}
            <div className="hint" style={{ marginTop: 6 }}>
              Vortex — отдельный виртуальный стол. Встроить его в приложение нельзя из-за политики
              безопасности сайта (CSP), поэтому комната и лог бросков открываются отдельными окнами.
            </div>
          </div>

          {isGm ? (
            <div className="panel" style={{ padding: 10 }}>
              <div className="tiny" style={{ marginBottom: 6 }}>Мастерская</div>
              <div className="col" style={{ gap: 5 }}>
                <button className="btn btn-ghost btn-sm btn-block" onClick={() => setTokenOpen(true)}>
                  <Icon name="plus" size={14} />
                  Добавить токен
                </button>
                <button className="btn btn-ghost btn-sm btn-block" onClick={() => fileRef.current?.click()}>
                  <Icon name="upload" size={14} />
                  Загрузить карту
                </button>
                <button className="btn btn-ghost btn-sm btn-block" onClick={() => setHandoutOpen(true)}>
                  <Icon name="scroll" size={14} />
                  Новый хендаут
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost btn-sm btn-block" onClick={() => setTokenOpen(true)}>
              <Icon name="plus" size={14} />
              Поставить свой токен
            </button>
          )}

          <div className="hint">
            {status === 'online' ? 'Соединение установлено.' : 'Переподключение…'}
          </div>
          <Link className="btn btn-ghost btn-sm btn-block" to="/rooms">
            Выйти из комнаты
          </Link>
        </div>
      </aside>

      {/* Карта */}
      <section className="room-center">
        <div className="room-toolbar">
          <button className={`icon-btn${measure ? ' on' : ''}`} title="Линейка" onClick={() => { setMeasure((m) => !m); setMeasurePoints({ a: null, b: null }); }}>
            <Icon name="mapPin" size={16} />
          </button>
          <button
            className={`icon-btn${map.showGrid ? ' on' : ''}`}
            title="Сетка"
            onClick={() => isGm && send({ t: 'map', patch: { showGrid: !map.showGrid } })}
          >
            <Icon name="grid" size={16} />
          </button>
          <button
            className="icon-btn"
            title="Вписать карту"
            onClick={() => {
              fittedRef.current = false;
              const el = viewportRef.current;
              if (!el) return;
              const rect = el.getBoundingClientRect();
              const s = Math.min(rect.width / map.width, rect.height / map.height) * 0.94;
              const next = { s, x: (rect.width - map.width * s) / 2, y: (rect.height - map.height * s) / 2 };
              viewRef.current = next;
              setView(next);
            }}
          >
            <Icon name="search" size={16} />
          </button>
          {isGm ? (
            <button className="icon-btn" title="Свойства карты" onClick={() => setMapMenu(true)}>
              <Icon name="edit" size={16} />
            </button>
          ) : null}
        </div>

        <div
          ref={viewportRef}
          className={`map-viewport${dragging ? ' dragging' : ''}`}
          onPointerDown={startPan}
          onClick={onViewportClick}
          style={{ cursor: measure ? 'crosshair' : undefined }}
        >
          <div
            className="map-stage"
            style={{
              width: map.width,
              height: map.height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})`,
              backgroundSize: `${map.gridSize}px ${map.gridSize}px`,
              backgroundImage: map.showGrid
                ? 'linear-gradient(rgba(236,220,196,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(236,220,196,0.16) 1px, transparent 1px)'
                : 'none',
            }}
          >
            {map.image ? <img src={map.image} alt="" draggable={false} /> : null}
            {map.title ? (
              <div
                style={{
                  position: 'absolute',
                  left: 16,
                  top: 12,
                  fontFamily: 'var(--font-display)',
                  fontSize: 22,
                  color: 'rgba(240,228,198,0.75)',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  pointerEvents: 'none',
                }}
              >
                {map.title}
              </div>
            ) : null}

            {room.tokens.map((token) => {
              const pos = drag?.id === token.id ? drag : token;
              const size = map.gridSize * token.size;
              const canMove = isGm || token.ownerId === you?.id;
              const hpPct = token.hp.max ? (token.hp.current / token.hp.max) * 100 : 100;
              return (
                <div
                  key={token.id}
                  className={`token${token.color === 'enemy' ? ' enemy' : ''}${token.ownerId === you?.id ? ' mine' : ''}${activeTokenId === token.id ? ' active-turn' : ''}`}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: size,
                    height: size,
                    cursor: canMove ? 'grab' : 'default',
                  }}
                  onPointerDown={(e) => startTokenDrag(e, token.id, token.x, token.y, canMove)}
                  onClick={(e) => e.stopPropagation()}
                  title={`${token.name} · ${token.hp.current}/${token.hp.max}`}
                >
                  {token.image ? <img src={token.image} alt="" /> : <span style={{ fontSize: size * 0.4 }}>{token.name.slice(0, 1)}</span>}
                  <div className="hpbar">
                    <span className={hpPct < 35 ? 'low' : ''} style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }} />
                  </div>
                  <div className="label">{token.name}</div>
                  {isGm ? (
                    <button
                      className="icon-btn"
                      style={{ position: 'absolute', top: -10, right: -10, width: 20, height: 20, background: 'rgba(20,24,16,0.9)', border: '1px solid var(--border)' }}
                      title="Удалить токен"
                      onClick={(e) => {
                        e.stopPropagation();
                        send({ t: 'token:remove', id: token.id });
                      }}
                    >
                      <Icon name="close" size={11} />
                    </button>
                  ) : null}
                </div>
              );
            })}

            {measurePoints.a ? (
              <svg
                width={map.width}
                height={map.height}
                style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}
              >
                {measurePoints.b ? (
                  <>
                    <line
                      x1={measurePoints.a.x}
                      y1={measurePoints.a.y}
                      x2={measurePoints.b.x}
                      y2={measurePoints.b.y}
                      stroke="#e8d5a8"
                      strokeWidth={2 / view.s}
                      strokeDasharray={`${6 / view.s} ${4 / view.s}`}
                    />
                    <circle cx={measurePoints.a.x} cy={measurePoints.a.y} r={5 / view.s} fill="#a68a64" />
                    <circle cx={measurePoints.b.x} cy={measurePoints.b.y} r={5 / view.s} fill="#a68a64" />
                    <text
                      x={(measurePoints.a.x + measurePoints.b.x) / 2}
                      y={(measurePoints.a.y + measurePoints.b.y) / 2 - 10 / view.s}
                      fill="#f0e4c6"
                      fontSize={14 / view.s}
                      textAnchor="middle"
                    >
                      {measureFeet} фт.
                    </text>
                  </>
                ) : (
                  <circle cx={measurePoints.a.x} cy={measurePoints.a.y} r={5 / view.s} fill="#a68a64" />
                )}
              </svg>
            ) : null}
          </div>

          {measure ? (
            <div className="panel" style={{ position: 'absolute', left: 12, bottom: 12, padding: '8px 12px', zIndex: 4 }}>
              <div className="hint">
                {measurePoints.a ? (measurePoints.b ? `${measureFeet} фт. · клик — новый замер` : 'Второй клик — конец отрезка') : 'Клик — начало отрезка'}
              </div>
            </div>
          ) : null}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => uploadMap(e.target.files?.[0])} />
      </section>

      {/* Правая колонка */}
      <aside className="room-col">
        <div className="room-head" style={{ gap: 4, padding: 8 }}>
          <div className="tabs" style={{ padding: 3 }}>
            {(
              [
                ['chat', 'Чат'],
                ['handouts', `Хендауты`],
                ['sheet', 'Лист'],
              ] as ['chat' | 'handouts' | 'sheet', string][]
            ).map(([id, label]) => (
              <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {tab === 'chat' ? (
          <div className="chat">
            <div className="chat-log" ref={chatRef}>
              {room.chat.map((msg) => (
                <ChatLine key={msg.id} msg={msg} />
              ))}
            </div>
            <div className="dice-pad">
              {DICE.map((sides) => (
                <button key={sides} onClick={() => rollDiceToChat(`1d${sides}`, `d${sides}`)} title={`Бросок d${sides}`}>
                  d{sides}
                </button>
              ))}
            </div>
            <form
              className="chat-form"
              onSubmit={(e) => {
                e.preventDefault();
                submitChat();
              }}
            >
              <input
                className="input"
                placeholder="Сообщение или /r 2d6+3"
                value={chatText}
                maxLength={2000}
                onChange={(e) => setChatText(e.target.value)}
              />
              <button className="btn btn-primary btn-sm" type="submit" aria-label="Отправить">
                <Icon name="arrowRight" size={15} />
              </button>
            </form>
          </div>
        ) : tab === 'handouts' ? (
          <div className="chat">
            <div className="chat-log">
              {isGm ? (
                <button className="btn btn-ghost btn-sm" onClick={() => setHandoutOpen(true)}>
                  <Icon name="plus" size={14} />
                  Выдать хендаут
                </button>
              ) : null}
              {room.handouts.length === 0 ? (
                <p className="hint">Мастер ещё не выдал ни одного хендаута.</p>
              ) : (
                room.handouts.map((handout) => (
                  <div key={handout.id} className="handout">
                    <div className="row-between">
                      <h4>{handout.title}</h4>
                      {isGm ? (
                        <button className="icon-btn" style={{ width: 22, height: 22 }} onClick={() => send({ t: 'handout:remove', id: handout.id })}>
                          <Icon name="trash" size={12} />
                        </button>
                      ) : null}
                    </div>
                    <p>{handout.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="room-col-body" style={{ flex: 1 }}>
            <div className="panel">
              <div className="tiny" style={{ marginBottom: 6 }}>Лист Long Story Short</div>
              <button className="btn btn-ghost btn-sm btn-block" onClick={() => setLssOpen(true)}>
                <Icon name="scroll" size={14} />
                Открыть лист LSS
              </button>
              <div className="hint" style={{ marginTop: 6 }}>
                Броски из встроенного листа автоматически приходят в чат комнаты.
              </div>
            </div>

            <div className="panel">
              <div className="tiny" style={{ marginBottom: 6 }}>Мой персонаж в комнате</div>
              {characters.length === 0 ? (
                <div className="hint">
                  У вас нет персонажей.{' '}
                  <Link to="/characters/new">Создайте</Link> и привяжите к комнате.
                </div>
              ) : (
                <div className="col" style={{ gap: 8 }}>
                  <select className="select" value={sheetId} onChange={(e) => setSheetId(e.target.value)}>
                    <option value="">Не привязан</option>
                    {characters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} · {c.level} ур.
                      </option>
                    ))}
                  </select>
                  <div className="hint">
                    Мастер увидит ваш КД, хиты, атаки и заклинания. Броски с листа в комнату не
                    отправляются автоматически — используйте кубики в чате.
                  </div>
                </div>
              )}
            </div>

            {you ? (
              <div className="panel">
                <div className="tiny" style={{ marginBottom: 4 }}>Вы в комнате</div>
                <div>{you.name}</div>
                <div className="hint">Роль: {isGm ? 'Мастер' : 'Игрок'} · id {you.id.slice(0, 8)}</div>
              </div>
            ) : null}

            <div className="panel">
              <div className="tiny" style={{ marginBottom: 4 }}>Персонажи за столом</div>
              {room.players.filter((p) => p.character).length === 0 ? (
                <div className="hint">Пока никто не привязал лист.</div>
              ) : (
                room.players
                  .filter((p) => p.character)
                  .map((p) => (
                    <div key={p.id} className="party-item" style={{ alignItems: 'flex-start' }}>
                      <span className="dot" />
                      <span>
                        <strong>{p.character?.name}</strong>
                        <div className="hint">
                          {p.name} · {p.character?.level} ур. · КД {p.character?.ac} · ХП {p.character?.hp}/
                          {p.character?.hpMax}
                        </div>
                      </span>
                    </div>
                  ))
              )}
            </div>

            <div className="panel">
              <div className="tiny" style={{ marginBottom: 4 }}>Код для приглашения</div>
              <div className="row-between">
                <span className="mono" style={{ letterSpacing: '0.2em' }}>{code}</span>
                <CopyButton text={code} label="Копировать" />
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Модалки */}
      {tokenOpen ? (
        <TokenModal
          defaultName={isGm ? 'Гоблин' : profile.name}
          allowEnemy={isGm}
          onClose={() => setTokenOpen(false)}
          onSubmit={addToken}
        />
      ) : null}

      {lssOpen ? (
        <LssSheetModal onClose={() => setLssOpen(false)} onRoll={handleLssRoll} />
      ) : null}

      {handoutOpen ? (
        <HandoutModal
          onClose={() => setHandoutOpen(false)}
          onSubmit={(title, text) => {
            send({ t: 'handout:add', title, text });
            setHandoutOpen(false);
          }}
        />
      ) : null}

      {initOpen ? (
        <Modal
          title="Бросить инициативу"
          onClose={() => setInitOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setInitOpen(false)}>
                Отмена
              </button>
              <button className="btn btn-primary" onClick={buildInitiative}>
                <Icon name="dice" />
                Бросить всем
              </button>
            </>
          }
        >
          <p className="hint" style={{ marginTop: 0 }}>
            Будут добавлены все участники с привязанными листами (+ модификатор Ловкости) и все токены без
            владельца. Порядок сортируется по результату.
          </p>
          <div className="col" style={{ gap: 4 }}>
            {room.players.map((p) => (
              <div key={p.id} className="row-between">
                <span>{p.name}</span>
                <span className="hint">{p.character ? `инициатива ${formatMod(p.character.initiative)}` : 'без листа'}</span>
              </div>
            ))}
          </div>
        </Modal>
      ) : null}

      {mapMenu ? (
        <Modal
          title="Карта"
          onClose={() => setMapMenu(false)}
          footer={
            <>
              <button
                className="btn btn-danger"
                onClick={() => {
                  send({ t: 'map', patch: { image: null } });
                  setMapMenu(false);
                }}
              >
                Убрать изображение
              </button>
              <button className="btn btn-primary" onClick={() => setMapMenu(false)}>
                Готово
              </button>
            </>
          }
        >
          <div className="col" style={{ gap: 12 }}>
            <div className="field">
              <label>Название на карте</label>
              <input
                className="input"
                defaultValue={map.title}
                onBlur={(e) => send({ t: 'map', patch: { title: e.target.value } })}
              />
            </div>
            <div className="field">
              <label>Размер клетки, px</label>
              <input
                className="input"
                type="number"
                min={24}
                max={200}
                defaultValue={map.gridSize}
                onBlur={(e) => send({ t: 'map', patch: { gridSize: Number(e.target.value) } })}
              />
            </div>
            <div className="hint">
              Размер сцены: {map.width} × {map.height} px. Загрузите изображение — оно масштабируется до
              2000 px по большей стороне.
            </div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function ChatLine({ msg }: { msg: ChatMessage }) {
  const time = new Date(msg.at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (msg.type === 'system') {
    return (
      <div className="msg system">
        <span className="body">{msg.text}</span>
      </div>
    );
  }
  if (msg.type === 'roll') {
    return (
      <div className="msg roll">
        <span className="who">{msg.who}</span>
        <span className="when">{time}</span>
        <div className="body">
          {msg.text} <span className="total">{msg.total}</span>
          {msg.detail ? <div className="hint">{msg.detail}</div> : null}
        </div>
      </div>
    );
  }
  return (
    <div className="msg">
      <span className="who">{msg.who}</span>
      <span className="when">{time}</span>
      <div className="body">{msg.text}</div>
    </div>
  );
}

function HandoutModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (title: string, text: string) => void }) {
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  return (
    <Modal
      title="Новый хендаут"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn btn-primary"
            disabled={!title.trim() || !text.trim()}
            onClick={() => onSubmit(title.trim(), text.trim())}
          >
            Выдать
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <div className="field">
          <label>Заголовок</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Письмо от бургомистра" />
        </div>
        <div className="field">
          <label>Текст</label>
          <textarea className="textarea" value={text} onChange={(e) => setText(e.target.value)} rows={8} />
        </div>
      </div>
    </Modal>
  );
}

function TokenModal({
  defaultName,
  allowEnemy,
  onClose,
  onSubmit,
}: {
  defaultName: string;
  allowEnemy: boolean;
  onClose: () => void;
  onSubmit: (name: string, hp: number, kind: 'pc' | 'enemy') => void;
}) {
  const [name, setName] = useState(defaultName);
  const [hp, setHp] = useState(10);
  const [kind, setKind] = useState<'pc' | 'enemy'>(allowEnemy ? 'enemy' : 'pc');
  return (
    <Modal
      title="Новый токен"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button
            className="btn btn-primary"
            disabled={!name.trim()}
            onClick={() => onSubmit(name.trim(), Math.max(1, hp), kind)}
          >
            Поставить
          </button>
        </>
      }
    >
      <div className="col" style={{ gap: 12 }}>
        <div className="field">
          <label>Имя</label>
          <input className="input" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Хиты</label>
          <input
            className="input"
            type="number"
            min={1}
            max={9999}
            value={hp}
            onChange={(e) => setHp(Number(e.target.value) || 1)}
          />
        </div>
        {allowEnemy ? (
          <div className="field">
            <label>Сторона</label>
            <div className="tabs" style={{ alignSelf: 'flex-start' }}>
              <button className={kind === 'enemy' ? 'active' : ''} onClick={() => setKind('enemy')}>
                Противник
              </button>
              <button className={kind === 'pc' ? 'active' : ''} onClick={() => setKind('pc')}>
                Союзник
              </button>
            </div>
          </div>
        ) : null}
        <div className="hint">Токен появится в центре видимой части карты. Двигать его смогут Мастер и владелец.</div>
      </div>
    </Modal>
  );
}

function downscaleImage(file: File, maxSide: number): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('bad image'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('no canvas'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), width, height });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
