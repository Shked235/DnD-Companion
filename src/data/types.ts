// Типы данных справочника D&D 5e (2024) и персонажа.

export type AbilityId = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';

export type AbilityScores = Record<AbilityId, number>;

export type SkillId =
  | 'acrobatics'
  | 'animal'
  | 'arcana'
  | 'athletics'
  | 'deception'
  | 'history'
  | 'insight'
  | 'intimidation'
  | 'investigation'
  | 'medicine'
  | 'nature'
  | 'perception'
  | 'performance'
  | 'persuasion'
  | 'religion'
  | 'sleight'
  | 'stealth'
  | 'survival';

export type Size = 'Крошечный' | 'Маленький' | 'Средний' | 'Большой' | 'Огромный' | 'Громадный';

export interface Trait {
  name: string;
  text: string;
}

export interface Species {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  size: Size;
  speed: number;
  creatureType: string;
  darkvision?: number;
  traits: Trait[];
  lineages?: { name: string; text: string }[];
  tags?: string[];
}

export interface Background {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  /** Три характеристики на выбор: +2/+1 или +1/+1/+1 */
  abilities: AbilityId[];
  featId: string;
  skillIds: SkillId[];
  tool: string;
  equipment: string[];
  tags?: string[];
}

export type SpellSchool =
  | 'Воплощение'
  | 'Ограждение'
  | 'Вызов'
  | 'Прорицание'
  | 'Очарование'
  | 'Иллюзия'
  | 'Некромантия'
  | 'Преобразование';

export interface Spell {
  id: string;
  name: string;
  nameEn: string;
  level: number;
  school: SpellSchool;
  castingTime: string;
  range: string;
  components: string;
  duration: string;
  concentration?: boolean;
  ritual?: boolean;
  classes: string[];
  description: string;
  upcast?: string;
  tags?: string[];
  /** Урон/лечение для быстрого броска, напр. "8d6" */
  damage?: string;
  damageType?: string;
  savingThrow?: AbilityId;
  attackRoll?: boolean;
}

export type ArmorType = 'light' | 'medium' | 'heavy';

export type ItemKind = 'weapon' | 'armor' | 'shield' | 'gear' | 'tool' | 'focus' | 'ammunition' | 'pack';

export interface Item {
  id: string;
  name: string;
  nameEn: string;
  kind: ItemKind;
  cost?: string;
  weight?: number;
  description?: string;
  // оружие
  damage?: string;
  damageType?: string;
  properties?: string[];
  mastery?: string;
  range?: string;
  // броня
  armorType?: ArmorType;
  acBase?: number;
  acDexMax?: number | null;
  strReq?: number;
  stealthDisadv?: boolean;
  tags?: string[];
}

export interface MagicItem {
  id: string;
  name: string;
  nameEn: string;
  type: string;
  rarity: 'Обычный' | 'Необычный' | 'Редкий' | 'Очень редкий' | 'Легендарный' | 'Артефакт' | 'Варьируется';
  attunement: boolean;
  description: string;
  tags?: string[];
}

export interface Monster {
  id: string;
  name: string;
  nameEn: string;
  size: Size;
  type: string;
  cr: string;
  xp?: number;
  ac: number;
  hp: string;
  speeds: string;
  abilities: AbilityScores;
  saves?: string;
  skills?: string;
  senses?: string;
  languages?: string;
  traits?: Trait[];
  actions: Trait[];
  bonusActions?: Trait[];
  reactions?: Trait[];
  description?: string;
  tags?: string[];
}

export type FeatCategory = 'Происхождение' | 'Общая' | 'Боевой стиль' | 'Эпический дар';

export interface Feat {
  id: string;
  name: string;
  nameEn: string;
  category: FeatCategory;
  prerequisite?: string;
  repeatable?: boolean;
  description: string;
  tags?: string[];
}

export type GlossaryCategory =
  | 'Состояние'
  | 'Действие'
  | 'Бой'
  | 'Перемещение'
  | 'Отдых'
  | 'Заклинания'
  | 'Исследование'
  | 'Общие правила';

export interface GlossaryEntry {
  id: string;
  name: string;
  nameEn: string;
  category: GlossaryCategory;
  description: string;
  bullets?: string[];
  tags?: string[];
}

export type SpellProgression = 'full' | 'half' | 'pact' | 'none';

export interface ClassFeature {
  level: number;
  name: string;
  text?: string;
}

export interface DnDClass {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  hitDie: 6 | 8 | 10 | 12;
  primaryAbilities: AbilityId[];
  saves: AbilityId[];
  armorTraining: string[];
  weaponTraining: string[];
  toolTraining?: string[];
  skillChoices: { count: number; from: SkillId[] };
  spellcasting?: {
    ability: AbilityId;
    progression: SpellProgression;
    ritual?: boolean;
    focus?: string;
  };
  weaponMastery: number;
  startingEquipment: string[];
  gold: string;
  subclasses: { name: string; summary: string }[];
  subclassLevel: number;
  features: ClassFeature[];
  tags?: string[];
}

/* ---------- персонаж ---------- */

export interface InventoryItem {
  id: string;
  itemId?: string;
  name: string;
  qty: number;
  weight?: number;
  equipped?: boolean;
  notes?: string;
}

export interface AttackEntry {
  id: string;
  name: string;
  ability: AbilityId | 'none';
  proficient: boolean;
  damageDice: string;
  damageType: string;
  range?: string;
  notes?: string;
}

export interface FeatureEntry {
  id: string;
  name: string;
  source: string;
  text: string;
}

export interface CharacterClass {
  classId: string;
  level: number;
  subclass?: string;
}

export interface Character {
  id: string;
  name: string;
  playerName?: string;
  level: number;
  classes: CharacterClass[];
  speciesId: string;
  backgroundId?: string;
  abilities: AbilityScores;
  abilityMethod?: 'standard' | 'pointbuy' | 'roll' | 'manual';
  skillProfs: Partial<Record<SkillId, 1 | 2>>;
  hp: { current: number; max: number; temp: number };
  /** Прибавка к максимуму ХП от черт и предметов (например, «Крепкий»: +2 за уровень). */
  hpBonus?: number;
  hitDiceSpent: number;
  acOverride?: number | null;
  speedOverride?: number | null;
  initiativeBonus?: number;
  inventory: InventoryItem[];
  coins: { cp: number; sp: number; ep: number; gp: number; pp: number };
  extraAttacks: AttackEntry[];
  spells: {
    known: string[];
    prepared: string[];
    slotsUsed: Record<number, number>;
    pactUsed: number;
    arcanumUsed: number[];
  };
  features: FeatureEntry[];
  conditions: { id: string; level?: number }[];
  exhaustion: number;
  deathSaves: { success: number; failure: number };
  notes: string;
  appearance: string;
  backstory: string;
  xp: number;
  portrait?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ResolvedAttack {
  id: string;
  name: string;
  toHit: number;
  damage: string;
  damageType: string;
  range?: string;
  notes?: string;
  source: 'weapon' | 'custom';
}

export interface DerivedSkill {
  id: SkillId;
  name: string;
  ability: AbilityId;
  prof: 0 | 1 | 2;
  mod: number;
  passive: number;
}

export interface DerivedCharacter {
  classes: { info: DnDClass; level: number; subclass?: string }[];
  primaryClass: DnDClass | null;
  level: number;
  profBonus: number;
  mods: AbilityScores;
  saves: Record<AbilityId, { mod: number; prof: boolean }>;
  skills: DerivedSkill[];
  ac: number;
  acSource: string;
  initiative: number;
  passivePerception: number;
  hpMax: number;
  hitDie: number;
  speed: number;
  spellcasting: {
    ability: AbilityId | null;
    dc: number;
    attack: number;
    slots: number[];
    used: number[];
    pact: { slots: number; level: number; used: number } | null;
    arcanum: number[];
    arcanumUsed: number[];
  } | null;
  attacks: ResolvedAttack[];
  weapons: InventoryItem[];
  carrying: { weight: number; capacity: number; pushDragLift: number; encumbered: boolean };
  hitDiceTotal: number;
  hitDiceLeft: number;
  xpNext: number | null;
  species: Species | null;
  background: Background | null;
}
