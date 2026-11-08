import type {
  AbilityId,
  AbilityScores,
  AttackEntry,
  Character,
  DnDClass,
  DerivedCharacter,
  DerivedSkill,
  InventoryItem,
  Item,
  SkillId,
  Species,
} from '../../data/types';
import { getBackground, getClass, getItem, getSpecies } from '../../data';
import {
  ABILITIES,
  SKILLS,
  abilityMod,
  clampLevel,
  formatMod,
  proficiencyBonus,
  rollDie,
  xpForNextLevel,
  type Rng,
} from './core';
import {
  averageHitPoints,
  mysticArcanumLevels,
  pactMagic,
  spellSlotsFor,
} from './tables';

export const ZERO_SCORES: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

export function createEmptyCharacter(overrides: Partial<Character> = {}): Character {
  const now = Date.now();
  return {
    id: `ch_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    level: 1,
    classes: [{ classId: 'fighter', level: 1 }],
    speciesId: 'human',
    backgroundId: 'soldier',
    abilities: { ...ZERO_SCORES },
    abilityMethod: 'standard',
    skillProfs: {},
    hp: { current: 0, max: 0, temp: 0 },
    hpBonus: 0,
    hitDiceSpent: 0,
    inventory: [],
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    extraAttacks: [],
    spells: { known: [], prepared: [], slotsUsed: {}, pactUsed: 0, arcanumUsed: [] },
    features: [],
    conditions: [],
    exhaustion: 0,
    deathSaves: { success: 0, failure: 0 },
    notes: '',
    appearance: '',
    backstory: '',
    xp: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export interface CreateCharacterOptions {
  name: string;
  speciesId: string;
  classId: string;
  backgroundId?: string;
  level?: number;
  abilities: AbilityScores;
  skillProfs: Partial<Record<SkillId, 1 | 2>>;
  inventory?: InventoryItem[];
  spells?: { known: string[]; prepared: string[] };
  coins?: Character['coins'];
}

export function createCharacter(options: CreateCharacterOptions): Character {
  const level = clampLevel(options.level ?? 1);
  const base = createEmptyCharacter({
    name: options.name.trim() || 'Безымянный герой',
    speciesId: options.speciesId,
    backgroundId: options.backgroundId,
    level,
    classes: [{ classId: options.classId, level }],
    abilities: { ...options.abilities },
    skillProfs: { ...options.skillProfs },
    inventory: options.inventory ?? [],
    coins: options.coins ?? { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    spells: {
      known: options.spells?.known ?? [],
      prepared: options.spells?.prepared ?? options.spells?.known ?? [],
      slotsUsed: {},
      pactUsed: 0,
      arcanumUsed: [],
    },
  });
  const withFeatures = syncClassFeatures(base);
  return recalcMaxHp(withFeatures, true);
}

export function getPrimaryClass(ch: Character) {
  const primary = ch.classes[0];
  return primary ? getClass(primary.classId) : undefined;
}

export function totalLevel(ch: Character): number {
  const sum = ch.classes.reduce((acc, c) => acc + c.level, 0);
  return clampLevel(sum || ch.level || 1);
}

export function hpPerLevelDie(hitDie: number, conMod: number): number {
  return Math.max(1, averageHitPoints(hitDie) + conMod);
}

export function suggestedMaxHp(ch: Character): number {
  let total = 0;
  for (const cls of ch.classes) {
    const info = getClass(cls.classId);
    if (!info) continue;
    const conMod = abilityMod(ch.abilities.con);
    total += info.hitDie + conMod;
    for (let lvl = 2; lvl <= cls.level; lvl++) {
      total += hpPerLevelDie(info.hitDie, conMod);
    }
  }
  return Math.max(1, total) + (ch.hpBonus ?? 0);
}

/** Пересчитывает максимум ХП; при healDelta=true добивает текущее ХП до нового максимума. */
export function recalcMaxHp(ch: Character, healDelta = false): Character {
  const max = suggestedMaxHp(ch);
  const current = healDelta ? max : Math.min(ch.hp.current || max, max);
  return { ...ch, hp: { ...ch.hp, max, current } };
}

/** Добавляет в лист умения класса по текущему уровню (без дублей). */
export function syncClassFeatures(ch: Character): Character {
  const existing = new Map(ch.features.map((f) => [`${f.source}:${f.name}`, f]));
  const features = [...ch.features];
  for (const cls of ch.classes) {
    const info = getClass(cls.classId);
    if (!info) continue;
    for (const feature of info.features) {
      if (feature.level > cls.level) continue;
      const key = `${info.name}:${feature.name}`;
      if (existing.has(key)) continue;
      const entry = {
        id: `ft_${info.id}_${feature.level}_${feature.name.replace(/\s+/g, '_')}`,
        name: feature.name,
        source: `${info.name} ${feature.level}`,
        text: feature.text ?? '',
      };
      existing.set(key, entry);
      features.push(entry);
    }
  }
  return { ...ch, features };
}

/* ---------- производные значения ---------- */

export function armorClass(ch: Character, dexMod: number): { ac: number; source: string } {
  const equipped = ch.inventory.filter((i) => i.equipped);
  let base = 10 + dexMod;
  let source = 'Без брони';
  let shield = 0;

  for (const inv of equipped) {
    const item = inv.itemId ? getItem(inv.itemId) : undefined;
    if (!item) continue;
    if (item.kind === 'shield') {
      shield += item.acBase ?? 2;
      continue;
    }
    if (item.kind === 'armor' && typeof item.acBase === 'number') {
      const cap =
        item.armorType === 'heavy' ? 0 : item.acDexMax ?? (item.armorType === 'medium' ? 2 : 99);
      const dexPart = item.armorType === 'heavy' ? 0 : Math.min(dexMod, cap);
      base = item.acBase + dexPart;
      source = item.name;
    }
  }
  if (shield > 0) source = source === 'Без брони' ? `Щит +${shield}` : `${source} + щит`;
  return { ac: base + shield, source };
}

export function weaponAbility(item: Item, scores: AbilityScores): AbilityId {
  const props = (item.properties ?? []).join(' ').toLowerCase();
  const strMod = abilityMod(scores.str);
  const dexMod = abilityMod(scores.dex);
  if (props.includes('дальнобойное')) return 'dex';
  if (props.includes('фехтовальное')) return dexMod >= strMod ? 'dex' : 'str';
  return 'str';
}

export function isProficientWithWeapon(ch: Character, item: Item): boolean {
  const info = getPrimaryClass(ch);
  if (!info) return false;
  const training = info.weaponTraining.join(' ').toLowerCase();
  const tags = (item.tags ?? []).join(' ').toLowerCase();
  if (tags.includes('простое') && training.includes('простое')) return true;
  if (tags.includes('военное') && training.includes('военное')) return true;
  const name = item.name.toLowerCase();
  return info.weaponTraining.some((w) => w.length > 3 && name.includes(w.toLowerCase()));
}

export function resolveAttacks(ch: Character, prof: number): DerivedCharacter['attacks'] {
  const attacks: DerivedCharacter['attacks'] = [];
  for (const inv of ch.inventory) {
    if (!inv.equipped || !inv.itemId) continue;
    const item = getItem(inv.itemId);
    if (!item || item.kind !== 'weapon' || !item.damage) continue;
    const ability = weaponAbility(item, ch.abilities);
    const mod = abilityMod(ch.abilities[ability]);
    const proficient = isProficientWithWeapon(ch, item);
    const toHit = mod + (proficient ? prof : 0);
    const damage = `${item.damage}${mod !== 0 ? ` ${formatMod(mod)}` : ''}`;
    attacks.push({
      id: inv.id,
      name: inv.name || item.name,
      toHit,
      damage,
      damageType: item.damageType ?? '—',
      range: item.range,
      notes: [item.properties?.join(', '), item.mastery ? `мастерство: ${item.mastery}` : '']
        .filter(Boolean)
        .join(' · '),
      source: 'weapon',
    });
  }
  for (const extra of ch.extraAttacks) {
    const mod = extra.ability === 'none' ? 0 : abilityMod(ch.abilities[extra.ability]);
    attacks.push({
      id: extra.id,
      name: extra.name,
      toHit: mod + (extra.proficient ? prof : 0),
      damage: extra.damageDice ? `${extra.damageDice}${mod !== 0 ? ` ${formatMod(mod)}` : ''}` : '—',
      damageType: extra.damageType || '—',
      range: extra.range,
      notes: extra.notes,
      source: 'custom',
    });
  }
  return attacks;
}

export function deriveCharacter(ch: Character): DerivedCharacter {
  const classes: { info: DnDClass; level: number; subclass?: string }[] = [];
  for (const c of ch.classes) {
    const info = getClass(c.classId);
    if (info) classes.push({ info, level: c.level, subclass: c.subclass });
  }
  const primaryClass = classes[0]?.info ?? null;
  const level = totalLevel(ch);
  const profBonus = proficiencyBonus(level);
  const mods = {} as AbilityScores;
  for (const a of ABILITIES) mods[a.id] = abilityMod(ch.abilities[a.id] ?? 10);

  const saveProfs = new Set<AbilityId>(primaryClass?.saves ?? []);
  const saves = {} as DerivedCharacter['saves'];
  for (const a of ABILITIES) {
    saves[a.id] = { mod: mods[a.id] + (saveProfs.has(a.id) ? profBonus : 0), prof: saveProfs.has(a.id) };
  }

  const skills: DerivedSkill[] = SKILLS.map((s) => {
    const prof = (ch.skillProfs[s.id] ?? 0) as 0 | 1 | 2;
    const mod = mods[s.ability] + prof * profBonus;
    return { id: s.id, name: s.name, ability: s.ability, prof, mod, passive: 10 + mod };
  });

  const acInfo = armorClass(ch, mods.dex);
  const ac = typeof ch.acOverride === 'number' ? ch.acOverride : acInfo.ac;
  const species = getSpecies(ch.speciesId) ?? null;
  const background = ch.backgroundId ? getBackground(ch.backgroundId) ?? null : null;
  const hitDie = primaryClass?.hitDie ?? 8;
  const storedMax = ch.hp.max > 0 ? ch.hp.max : suggestedMaxHp(ch);

  const spellClass = classes.find((c) => c.info.spellcasting)?.info ?? null;
  const spellcasting = spellClass?.spellcasting
    ? (() => {
        const ability = spellClass.spellcasting!.ability;
        const mod = mods[ability];
        const progression = spellClass.spellcasting!.progression;
        const slots = spellSlotsFor(progression, level);
        const used = slots.map((_, idx) => Math.min(slots[idx], ch.spells.slotsUsed[idx + 1] ?? 0));
        const pact = progression === 'pact' ? pactMagic(level) : null;
        const arcanum = progression === 'pact' ? mysticArcanumLevels(level) : [];
        return {
          ability,
          dc: 8 + profBonus + mod,
          attack: profBonus + mod,
          slots,
          used,
          pact: pact ? { ...pact, used: ch.spells.pactUsed ?? 0 } : null,
          arcanum,
          arcanumUsed: ch.spells.arcanumUsed ?? [],
        };
      })()
    : null;

  const weight = ch.inventory.reduce((sum, i) => sum + (i.weight ?? 0) * (i.qty || 1), 0);
  const capacity = (ch.abilities.str || 10) * 15;

  return {
    classes,
    primaryClass,
    level,
    profBonus,
    mods,
    saves,
    skills,
    ac,
    acSource: ch.acOverride ? 'задано вручную' : acInfo.source,
    initiative: mods.dex + (ch.initiativeBonus ?? 0),
    passivePerception: 10 + (skills.find((s) => s.id === 'perception')?.mod ?? mods.wis),
    hpMax: storedMax,
    hitDie,
    speed: ch.speedOverride ?? species?.speed ?? 30,
    spellcasting,
    attacks: resolveAttacks(ch, profBonus),
    weapons: ch.inventory.filter((i) => {
      if (!i.itemId) return false;
      const item = getItem(i.itemId);
      return item?.kind === 'weapon';
    }),
    carrying: {
      weight: Math.round(weight * 10) / 10,
      capacity,
      pushDragLift: capacity * 2,
      encumbered: weight > capacity,
    },
    hitDiceTotal: level,
    hitDiceLeft: Math.max(0, level - (ch.hitDiceSpent ?? 0)),
    xpNext: xpForNextLevel(level),
    species,
    background,
  };
}

/* ---------- отдых, урон, состояния ---------- */

export function applyDamage(ch: Character, amount: number): Character {
  let remaining = Math.max(0, Math.floor(amount));
  const temp = ch.hp.temp ?? 0;
  const absorbed = Math.min(temp, remaining);
  remaining -= absorbed;
  const current = Math.max(0, ch.hp.current - remaining);
  return {
    ...ch,
    hp: { ...ch.hp, temp: temp - absorbed, current },
    updatedAt: Date.now(),
  };
}

export function applyHealing(ch: Character, amount: number): Character {
  return {
    ...ch,
    hp: { ...ch.hp, current: Math.min(ch.hp.max, ch.hp.current + Math.max(0, Math.floor(amount))) },
    updatedAt: Date.now(),
  };
}

export function shortRest(
  ch: Character,
  hitDiceToSpend: number,
  rng: Rng = Math.random,
): { character: Character; healed: number; spent: number } {
  const available = Math.max(0, totalLevel(ch) - (ch.hitDiceSpent ?? 0));
  const spend = Math.max(0, Math.min(Math.floor(hitDiceToSpend), available));
  const conMod = abilityMod(ch.abilities.con);
  const hitDie = getPrimaryClass(ch)?.hitDie ?? 8;
  let healed = 0;
  for (let i = 0; i < spend; i++) healed += Math.max(1, rollDie(hitDie, rng) + conMod);
  const next: Character = {
    ...ch,
    hitDiceSpent: (ch.hitDiceSpent ?? 0) + spend,
    hp: { ...ch.hp, current: Math.min(ch.hp.max, ch.hp.current + healed) },
    updatedAt: Date.now(),
  };
  return { character: next, healed, spent: spend };
}

export function longRest(ch: Character): Character {
  return {
    ...ch,
    hp: { current: ch.hp.max, max: ch.hp.max, temp: 0 },
    hitDiceSpent: 0,
    spells: { ...ch.spells, slotsUsed: {}, pactUsed: 0, arcanumUsed: [] },
    exhaustion: Math.max(0, (ch.exhaustion ?? 0) - 1),
    deathSaves: { success: 0, failure: 0 },
    conditions: ch.conditions,
    updatedAt: Date.now(),
  };
}

export function levelUp(
  ch: Character,
  method: 'average' | 'roll' = 'average',
  rng: Rng = Math.random,
): { character: Character; gainedFeatures: string[]; hpGain: number } {
  const level = totalLevel(ch);
  if (level >= 20) return { character: ch, gainedFeatures: [], hpGain: 0 };
  const primary = ch.classes[0];
  const info = getClass(primary.classId);
  if (!primary || !info) return { character: ch, gainedFeatures: [], hpGain: 0 };

  const conMod = abilityMod(ch.abilities.con);
  const die = info.hitDie;
  const hpGain = method === 'average' ? hpPerLevelDie(die, conMod) : Math.max(1, rollDie(die, rng) + conMod);

  const classes = ch.classes.map((c, idx) =>
    idx === 0 ? { ...c, level: c.level + 1 } : c,
  );
  const next: Character = {
    ...ch,
    level: level + 1,
    classes,
    hp: { ...ch.hp, max: ch.hp.max + hpGain, current: ch.hp.current + hpGain },
    updatedAt: Date.now(),
  };
  const before = new Set(ch.features.map((f) => f.name));
  const synced = syncClassFeatures(next);
  const gainedFeatures = synced.features.filter((f) => !before.has(f.name)).map((f) => f.name);
  return { character: synced, gainedFeatures, hpGain };
}

export function togglePrepared(ch: Character, spellId: string): Character {
  const prepared = ch.spells.prepared.includes(spellId)
    ? ch.spells.prepared.filter((id) => id !== spellId)
    : [...ch.spells.prepared, spellId];
  return { ...ch, spells: { ...ch.spells, prepared }, updatedAt: Date.now() };
}

export function spendSlot(ch: Character, level: number, amount = 1): Character {
  const used = { ...ch.spells.slotsUsed };
  used[level] = Math.max(0, (used[level] ?? 0) + amount);
  return { ...ch, spells: { ...ch.spells, slotsUsed: used }, updatedAt: Date.now() };
}

export function restoreSlot(ch: Character, level: number, amount = 1): Character {
  const used = { ...ch.spells.slotsUsed };
  used[level] = Math.max(0, (used[level] ?? 0) - amount);
  return { ...ch, spells: { ...ch.spells, slotsUsed: used }, updatedAt: Date.now() };
}

export function toggleCondition(ch: Character, conditionId: string): Character {
  const has = ch.conditions.some((c) => c.id === conditionId);
  const conditions = has
    ? ch.conditions.filter((c) => c.id !== conditionId)
    : [...ch.conditions, { id: conditionId }];
  return { ...ch, conditions, updatedAt: Date.now() };
}

export function xpProgress(ch: Character): { current: number; next: number | null; pct: number } {
  const level = totalLevel(ch);
  const curr = ch.xp ?? 0;
  const next = xpForNextLevel(level);
  const prev = level <= 1 ? 0 : xpLevelFloor(level - 1);
  const pct = next === null ? 100 : Math.max(0, Math.min(100, ((curr - prev) / (next - prev)) * 100));
  return { current: curr, next, pct };
}

function xpLevelFloor(level: number): number {
  const table = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
  return table[Math.max(0, Math.min(19, level - 1))];
}

export function speciesLabel(species: Species | null): string {
  return species ? species.name : '—';
}

export function makeInventoryItem(partial: Partial<InventoryItem> & { name: string }): InventoryItem {
  return {
    id: partial.id ?? `inv_${Math.random().toString(36).slice(2, 9)}`,
    name: partial.name,
    qty: partial.qty ?? 1,
    itemId: partial.itemId,
    weight: partial.weight,
    equipped: partial.equipped ?? false,
    notes: partial.notes,
  };
}

export function defaultAttack(): AttackEntry {
  return {
    id: `atk_${Math.random().toString(36).slice(2, 9)}`,
    name: 'Атака',
    ability: 'str',
    proficient: true,
    damageDice: '1d8',
    damageType: 'Рубящий',
    range: '5 фт.',
  };
}
