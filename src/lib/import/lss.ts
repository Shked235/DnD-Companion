import type { AbilityId, AbilityScores, Character, InventoryItem, SkillId } from '../../data/types';
import { BACKGROUNDS, CLASSES, ITEMS, SPELLS, SPECIES } from '../../data';
import { createCharacter, makeInventoryItem } from '../rules/character';

/* ------------------------------------------------------------------ */
/* Схема персонажа Long Story Short (публичный JSON листа)             */
/* ------------------------------------------------------------------ */

interface LssValue {
  value?: string | number;
}

export interface LssWeapon {
  id?: string;
  name?: LssValue;
  mod?: LssValue;
  dmg?: LssValue;
  ability?: string;
  isProf?: boolean;
}

export interface LssRaw {
  jsonType?: string;
  name?: LssValue;
  hiddenName?: string;
  info?: Record<string, LssValue>;
  stats?: Record<string, { score?: number; modifier?: number }>;
  abilities?: Record<string, { baseStat?: string; isProf?: boolean | number }>;
  skills?: Record<string, { baseStat?: string; isProf?: boolean | number }>;
  vitality?: Record<string, LssValue>;
  weaponsList?: LssWeapon[];
  text?: Record<string, { value?: { data?: string } }>;
  coins?: Record<string, LssValue>;
  spells?: Record<string, unknown>;
}

export function isLssCharacter(value: unknown): value is LssRaw {
  if (!value || typeof value !== 'object') return false;
  const raw = value as LssRaw;
  return raw.jsonType === 'character' && Boolean(raw.stats);
}

/** Достаёт персонажа из page-data.json (Gatsby) или из уже разобранного объекта. */
export function extractLssCharacter(
  json: unknown,
  gender: 'male' | 'female' = 'male',
): { raw: LssRaw; label?: string; url?: string } | null {
  if (!json || typeof json !== 'object') return null;
  if (isLssCharacter(json)) return { raw: json };

  const envelope = json as { raw?: unknown; label?: string; sourceUrl?: string };
  if (envelope.raw && isLssCharacter(envelope.raw)) {
    return { raw: envelope.raw, label: envelope.label, url: envelope.sourceUrl };
  }

  const page = (json as { result?: { pageContext?: Record<string, unknown> } }).result?.pageContext;
  if (!page) return null;
  const rawField = page.raw as Record<string, unknown> | undefined;
  if (!rawField) return null;
  const chosen = rawField[gender] ?? rawField.male ?? rawField.female;
  if (!chosen) return null;
  try {
    const parsed = typeof chosen === 'string' ? (JSON.parse(chosen) as LssRaw) : (chosen as LssRaw);
    if (!isLssCharacter(parsed)) return null;
    const character = page.character as { male?: string; female?: string } | undefined;
    return {
      raw: parsed,
      label: character?.[gender] ?? character?.male ?? character?.female,
    };
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Сопоставление справочников                                         */
/* ------------------------------------------------------------------ */

const CLASS_HINTS: [RegExp, string][] = [
  [/варвар/i, 'barbarian'],
  [/бард/i, 'bard'],
  [/жрец|клирик/i, 'cleric'],
  [/друид/i, 'druid'],
  [/воин|боец|файтер/i, 'fighter'],
  [/монах/i, 'monk'],
  [/паладин/i, 'paladin'],
  [/следопыт|рейнджер/i, 'ranger'],
  [/плут|вор/i, 'rogue'],
  [/чародей|сорк/i, 'sorcerer'],
  [/колдун|варлок/i, 'warlock'],
  [/волшебник|маг\b/i, 'wizard'],
];

const SPECIES_HINTS: [RegExp, string, string?][] = [
  [/полуэльф/i, 'elf', 'Полуэльфы в правилах 2024 не выделены: выбран эльф, поправьте вид при желании.'],
  [/полуорк/i, 'orc', 'Полуорки в правилах 2024 не выделены: выбран орк.'],
  [/эльф|дроу|дроу/i, 'elf'],
  [/дварф|гном-дварф/i, 'dwarf'],
  [/гном/i, 'gnome'],
  [/полурослик|хоббит/i, 'halfling'],
  [/драконорожд|дракон/i, 'dragonborn'],
  [/голиаф/i, 'goliath'],
  [/орк/i, 'orc'],
  [/тифлинг/i, 'tiefling'],
  [/аасимар/i, 'aasimar'],
  [/человек|люди/i, 'human'],
];

const BACKGROUND_HINTS: [RegExp, string][] = [
  [/прислужник|акколит/i, 'acolyte'],
  [/гильдейск|ремесленник|мастеров/i, 'artisan'],
  [/шарлатан/i, 'charlatan'],
  [/преступник|криминал/i, 'criminal'],
  [/артист|развлечен/i, 'entertainer'],
  [/фермер/i, 'farmer'],
  [/стражник|стража/i, 'guard'],
  [/проводник/i, 'guide'],
  [/отшельник/i, 'hermit'],
  [/торговец|купец/i, 'merchant'],
  [/дворянин|знать/i, 'noble'],
  [/мудрец|книжник/i, 'sage'],
  [/моряк|sailor/i, 'sailor'],
  [/писарь|переписчик/i, 'scribe'],
  [/солдат|военный/i, 'soldier'],
  [/странник|скиталец/i, 'wayfarer'],
];

const SKILL_KEYS: Record<string, SkillId> = {
  acrobatics: 'acrobatics',
  investigation: 'investigation',
  athletics: 'athletics',
  perception: 'perception',
  survival: 'survival',
  performance: 'performance',
  intimidation: 'intimidation',
  history: 'history',
  'sleight of hand': 'sleight',
  arcana: 'arcana',
  medicine: 'medicine',
  deception: 'deception',
  nature: 'nature',
  insight: 'insight',
  religion: 'religion',
  stealth: 'stealth',
  persuasion: 'persuasion',
  'animal handling': 'animal',
};

function pickByHint<T extends { id: string; name: string }>(list: T[], value: string, hints: [RegExp, string][]): T | null {
  for (const [re, id] of hints) {
    if (re.test(value)) return list.find((entry) => entry.id === id) ?? null;
  }
  return null;
}

function abilityFromStat(name: string | undefined): AbilityId | 'none' {
  const key = (name ?? '').toLowerCase();
  if (['str', 'dex', 'con', 'int', 'wis', 'cha'].includes(key)) return key as AbilityId;
  return 'none';
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<\/(p|div|li|h\d|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseDamageType(text: string): string {
  const t = text.toLowerCase();
  if (/колющ/.test(t)) return 'Колющий';
  if (/рубящ/.test(t)) return 'Рубящий';
  if (/дробящ/.test(t)) return 'Дробящий';
  if (/огн/.test(t)) return 'Огонь';
  if (/холод|мороз/.test(t)) return 'Холод';
  if (/кислот/.test(t)) return 'Кислота';
  if (/электр|молни/.test(t)) return 'Электричество';
  if (/яд/.test(t)) return 'Яд';
  if (/некрот/.test(t)) return 'Некротический';
  if (/психич/.test(t)) return 'Психический';
  if (/силов/.test(t)) return 'Силовое';
  if (/излуч/.test(t)) return 'Излучение';
  return '—';
}

function parseDice(text: string): string | null {
  const normalized = text.replace(/[кК]/g, 'd');
  const match = normalized.match(/(\d+d\d+)(?:\s*([+-])\s*(\d+))?/i);
  if (!match) return null;
  return `${match[1]}${match[2] ? ` ${match[2]} ${match[3]}` : ''}`.replace(/\s+/g, ' ');
}

function numberFrom(value: string | number | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const match = value.replace(/,/g, '.').match(/-?\d+/);
  return match ? Number(match[0]) : null;
}

function findItemByName(name: string) {
  const clean = name.replace(/\*+/g, '').trim().toLowerCase();
  return ITEMS.find((item) => item.name.toLowerCase() === clean) ?? null;
}

/* ------------------------------------------------------------------ */
/* Преобразование в нашего персонажа                                  */
/* ------------------------------------------------------------------ */

export interface LssImportResult {
  character: Character;
  warnings: string[];
}

export function mapLssCharacter(raw: LssRaw, meta: { sourceUrl?: string; label?: string } = {}): LssImportResult {
  const warnings: string[] = [];
  const info = raw.info ?? {};
  const className = String(info.charClass?.value ?? '');
  const raceName = String(info.race?.value ?? '');
  const backgroundName = String(info.background?.value ?? '');
  const level = Math.max(1, Math.min(20, numberFrom(info.level?.value as string | number) ?? 1));

  const klass = pickByHint(CLASSES, className, CLASS_HINTS);
  if (!klass) warnings.push(`Класс «${className || 'не указан'}» не распознан — выбран воин, поправьте на листе.`);

  let species = pickByHint(
    SPECIES,
    raceName,
    SPECIES_HINTS.map(([re, id]) => [re, id] as [RegExp, string]),
  );
  const speciesHint = SPECIES_HINTS.find(([re]) => re.test(raceName));
  if (speciesHint?.[2]) warnings.push(speciesHint[2]);
  if (!species) {
    species = SPECIES.find((s) => s.id === 'human') ?? null;
    warnings.push(`Вид «${raceName || 'не указан'}» не распознан — выбран человек.`);
  }

  const background = pickByHint(BACKGROUNDS, backgroundName, BACKGROUND_HINTS);
  if (!background) {
    warnings.push(`Предыстория «${backgroundName || 'не указана'}» не распознана — бонусы предыстории не применены.`);
  }

  const abilities: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha'] as AbilityId[]) {
    const score = raw.stats?.[key]?.score;
    if (typeof score === 'number') abilities[key] = score;
  }

  const skillProfs: Partial<Record<SkillId, 1 | 2>> = {};
  const skillSource = raw.abilities ?? raw.skills ?? {};
  for (const [key, value] of Object.entries(skillSource)) {
    const id = SKILL_KEYS[key.toLowerCase()];
    if (id && value.isProf) skillProfs[id] = 1;
  }

  const inventory: InventoryItem[] = [];
  const extraAttacks: Character['extraAttacks'] = [];
  for (const weapon of raw.weaponsList ?? []) {
    const name = String(weapon.name?.value ?? '').replace(/\*+/g, '').trim();
    if (!name) continue;
    const item = findItemByName(name);
    if (item) {
      inventory.push(
        makeInventoryItem({
          itemId: item.id,
          name: item.name,
          qty: 1,
          weight: item.weight ?? 0,
          equipped: true,
        }),
      );
      continue;
    }
    const damageText = String(weapon.dmg?.value ?? '');
    const dice = parseDice(damageText);
    if (!dice) {
      warnings.push(`Не удалось разобрать урон оружия «${name}»: ${damageText || 'нет данных'}.`);
      continue;
    }
    extraAttacks.push({
      id: `lss_atk_${extraAttacks.length}_${name.replace(/\s+/g, '_')}`,
      name,
      ability: abilityFromStat(weapon.ability),
      proficient: weapon.isProf !== false,
      damageDice: dice,
      damageType: parseDamageType(damageText),
      range: '5 фт.',
      notes: 'Импортировано из Long Story Short',
    });
  }

  const hp = numberFrom(raw.vitality?.['hp-max']?.value);
  const ac = numberFrom(raw.vitality?.ac?.value);
  const speed = numberFrom(raw.vitality?.speed?.value);

  const displayName =
    String(raw.name?.value ?? '').trim() || meta.label || `Персонаж LSS${level > 1 ? ` ${level} ур.` : ''}`;

  const character = createCharacter({
    name: displayName,
    speciesId: species?.id ?? 'human',
    classId: klass?.id ?? 'fighter',
    backgroundId: background?.id,
    level,
    abilities,
    skillProfs,
    inventory,
    coins: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  });

  // Монеты: LSS хранит их по кодам (gp/sp/cp) или по-русски.
  const coinMap: Record<string, keyof Character['coins']> = {
    pp: 'pp', gp: 'gp', ep: 'ep', sp: 'sp', cp: 'cp',
    'пм': 'pp', 'зм': 'gp', 'эм': 'ep', 'см': 'sp', 'мм': 'cp',
  };
  for (const [key, value] of Object.entries(raw.coins ?? {})) {
    const target = coinMap[key.toLowerCase()];
    const amount = numberFrom(value.value);
    if (target && amount !== null) character.coins[target] = amount;
  }

  // Умения из HTML-блока traits — как текстовые записи.
  const traitHtml = raw.text?.traits?.value?.data ?? '';
  const features: Character['features'] = [];
  if (traitHtml) {
    const paragraphs = traitHtml.split(/<\/p>/gi).map((p) => p.trim()).filter(Boolean);
    for (const paragraph of paragraphs) {
      const clean = stripHtml(paragraph).replace(/\s+/g, ' ').trim();
      if (!clean) continue;
      const leading = paragraph.match(/^\s*(?:<p[^>]*>\s*)?<strong>(.*?)<\/strong>/i);
      if (leading) {
        const name = stripHtml(leading[1]).replace(/[.:]$/, '').trim() || 'Умение (LSS)';
        features.push({
          id: `lss_ft_${features.length}_${name.replace(/\s+/g, '_').slice(0, 24)}`,
          name,
          source: 'Long Story Short',
          text: clean,
        });
      } else if (features.length) {
        features[features.length - 1].text += ` ${clean}`;
      } else {
        features.push({
          id: 'lss_ft_0_common',
          name: 'Умения (LSS)',
          source: 'Long Story Short',
          text: clean,
        });
      }
      if (features.length >= 14) break;
    }
  }

  const profText = stripHtml(raw.text?.prof?.value?.data ?? '');
  const equipmentText = stripHtml(raw.text?.equipment?.value?.data ?? '');
  const notesParts: string[] = [];
  if (meta.sourceUrl) notesParts.push(`Источник: ${meta.sourceUrl}`);
  notesParts.push('Импорт из Long Story Short (лист 2014). Проверьте расчёты по правилам 2024.');
  if (profText) notesParts.push(`Владения (LSS): ${profText}`);
  if (equipmentText) notesParts.push(`Снаряжение (LSS): ${equipmentText}`);

  const prepared = Object.keys(raw.spells ?? {}).filter((key) => /^spell/i.test(key));

  const result: Character = {
    ...character,
    hp: { current: hp ?? character.hp.max, max: hp ?? character.hp.max, temp: 0 },
    acOverride: ac,
    speedOverride: speed,
    extraAttacks,
    features: [
      ...character.features,
      ...features.filter(
        (feature) =>
          !character.features.some(
            (existing) => existing.name.toLowerCase() === feature.name.toLowerCase(),
          ),
      ),
    ],
    abilityMethod: 'manual',
    notes: notesParts.join('\n\n'),
    spells: {
      ...character.spells,
      known: prepared
        .map((name) => SPELLS.find((spell) => spell.name.toLowerCase() === name.toLowerCase())?.id)
        .filter((id): id is string => Boolean(id)),
    },
  };

  if (prepared.length && result.spells.known.length === 0) {
    warnings.push('Заклинания LSS перенесены не были: в их JSON нет списка заклинаний, только ячейки. Добавьте вручную на листе.');
  }
  if (hp === null) warnings.push('Хиты не найдены в файле — рассчитаны по классу и Телосложению.');
  if (ac === null) warnings.push('КД не найден — рассчитан по надетому снаряжению.');

  return { character: result, warnings };
}
