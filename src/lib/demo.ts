import type { Character, InventoryItem } from '../data/types';
import { createCharacter, makeInventoryItem } from './rules/character';

function inv(itemId: string, name: string, weight: number, qty = 1, equipped = false): InventoryItem {
  return makeInventoryItem({ itemId, name, qty, weight, equipped });
}

/** Готовый пример, чтобы приложение можно было оценить одним нажатием. */
export function makeDemoCharacter(): Character {
  const character = createCharacter({
    name: 'Кайра',
    speciesId: 'elf',
    classId: 'ranger',
    backgroundId: 'guide',
    level: 3,
    abilities: { str: 12, dex: 17, con: 14, int: 10, wis: 15, cha: 8 },
    skillProfs: { stealth: 1, survival: 1, perception: 1 },
    coins: { cp: 0, sp: 0, ep: 0, gp: 24, pp: 0 },
    inventory: [
      inv('longbow', 'Длинный лук', 2, 1, true),
      inv('shortsword', 'Короткий меч', 2, 1, true),
      inv('dagger', 'Кинжал', 1, 2, true),
      inv('leather-armor', 'Кожаный доспех', 10, 1, true),
      inv('backpack', 'Рюкзак', 5),
      inv('bedroll', 'Спальник', 7),
      inv('rope', 'Верёвка пеньковая (50 фт.)', 10),
      inv('rations', 'Рационы (1 день)', 2, 5),
      inv('waterskin', 'Фляга для воды', 5),
      inv('torch', 'Факел', 1, 5),
      inv('healing-potion', 'Зелье лечения', 0.5, 2),
    ],
    spells: { known: ['hunters-mark', 'cure-wounds'], prepared: ['hunters-mark', 'cure-wounds'] },
  });
  character.classes[0].subclass = 'Охотник';
  character.notes = 'Демонстрационный персонаж: следопыт 3-го уровня с луком, мечом и двумя зельями.';
  character.appearance = 'Высокая эльфийка с выцветшим зелёным плащом и взглядом, который всегда ищет следы.';
  character.backstory = 'Кайра провела десять лет, водя караваны через Хребет Ветров. Однажды караван не вернулся — и с тех пор она ищет, кто в этом виноват.';
  return character;
}
