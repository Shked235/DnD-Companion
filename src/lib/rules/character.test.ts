import { describe, expect, it } from 'vitest';
import type { Character } from '../../data/types';
import {
  abilityMod,
  makeRng,
  parseDice,
  pointBuySum,
  proficiencyBonus,
  rollCheck,
  rollDice,
} from './core';
import { fullCasterSlots, halfCasterSlots, pactMagic } from './tables';
import {
  createCharacter,
  deriveCharacter,
  levelUp,
  longRest,
  makeInventoryItem,
  shortRest,
  spendSlot,
  suggestedMaxHp,
} from './character';

const ABILITIES = { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 };

function fighter(level = 1, inventory: Character['inventory'] = []): Character {
  return createCharacter({
    name: 'Тест',
    speciesId: 'human',
    classId: 'fighter',
    backgroundId: 'soldier',
    level,
    abilities: { ...ABILITIES },
    skillProfs: { athletics: 1, intimidation: 1 },
    inventory,
  });
}

describe('ядро правил', () => {
  it('считает модификаторы характеристик', () => {
    expect(abilityMod(10)).toBe(0);
    expect(abilityMod(11)).toBe(0);
    expect(abilityMod(8)).toBe(-1);
    expect(abilityMod(20)).toBe(5);
    expect(abilityMod(1)).toBe(-5);
  });

  it('считает бонус владения по уровням', () => {
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(4)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(9)).toBe(4);
    expect(proficiencyBonus(13)).toBe(5);
    expect(proficiencyBonus(17)).toBe(6);
    expect(proficiencyBonus(20)).toBe(6);
  });

  it('покупает характеристики за 27 очков', () => {
    expect(pointBuySum({ str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 })).toBe(27);
    expect(pointBuySum({ str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 })).toBe(0);
  });

  it('разбирает и бросает кости', () => {
    expect(parseDice('2d6+3')).toEqual({ terms: [{ count: 2, sides: 6, sign: 1 }], constant: 3 });
    expect(parseDice('1d8 - 1')).toEqual({ terms: [{ count: 1, sides: 8, sign: 1 }], constant: -1 });
    const rng = makeRng(42);
    const result = rollDice('2d6+3', rng);
    expect(result.total).toBeGreaterThanOrEqual(5);
    expect(result.total).toBeLessThanOrEqual(15);
    expect(result.groups[0].rolls).toHaveLength(2);
  });

  it('бросает d20 с преимуществом и помехой', () => {
    const fixed = () => 0.05; // всегда 2
    const adv = rollCheck(5, { advantage: 'adv', rng: fixed });
    expect(adv.die).toBe(2);
    expect(adv.total).toBe(7);
    const crit = rollCheck(0, { rng: () => 0.999 });
    expect(crit.crit).toBe(true);
  });
});

describe('таблицы заклинаний', () => {
  it('даёт ячейки полному заклинателю', () => {
    expect(fullCasterSlots(1)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(fullCasterSlots(5)).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
    expect(fullCasterSlots(20)).toEqual([4, 3, 3, 3, 3, 2, 2, 1, 1]);
  });

  it('считает полузаклинателя через ceil(уровень/2)', () => {
    expect(halfCasterSlots(1)).toEqual([2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(halfCasterSlots(5)).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(halfCasterSlots(6)).toEqual([4, 2, 0, 0, 0, 0, 0, 0, 0]);
    expect(halfCasterSlots(9)).toEqual([4, 3, 2, 0, 0, 0, 0, 0, 0]);
  });

  it('даёт колдуну ячейки договора', () => {
    expect(pactMagic(1)).toEqual({ slots: 1, level: 1 });
    expect(pactMagic(5)).toEqual({ slots: 2, level: 3 });
    expect(pactMagic(17)).toEqual({ slots: 4, level: 5 });
  });
});

describe('лист персонажа', () => {
  it('считает хиты воина 1-го уровня', () => {
    const ch = fighter(1);
    expect(suggestedMaxHp(ch)).toBe(12); // 10 + 2
    expect(ch.hp.max).toBe(12);
    expect(ch.hp.current).toBe(12);
  });

  it('считает КД с доспехом и щитом', () => {
    const ch = fighter(1, [
      makeInventoryItem({ itemId: 'chain-mail', name: 'Кольчуга', equipped: true, weight: 55 }),
      makeInventoryItem({ itemId: 'shield', name: 'Щит', equipped: true, weight: 6 }),
    ]);
    const d = deriveCharacter(ch);
    expect(d.ac).toBe(18); // 16 + 2, Ловкость не добавляется
    expect(d.acSource).toContain('Кольчуга');
  });

  it('считает навыки и пассивную Внимательность', () => {
    const ch = fighter(1);
    const d = deriveCharacter(ch);
    const athletics = d.skills.find((s) => s.id === 'athletics');
    expect(athletics?.mod).toBe(5); // +3 сила +2 владение
    const stealth = d.skills.find((s) => s.id === 'stealth');
    expect(stealth?.mod).toBe(2); // +2 ловкость без владения
    expect(d.passivePerception).toBe(11); // 10 + 1 мдр
    expect(d.saves.str.mod).toBe(5);
    expect(d.saves.dex.mod).toBe(2);
  });

  it('строит атаки из надетого оружия', () => {
    const ch = fighter(1, [
      makeInventoryItem({ itemId: 'longsword', name: 'Длинный меч', equipped: true, weight: 3 }),
      makeInventoryItem({ itemId: 'longbow', name: 'Длинный лук', equipped: true, weight: 2 }),
      makeInventoryItem({ itemId: 'dagger', name: 'Кинжал', equipped: false, weight: 1 }),
    ]);
    const d = deriveCharacter(ch);
    expect(d.attacks).toHaveLength(2);
    const sword = d.attacks.find((a) => a.name === 'Длинный меч');
    expect(sword?.toHit).toBe(5); // сила 3 + владение 2
    expect(sword?.damage).toBe('1d8 +3');
    const bow = d.attacks.find((a) => a.name === 'Длинный лук');
    expect(bow?.toHit).toBe(4); // ловкость 2 + владение 2
  });

  it('считает СЛ и ячейки волшебника', () => {
    const ch = createCharacter({
      name: 'Маг',
      speciesId: 'elf',
      classId: 'wizard',
      backgroundId: 'sage',
      level: 5,
      abilities: { str: 8, dex: 14, con: 14, int: 17, wis: 12, cha: 10 },
      skillProfs: { arcana: 1, history: 1 },
    });
    const d = deriveCharacter(ch);
    expect(d.spellcasting?.dc).toBe(14); // 8 + 3 + 3
    expect(d.spellcasting?.attack).toBe(6);
    expect(d.spellcasting?.slots.slice(0, 3)).toEqual([4, 3, 2]);
  });

  it('тратит и восстанавливает ячейки с ограничением', () => {
    const ch = createCharacter({
      name: 'Маг',
      speciesId: 'elf',
      classId: 'wizard',
      backgroundId: 'sage',
      level: 3,
      abilities: { str: 8, dex: 14, con: 14, int: 16, wis: 12, cha: 10 },
      skillProfs: { arcana: 1 },
    });
    let next = spendSlot(ch, 1, 1);
    next = spendSlot(next, 1, 5);
    expect(next.spells.slotsUsed[1]).toBe(6);
    expect(deriveCharacter(next).spellcasting?.used[0]).toBe(4); // не больше доступных
  });

  it('повышает уровень и добавляет умения', () => {
    const ch = fighter(1);
    const result = levelUp(ch);
    expect(result.character.level).toBe(2);
    expect(result.hpGain).toBe(8); // 6 (среднее d10) + 2
    expect(result.gainedFeatures).toContain('Всплеск действий');
    expect(result.character.features.some((f) => f.name === 'Всплеск действий')).toBe(true);
  });

  it('делает короткий и длинный отдых', () => {
    const ch = fighter(3);
    const wounded = { ...ch, hp: { ...ch.hp, current: 5 }, hitDiceSpent: 0 };
    const short = shortRest(wounded, 2, makeRng(7));
    expect(short.spent).toBe(2);
    expect(short.character.hitDiceSpent).toBe(2);
    expect(short.character.hp.current).toBeGreaterThan(5);

    const rested = longRest({ ...wounded, spells: { ...wounded.spells, slotsUsed: { 1: 2 } } });
    expect(rested.hp.current).toBe(rested.hp.max);
    expect(rested.spells.slotsUsed).toEqual({});
    expect(rested.hitDiceSpent).toBe(0);
  });
});
