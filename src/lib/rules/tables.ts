/** Таблицы прогрессии D&D 5e (2024). */

/** Ячейки полного заклинателя по уровням персонажа: [уровень 1..9]. */
export const FULL_CASTER_SLOTS: number[][] = [
  [2, 0, 0, 0, 0, 0, 0, 0, 0],
  [3, 0, 0, 0, 0, 0, 0, 0, 0],
  [4, 2, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 0, 0, 0, 0, 0, 0, 0],
  [4, 3, 2, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 0, 0, 0, 0, 0, 0],
  [4, 3, 3, 1, 0, 0, 0, 0, 0],
  [4, 3, 3, 2, 0, 0, 0, 0, 0],
  [4, 3, 3, 3, 1, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 0, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 0, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 0, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 0],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
];

/** Колдун: [количество ячеек, уровень ячеек] по уровням персонажа. */
export const PACT_MAGIC: { slots: number; level: number }[] = [
  { slots: 1, level: 1 },
  { slots: 2, level: 1 },
  { slots: 2, level: 2 },
  { slots: 2, level: 2 },
  { slots: 2, level: 3 },
  { slots: 2, level: 3 },
  { slots: 2, level: 4 },
  { slots: 2, level: 4 },
  { slots: 2, level: 5 },
  { slots: 2, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 3, level: 5 },
  { slots: 4, level: 5 },
  { slots: 4, level: 5 },
  { slots: 4, level: 5 },
  { slots: 4, level: 5 },
];

/** Мистический арканум колдуна: уровень персонажа → уровень заклинания. */
export const MYSTIC_ARCANUM: Record<number, number> = { 11: 6, 13: 7, 15: 8, 17: 9 };

export function fullCasterSlots(level: number): number[] {
  const idx = Math.max(1, Math.min(20, Math.round(level))) - 1;
  return [...FULL_CASTER_SLOTS[idx]];
}

/** Полузаклинатели (паладин, следопыт): уровень заклинателя = ceil(уровень / 2). */
export function halfCasterSlots(level: number): number[] {
  const casterLevel = Math.ceil(Math.max(1, Math.min(20, level)) / 2);
  return fullCasterSlots(casterLevel);
}

export function pactMagic(level: number): { slots: number; level: number } {
  const idx = Math.max(1, Math.min(20, Math.round(level))) - 1;
  return { ...PACT_MAGIC[idx] };
}

export function mysticArcanumLevels(level: number): number[] {
  return Object.entries(MYSTIC_ARCANUM)
    .filter(([lvl]) => Number(lvl) <= level)
    .map(([, spellLevel]) => spellLevel);
}

export function averageHitPoints(hitDie: number): number {
  return Math.floor(hitDie / 2) + 1;
}

export function spellSlotsFor(progression: string | undefined, level: number): number[] {
  if (progression === 'full') return fullCasterSlots(level);
  if (progression === 'half') return halfCasterSlots(level);
  return new Array(9).fill(0);
}
