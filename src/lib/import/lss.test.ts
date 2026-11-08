import { describe, expect, it } from 'vitest';
import { extractLssCharacter, isLssCharacter, mapLssCharacter, type LssRaw } from './lss';

const elfBard: LssRaw = {
  jsonType: 'character',
  name: { value: '' },
  info: {
    charClass: { value: 'Бард' },
    level: { value: 1 },
    background: { value: 'Гильдейская рем.' },
    race: { value: 'Эльфийка (л)' },
  },
  stats: {
    str: { score: 8 },
    dex: { score: 16 },
    con: { score: 13 },
    int: { score: 10 },
    wis: { score: 13 },
    cha: { score: 15 },
  },
  abilities: {
    acrobatics: { baseStat: 'dex' },
    investigation: { baseStat: 'int', isProf: true },
    athletics: { baseStat: 'str' },
    perception: { baseStat: 'wis', isProf: true },
    performance: { baseStat: 'cha', isProf: true },
    'sleight of hand': { baseStat: 'dex' },
    stealth: { baseStat: 'dex' },
    survival: { baseStat: 'wis' },
    nature: { baseStat: 'int', isProf: true },
    insight: { baseStat: 'wis', isProf: true },
    persuasion: { baseStat: 'cha', isProf: true },
  },
  vitality: {
    'hp-max': { value: '9' },
    ac: { value: '14' },
    speed: { value: '35 футов' },
    'hit-die': { value: '1к8' },
  },
  weaponsList: [
    {
      id: 'weapon-0',
      name: { value: 'Рапира' },
      mod: { value: '+5' },
      dmg: { value: '1к8 + 3 (колющий)' },
      isProf: true,
      ability: 'dex',
    },
    {
      id: 'weapon-1',
      name: { value: 'Кинжал серебряный' },
      mod: { value: '+5' },
      dmg: { value: '1к4 + 3 колющий' },
      isProf: true,
      ability: 'dex',
    },
  ],
  text: {
    traits: {
      value: {
        data: '<p><strong>Вдохновение барда</strong>. Бонусным действием дайте кость вдохновения.</p><p><strong>Тёмное зрение</strong>. Вы видите в темноте на 60 футов.</p>',
      },
    },
    equipment: { value: { data: '<p>Кожаный доспех, кинжал, авлос.</p>' } },
    prof: { value: { data: '<p><strong>Доспехи</strong>: Лёгкие доспехи.</p>' } },
  },
  coins: { gp: { value: '15' } },
};

describe('импорт Long Story Short', () => {
  it('узнаёт формат персонажа и page-data', () => {
    expect(isLssCharacter(elfBard)).toBe(true);
    expect(isLssCharacter({ name: 'не персонаж' })).toBe(false);

    const pageData = {
      result: {
        pageContext: {
          character: { male: 'Эльф бард', female: 'Эльфийка бард' },
          raw: { male: JSON.stringify(elfBard), female: JSON.stringify(elfBard) },
        },
      },
    };
    const extracted = extractLssCharacter(pageData, 'female');
    expect(extracted?.raw.stats?.dex.score).toBe(16);
    expect(extracted?.label).toBe('Эльфийка бард');
  });

  it('переносит характеристики, класс, вид и предысторию', () => {
    const { character, warnings } = mapLssCharacter(elfBard, {
      label: 'Эльфийка бард',
      sourceUrl: 'https://longstoryshort.app/characters/elf-bard/',
    });
    expect(character.name).toBe('Эльфийка бард');
    expect(character.classes[0].classId).toBe('bard');
    expect(character.speciesId).toBe('elf');
    expect(character.backgroundId).toBe('artisan');
    expect(character.level).toBe(1);
    expect(character.abilities).toEqual({ str: 8, dex: 16, con: 13, int: 10, wis: 13, cha: 15 });
    expect(warnings).toEqual([]);
  });

  it('переносит навыки, хиты, КД и скорость', () => {
    const { character } = mapLssCharacter(elfBard, { label: 'Бард' });
    expect(character.skillProfs.investigation).toBe(1);
    expect(character.skillProfs.perception).toBe(1);
    expect(character.skillProfs.acrobatics).toBeUndefined();
    expect(character.hp.max).toBe(9);
    expect(character.hp.current).toBe(9);
    expect(character.acOverride).toBe(14);
    expect(character.speedOverride).toBe(35);
  });

  it('находит оружие в справочнике и добавляет незнакомое как атаку', () => {
    const { character } = mapLssCharacter(elfBard, { label: 'Бард' });
    const rapier = character.inventory.find((i) => i.itemId === 'rapier');
    expect(rapier?.equipped).toBe(true);
    expect(character.extraAttacks).toHaveLength(1);
    expect(character.extraAttacks[0].name).toBe('Кинжал серебряный');
    expect(character.extraAttacks[0].damageDice).toBe('1d4 + 3');
    expect(character.extraAttacks[0].damageType).toBe('Колющий');
  });

  it('переносит умения из HTML и заметки об источнике', () => {
    const { character } = mapLssCharacter(elfBard, {
      label: 'Бард',
      sourceUrl: 'https://longstoryshort.app/characters/elf-bard/',
    });
    expect(character.features.filter((f) => f.name === 'Вдохновение барда')).toHaveLength(1);
    expect(character.features.some((f) => f.name === 'Тёмное зрение')).toBe(true);
    expect(character.notes).toContain('longstoryshort.app/characters/elf-bard/');
    expect(character.notes).toContain('Снаряжение (LSS): Кожаный доспех, кинжал, авлос.');
    expect(character.coins.gp).toBe(15);
  });

  it('предупреждает о неизвестном классе и виде', () => {
    const exotic: LssRaw = {
      ...elfBard,
      info: { ...elfBard.info, charClass: { value: 'Изобретатель' }, race: { value: 'Фирболг' } },
    };
    const { character, warnings } = mapLssCharacter(exotic, { label: 'Экзотика' });
    expect(character.classes[0].classId).toBe('fighter');
    expect(character.speciesId).toBe('human');
    expect(warnings.join(' ')).toContain('Изобретатель');
    expect(warnings.join(' ')).toContain('Фирболг');
  });
});
