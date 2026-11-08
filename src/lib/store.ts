import { useSyncExternalStore } from 'react';
import type { Character } from '../data/types';

export interface Profile {
  id: string;
  name: string;
}

export interface AppState {
  profile: Profile;
  characters: Character[];
}

const STORAGE_KEY = 'dnd-companion:v1';

function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function defaultState(): AppState {
  return {
    profile: { id: makeId('usr'), name: 'Странник' },
    characters: [],
  };
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = defaultState();
    return {
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
      characters: Array.isArray(parsed.characters) ? (parsed.characters as Character[]) : [],
    };
  } catch {
    return defaultState();
  }
}

let state: AppState = typeof localStorage === 'undefined' ? defaultState() : load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Не удалось сохранить данные локально', error);
  }
}

function commit(next: AppState) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function getState(): AppState {
  return state;
}

export function useCharacter(id: string | undefined): Character | undefined {
  const s = useAppState();
  return id ? s.characters.find((c) => c.id === id) : undefined;
}

export const store = {
  setProfileName(name: string) {
    commit({ ...state, profile: { ...state.profile, name: name.trim() || 'Странник' } });
  },
  addCharacter(character: Character) {
    commit({ ...state, characters: [character, ...state.characters] });
    return character;
  },
  updateCharacter(character: Character) {
    const next = { ...character, updatedAt: Date.now() };
    commit({
      ...state,
      characters: state.characters.map((c) => (c.id === next.id ? next : c)),
    });
    return next;
  },
  removeCharacter(id: string) {
    commit({ ...state, characters: state.characters.filter((c) => c.id !== id) });
  },
  importCharacter(character: Character) {
    const copy: Character = {
      ...character,
      id: makeId('ch'),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    commit({ ...state, characters: [copy, ...state.characters] });
    return copy;
  },
  replaceAll(next: Character[]) {
    commit({ ...state, characters: next });
  },
};

export function newId(prefix: string): string {
  return makeId(prefix);
}
