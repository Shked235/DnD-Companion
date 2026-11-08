import type { AbilityId, AbilityScores, SkillId } from '../../data/types';

export const ABILITIES: { id: AbilityId; name: string; short: string; nameEn: string }[] = [
  { id: 'str', name: 'Сила', short: 'СИЛ', nameEn: 'Strength' },
  { id: 'dex', name: 'Ловкость', short: 'ЛОВ', nameEn: 'Dexterity' },
  { id: 'con', name: 'Телосложение', short: 'ТЕЛ', nameEn: 'Constitution' },
  { id: 'int', name: 'Интеллект', short: 'ИНТ', nameEn: 'Intelligence' },
  { id: 'wis', name: 'Мудрость', short: 'МДР', nameEn: 'Wisdom' },
  { id: 'cha', name: 'Харизма', short: 'ХАР', nameEn: 'Charisma' },
];

export const ABILITY_LABEL: Record<AbilityId, string> = {
  str: 'Сила',
  dex: 'Ловкость',
  con: 'Телосложение',
  int: 'Интеллект',
  wis: 'Мудрость',
  cha: 'Харизма',
};

export const SKILLS: { id: SkillId; name: string; nameEn: string; ability: AbilityId }[] = [
  { id: 'acrobatics', name: 'Акробатика', nameEn: 'Acrobatics', ability: 'dex' },
  { id: 'animal', name: 'Обращение с животными', nameEn: 'Animal Handling', ability: 'wis' },
  { id: 'arcana', name: 'Магия', nameEn: 'Arcana', ability: 'int' },
  { id: 'athletics', name: 'Атлетика', nameEn: 'Athletics', ability: 'str' },
  { id: 'deception', name: 'Обман', nameEn: 'Deception', ability: 'cha' },
  { id: 'history', name: 'История', nameEn: 'History', ability: 'int' },
  { id: 'insight', name: 'Проницательность', nameEn: 'Insight', ability: 'wis' },
  { id: 'intimidation', name: 'Запугивание', nameEn: 'Intimidation', ability: 'cha' },
  { id: 'investigation', name: 'Анализ', nameEn: 'Investigation', ability: 'int' },
  { id: 'medicine', name: 'Медицина', nameEn: 'Medicine', ability: 'wis' },
  { id: 'nature', name: 'Природа', nameEn: 'Nature', ability: 'int' },
  { id: 'perception', name: 'Внимательность', nameEn: 'Perception', ability: 'wis' },
  { id: 'performance', name: 'Выступление', nameEn: 'Performance', ability: 'cha' },
  { id: 'persuasion', name: 'Убеждение', nameEn: 'Persuasion', ability: 'cha' },
  { id: 'religion', name: 'Религия', nameEn: 'Religion', ability: 'int' },
  { id: 'sleight', name: 'Ловкость рук', nameEn: 'Sleight of Hand', ability: 'dex' },
  { id: 'stealth', name: 'Скрытность', nameEn: 'Stealth', ability: 'dex' },
  { id: 'survival', name: 'Выживание', nameEn: 'Survival', ability: 'wis' },
];

export const SKILL_LABEL = Object.fromEntries(SKILLS.map((s) => [s.id, s.name])) as Record<
  SkillId,
  string
>;

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export const POINT_BUY_TOTAL = 27;

/** Стоимость значения при покупке за очки (стоимость самого значения). */
export function pointBuyCost(score: number): number {
  if (score <= 8) return 0;
  if (score <= 13) return score - 8;
  if (score === 14) return 7;
  if (score === 15) return 9;
  return Infinity;
}

export function pointBuySum(scores: AbilityScores): number {
  return ABILITIES.reduce((sum, a) => sum + pointBuyCost(scores[a.id]), 0);
}

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function formatMod(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/** Бонус владения: +2 на 1–4, +3 на 5–8, +4 на 9–12, +5 на 13–16, +6 на 17–20. */
export function proficiencyBonus(level: number): number {
  const lvl = Math.max(1, Math.min(20, Math.floor(level)));
  return 2 + Math.floor((lvl - 1) / 4);
}

export function clampLevel(level: number): number {
  return Math.max(1, Math.min(20, Math.round(level)));
}

export const XP_THRESHOLDS: number[] = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000,
  165000, 195000, 225000, 265000, 305000, 355000,
];

export function levelFromXp(xp: number): number {
  let lvl = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) lvl = i + 1;
  }
  return lvl;
}

export function xpForNextLevel(level: number): number | null {
  if (level >= 20) return null;
  return XP_THRESHOLDS[level];
}

/* ---------- кости ---------- */

export interface DiceTerm {
  count: number;
  sides: number;
  sign: 1 | -1;
}

export interface ParsedDice {
  terms: DiceTerm[];
  constant: number;
}

const DICE_RE = /([+-]?)\s*(?:(\d*)\s*d\s*(\d+)|(\d+))/gi;

export function parseDice(expression: string): ParsedDice {
  const terms: DiceTerm[] = [];
  let constant = 0;
  let matched = false;
  const cleaned = expression.replace(/\s+/g, ' ').trim();
  if (!cleaned) return { terms, constant };
  DICE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = DICE_RE.exec(cleaned))) {
    matched = true;
    const sign: 1 | -1 = match[1] === '-' ? -1 : 1;
    if (match[3] !== undefined) {
      const count = match[2] === '' || match[2] === undefined ? 1 : parseInt(match[2], 10);
      const sides = parseInt(match[3], 10);
      if (count > 0 && sides > 0) terms.push({ count, sides, sign });
    } else if (match[4] !== undefined) {
      constant += sign * parseInt(match[4], 10);
    }
  }
  if (!matched) throw new Error(`Не удалось разобрать формулу броска: «${expression}»`);
  return { terms, constant };
}

export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rollDie(sides: number, rng: Rng = Math.random): number {
  return Math.floor(rng() * sides) + 1;
}

export interface DiceRollResult {
  total: number;
  constant: number;
  groups: { count: number; sides: number; rolls: number[]; sign: 1 | -1 }[];
  text: string;
}

export function rollDice(expression: string, rng: Rng = Math.random): DiceRollResult {
  const parsed = parseDice(expression);
  let total = parsed.constant;
  const groups: DiceRollResult['groups'] = [];
  for (const term of parsed.terms) {
    const rolls: number[] = [];
    for (let i = 0; i < term.count; i++) rolls.push(rollDie(term.sides, rng));
    const sum = rolls.reduce((a, b) => a + b, 0);
    total += term.sign * sum;
    groups.push({ count: term.count, sides: term.sides, rolls, sign: term.sign });
  }
  const diceText = groups
    .map((g) => `${g.sign < 0 ? '−' : ''}${g.rolls.join('+') || '0'}`)
    .join(' ');
  const constText =
    parsed.constant !== 0 ? ` ${parsed.constant > 0 ? '+' : '−'} ${Math.abs(parsed.constant)}` : '';
  return {
    total,
    constant: parsed.constant,
    groups,
    text: groups.length ? `${diceText}${constText}` : `${parsed.constant}`,
  };
}

export type Advantage = 'none' | 'adv' | 'dis';

export interface CheckResult {
  total: number;
  die: number;
  rolls: number[];
  mod: number;
  advantage: Advantage;
  crit: boolean;
  critFail: boolean;
  dc?: number;
  success?: boolean;
}

export function rollCheck(
  mod: number,
  options: { advantage?: Advantage; dc?: number; rng?: Rng } = {},
): CheckResult {
  const { advantage = 'none', dc, rng = Math.random } = options;
  const count = advantage === 'none' ? 1 : 2;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) rolls.push(rollDie(20, rng));
  const die =
    advantage === 'adv' ? Math.max(...rolls) : advantage === 'dis' ? Math.min(...rolls) : rolls[0];
  const total = die + mod;
  return {
    total,
    die,
    rolls,
    mod,
    advantage,
    crit: die === 20,
    critFail: die === 1,
    dc,
    success: dc === undefined ? undefined : total >= dc,
  };
}

/** Спасбросок от урона/эффекта со сл (DC). */
export function damageAfterSave(
  damage: number,
  result: { success?: boolean } | null,
  mode: 'half' | 'none' = 'half',
): number {
  if (!result || result.success === undefined) return damage;
  if (!result.success) return damage;
  return mode === 'half' ? Math.floor(damage / 2) : 0;
}
