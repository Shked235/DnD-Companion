import { BACKGROUNDS } from './backgrounds';
import { MONSTERS } from './bestiary';
import { CLASSES } from './classes';
import { ITEMS } from './equipment';
import { FEATS } from './feats';
import { GLOSSARY } from './glossary';
import { MAGIC_ITEMS } from './magicItems';
import { SPECIES } from './species';
import { SPELLS } from './spells';
import type {
  Background,
  DnDClass,
  Feat,
  GlossaryEntry,
  Item,
  MagicItem,
  Monster,
  Species,
  Spell,
} from './types';

export type {
  Background,
  DnDClass,
  Feat,
  GlossaryEntry,
  Item,
  MagicItem,
  Monster,
  Species,
  Spell,
} from './types';

export { BACKGROUNDS, MONSTERS, CLASSES, ITEMS, FEATS, GLOSSARY, MAGIC_ITEMS, SPECIES, SPELLS };

export type CompendiumCategoryId =
  | 'classes'
  | 'species'
  | 'backgrounds'
  | 'feats'
  | 'spells'
  | 'equipment'
  | 'magic-items'
  | 'bestiary'
  | 'conditions'
  | 'rules';

export interface CompendiumCategory {
  id: CompendiumCategoryId;
  label: string;
  short: string;
  description: string;
  group: 'Правила' | 'Снаряжение' | 'Мир' | 'Глоссарий';
}

export const CATEGORIES: CompendiumCategory[] = [
  { id: 'classes', label: 'Классы', short: 'Классы', description: '12 классов: кости хитов, владения, умения и подклассы.', group: 'Правила' },
  { id: 'species', label: 'Виды', short: 'Виды', description: 'Происхождение героя: размер, скорость и врождённые черты.', group: 'Правила' },
  { id: 'backgrounds', label: 'Предыстории', short: 'Предыстории', description: 'Кем герой был до приключений: характеристики, навыки и черта.', group: 'Правила' },
  { id: 'feats', label: 'Черты', short: 'Черты', description: 'Черты происхождения, общие, боевые стили и эпические дары.', group: 'Правила' },
  { id: 'spells', label: 'Заклинания', short: 'Заклинания', description: 'Заговоры и заклинания 1–9 уровней с фильтрами по школе и классу.', group: 'Правила' },
  { id: 'equipment', label: 'Снаряжение', short: 'Снаряжение', description: 'Оружие с мастерством, доспехи, щиты и походные принадлежности.', group: 'Снаряжение' },
  { id: 'magic-items', label: 'Магические предметы', short: 'Предметы', description: 'Редкость, настройка и механика волшебных вещей.', group: 'Снаряжение' },
  { id: 'bestiary', label: 'Бестиарий', short: 'Бестиарий', description: 'Готовые блоки характеристик от гоблина до древнего дракона.', group: 'Мир' },
  { id: 'conditions', label: 'Состояния', short: 'Состояния', description: '15 состояний и их точные механические последствия.', group: 'Глоссарий' },
  { id: 'rules', label: 'Правила', short: 'Правила', description: 'Действия в бою, отдых, концентрация, укрытие и другие ключевые правила.', group: 'Глоссарий' },
];

export const CLASS_MAP = new Map(CLASSES.map((c) => [c.id, c]));
export const SPECIES_MAP = new Map(SPECIES.map((s) => [s.id, s]));
export const BACKGROUND_MAP = new Map(BACKGROUNDS.map((b) => [b.id, b]));
export const FEAT_MAP = new Map(FEATS.map((f) => [f.id, f]));
export const SPELL_MAP = new Map(SPELLS.map((s) => [s.id, s]));
export const ITEM_MAP = new Map(ITEMS.map((i) => [i.id, i]));
export const MAGIC_ITEM_MAP = new Map(MAGIC_ITEMS.map((m) => [m.id, m]));
export const MONSTER_MAP = new Map(MONSTERS.map((m) => [m.id, m]));
export const GLOSSARY_MAP = new Map(GLOSSARY.map((g) => [g.id, g]));

export const getClass = (id: string): DnDClass | undefined => CLASS_MAP.get(id);
export const getSpecies = (id: string): Species | undefined => SPECIES_MAP.get(id);
export const getBackground = (id: string): Background | undefined => BACKGROUND_MAP.get(id);
export const getFeat = (id: string): Feat | undefined => FEAT_MAP.get(id);
export const getSpell = (id: string): Spell | undefined => SPELL_MAP.get(id);
export const getItem = (id: string): Item | undefined => ITEM_MAP.get(id);
export const getMagicItem = (id: string): MagicItem | undefined => MAGIC_ITEM_MAP.get(id);
export const getMonster = (id: string): Monster | undefined => MONSTER_MAP.get(id);
export const getGlossaryEntry = (id: string): GlossaryEntry | undefined => GLOSSARY_MAP.get(id);

export interface CompendiumEntry {
  id: string;
  category: CompendiumCategoryId;
  name: string;
  nameEn: string;
  summary: string;
  tags: string[];
  meta: string[];
  searchText: string;
}

const normalize = (value: string) => value.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();

function makeEntry(
  category: CompendiumCategoryId,
  item: { id: string; name: string; nameEn: string },
  summary: string,
  tags: string[],
  meta: string[],
): CompendiumEntry {
  return {
    id: item.id,
    category,
    name: item.name,
    nameEn: item.nameEn,
    summary,
    tags,
    meta,
    searchText: normalize([item.name, item.nameEn, summary, ...tags, ...meta].join(' ')),
  };
}

let cache: CompendiumEntry[] | null = null;

export function allEntries(): CompendiumEntry[] {
  if (cache) return cache;
  const list: CompendiumEntry[] = [];
  for (const c of CLASSES)
    list.push(makeEntry('classes', c, c.description, c.tags ?? [], [`Кость хитов: d${c.hitDie}`, `Подклассов: ${c.subclasses.length}`]));
  for (const s of SPECIES)
    list.push(makeEntry('species', s, s.description, s.tags ?? [], [s.size, `Скорость ${s.speed} фт.`]));
  for (const b of BACKGROUNDS)
    list.push(makeEntry('backgrounds', b, b.description, b.tags ?? [], [b.tool]));
  for (const f of FEATS)
    list.push(makeEntry('feats', f, f.description, f.tags ?? [], [f.category]));
  for (const s of SPELLS)
    list.push(
      makeEntry(
        'spells',
        s,
        s.description,
        s.tags ?? [],
        [s.level === 0 ? 'Заговор' : `${s.level} ур.`, s.school, ...s.classes.map((c) => CLASS_MAP.get(c)?.name ?? c)],
      ),
    );
  for (const i of ITEMS)
    list.push(
      makeEntry(
        'equipment',
        i,
        i.description ?? [i.damage ? `${i.damage} ${i.damageType ?? ''}` : '', i.acBase ? `КД ${i.acBase}` : '', i.properties?.join(', ') ?? ''].filter(Boolean).join(' · '),
        i.tags ?? [],
        [i.kind === 'weapon' ? 'Оружие' : i.kind === 'armor' ? 'Доспех' : i.kind === 'shield' ? 'Щит' : 'Снаряжение', i.cost ?? ''],
      ),
    );
  for (const m of MAGIC_ITEMS)
    list.push(makeEntry('magic-items', m, m.description, m.tags ?? [], [m.rarity, m.attunement ? 'Требует настройки' : 'Без настройки']));
  for (const m of MONSTERS)
    list.push(makeEntry('bestiary', m, m.description ?? m.type, m.tags ?? [], [`CR ${m.cr}`, m.type]));
  for (const g of GLOSSARY)
    list.push(makeEntry(g.category === 'Состояние' ? 'conditions' : 'rules', g, g.description, g.tags ?? [], [g.category]));
  cache = list;
  return list;
}

export function entriesByCategory(category: CompendiumCategoryId): CompendiumEntry[] {
  return allEntries().filter((e) => e.category === category);
}

export function categoryCount(category: CompendiumCategoryId): number {
  return entriesByCategory(category).length;
}

export function searchEntries(query: string, category?: CompendiumCategoryId): CompendiumEntry[] {
  const q = normalize(query);
  const pool = category ? entriesByCategory(category) : allEntries();
  if (!q) return pool;
  const words = q.split(' ').filter(Boolean);
  return pool
    .map((entry) => {
      let score = 0;
      const name = normalize(entry.name);
      const nameEn = normalize(entry.nameEn);
      for (const w of words) {
        if (name === w || nameEn === w) score += 12;
        else if (name.startsWith(w) || nameEn.startsWith(w)) score += 8;
        else if (name.includes(w) || nameEn.includes(w)) score += 5;
        else if (entry.searchText.includes(w)) score += 2;
        else score -= 20;
      }
      return { entry, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name, 'ru'))
    .map((r) => r.entry);
}

/** Название класса по id — для списков заклинаний. */
export function classNames(ids: string[]): string[] {
  return ids.map((id) => CLASS_MAP.get(id)?.name ?? id);
}
