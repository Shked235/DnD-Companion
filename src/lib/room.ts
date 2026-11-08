export interface RoomCharacter {
  id: string;
  name: string;
  level: number;
  classId: string;
  speciesId: string;
  ac: number;
  hp: number;
  hpMax: number;
  initiative: number;
  abilities: Record<string, number> | null;
  skillProfs: Record<string, number> | null;
  spells: string[];
  weapons: { name: string; toHit: number; damage: string; damageType: string }[];
}

export interface RoomPlayer {
  id: string;
  name: string;
  role: 'gm' | 'player';
  characterName: string | null;
  character: RoomCharacter | null;
  online: boolean;
}

export interface RoomToken {
  id: string;
  name: string;
  x: number;
  y: number;
  size: number;
  color: 'pc' | 'enemy';
  image: string | null;
  hp: { current: number; max: number };
  ownerId: string | null;
  kind: 'pc' | 'npc';
}

export interface InitiativeEntry {
  id: string;
  name: string;
  value: number;
  tokenId: string | null;
  hp: number | null;
  maxHp: number | null;
  characterId: string | null;
}

export interface ChatMessage {
  id: string;
  type: 'msg' | 'roll' | 'system';
  who: string;
  text: string;
  detail?: string;
  total?: number;
  tone?: 'normal' | 'crit' | 'fail';
  at: number;
}

export interface Handout {
  id: string;
  title: string;
  text: string;
  at: number;
}

export interface RoomState {
  code: string;
  name: string;
  map: {
    image: string | null;
    width: number;
    height: number;
    gridSize: number;
    showGrid: boolean;
    title: string;
  };
  tokens: RoomToken[];
  initiative: { order: InitiativeEntry[]; turn: number; round: number; active: boolean };
  chat: ChatMessage[];
  handouts: Handout[];
  integration?: { vortexUrl: string };
  players: RoomPlayer[];
}

export interface SavedRoom {
  code: string;
  key: string;
  name: string;
  at: number;
}

const SAVED_KEY = 'dnd-companion:rooms';

export function loadSavedRooms(): SavedRoom[] {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const list = raw ? (JSON.parse(raw) as SavedRoom[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveRoom(room: SavedRoom) {
  const list = loadSavedRooms().filter((r) => r.code !== room.code);
  localStorage.setItem(SAVED_KEY, JSON.stringify([room, ...list].slice(0, 12)));
}

export function removeSavedRoom(code: string) {
  localStorage.setItem(SAVED_KEY, JSON.stringify(loadSavedRooms().filter((r) => r.code !== code)));
}

export function getRoomKey(code: string): string {
  return loadSavedRooms().find((r) => r.code === code)?.key ?? '';
}

export function wsUrl(code: string, name: string, key: string): string {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const params = new URLSearchParams({ code, name, key });
  return `${proto}://${window.location.host}/ws?${params.toString()}`;
}

export async function fetchRoomInfo(code: string): Promise<{ exists: boolean; name?: string; players?: number }> {
  const res = await fetch(`/api/rooms/${encodeURIComponent(code)}`);
  if (!res.ok) return { exists: false };
  return (await res.json()) as { exists: boolean; name?: string; players?: number };
}

export async function createRoom(name: string, gmName: string): Promise<{ code: string; key: string; name: string }> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, gmName }),
  });
  if (!res.ok) throw new Error('Не удалось создать комнату');
  return (await res.json()) as { code: string; key: string; name: string };
}
