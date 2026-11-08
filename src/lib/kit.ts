import type { InventoryItem } from '../data/types';
import { getItem } from '../data';
import { makeInventoryItem } from './rules/character';

interface KitLine {
  itemId: string;
  qty?: number;
  equipped?: boolean;
}

const KITS: Record<string, KitLine[]> = {
  barbarian: [
    { itemId: 'greataxe', equipped: true },
    { itemId: 'handaxe', qty: 2, equipped: true },
    { itemId: 'javelin', qty: 4 },
    { itemId: 'backpack' },
    { itemId: 'bedroll' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
    { itemId: 'torch', qty: 5 },
  ],
  bard: [
    { itemId: 'leather-armor', equipped: true },
    { itemId: 'dagger', qty: 2, equipped: true },
    { itemId: 'musical-instrument' },
    { itemId: 'backpack' },
    { itemId: 'bedroll' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
    { itemId: 'torch', qty: 5 },
  ],
  cleric: [
    { itemId: 'chain-shirt', equipped: true },
    { itemId: 'shield', equipped: true },
    { itemId: 'mace', equipped: true },
    { itemId: 'holy-symbol' },
    { itemId: 'backpack' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
    { itemId: 'torch', qty: 5 },
  ],
  druid: [
    { itemId: 'leather-armor', equipped: true },
    { itemId: 'shield', equipped: true },
    { itemId: 'sickle', equipped: true },
    { itemId: 'herbalism-kit' },
    { itemId: 'backpack' },
    { itemId: 'bedroll' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
  ],
  fighter: [
    { itemId: 'chain-mail', equipped: true },
    { itemId: 'longsword', equipped: true },
    { itemId: 'shield', equipped: true },
    { itemId: 'handaxe', qty: 2 },
    { itemId: 'backpack' },
    { itemId: 'bedroll' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
    { itemId: 'torch', qty: 5 },
  ],
  monk: [
    { itemId: 'shortsword', equipped: true },
    { itemId: 'dart', qty: 10 },
    { itemId: 'backpack' },
    { itemId: 'bedroll' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
  ],
  paladin: [
    { itemId: 'chain-mail', equipped: true },
    { itemId: 'shield', equipped: true },
    { itemId: 'longsword', equipped: true },
    { itemId: 'javelin', qty: 6 },
    { itemId: 'holy-symbol' },
    { itemId: 'backpack' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
  ],
  ranger: [
    { itemId: 'leather-armor', equipped: true },
    { itemId: 'longbow', equipped: true },
    { itemId: 'shortsword', equipped: true },
    { itemId: 'backpack' },
    { itemId: 'bedroll' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
    { itemId: 'torch', qty: 5 },
  ],
  rogue: [
    { itemId: 'leather-armor', equipped: true },
    { itemId: 'dagger', qty: 2, equipped: true },
    { itemId: 'shortsword', equipped: true },
    { itemId: 'thieves-tools' },
    { itemId: 'backpack' },
    { itemId: 'bedroll' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
  ],
  sorcerer: [
    { itemId: 'dagger', qty: 2, equipped: true },
    { itemId: 'arcane-focus' },
    { itemId: 'backpack' },
    { itemId: 'bedroll' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
    { itemId: 'torch', qty: 5 },
  ],
  warlock: [
    { itemId: 'leather-armor', equipped: true },
    { itemId: 'dagger', qty: 2, equipped: true },
    { itemId: 'arcane-focus' },
    { itemId: 'backpack' },
    { itemId: 'bedroll' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
  ],
  wizard: [
    { itemId: 'dagger', qty: 2, equipped: true },
    { itemId: 'arcane-focus' },
    { itemId: 'backpack' },
    { itemId: 'bedroll' },
    { itemId: 'rations', qty: 5 },
    { itemId: 'waterskin' },
    { itemId: 'torch', qty: 5 },
    { itemId: 'calligrapher-tools' },
  ],
};

export function startingKit(classId: string): InventoryItem[] {
  const kit = KITS[classId] ?? KITS.fighter;
  return kit.map((line) => {
    const item = getItem(line.itemId);
    return makeInventoryItem({
      itemId: line.itemId,
      name: item?.name ?? line.itemId,
      qty: line.qty ?? 1,
      weight: item?.weight ?? 0,
      equipped: line.equipped ?? false,
    });
  });
}
