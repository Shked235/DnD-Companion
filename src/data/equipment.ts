import type { Item } from './types';

/** Оружие, броня и снаряжение 2024. Свойства мастерства указаны для каждого вида оружия. */
export const ITEMS: Item[] = [
  /* ---------- простое оружие ближнего боя ---------- */
  {
    id: 'club', name: 'Дубинка', nameEn: 'Club', kind: 'weapon', cost: '1 см', weight: 2,
    damage: '1d4', damageType: 'Дробящий', properties: ['Лёгкое'], mastery: 'Медлительное',
    tags: ['Простое', 'Ближний бой'],
  },
  {
    id: 'dagger', name: 'Кинжал', nameEn: 'Dagger', kind: 'weapon', cost: '2 зм', weight: 1,
    damage: '1d4', damageType: 'Колющий', properties: ['Фехтовальное', 'Лёгкое', 'Метательное (20/60)'],
    mastery: 'Быстрое', range: '20/60 фт.', tags: ['Простое', 'Ближний бой'],
  },
  {
    id: 'greatclub', name: 'Большая дубинка', nameEn: 'Greatclub', kind: 'weapon', cost: '2 см', weight: 10,
    damage: '1d8', damageType: 'Дробящий', properties: ['Двуручное'], mastery: 'Толчок',
    tags: ['Простое', 'Ближний бой'],
  },
  {
    id: 'handaxe', name: 'Ручной топор', nameEn: 'Handaxe', kind: 'weapon', cost: '5 зм', weight: 2,
    damage: '1d6', damageType: 'Рубящий', properties: ['Лёгкое', 'Метательное (20/60)'], mastery: 'Опрокидывание',
    range: '20/60 фт.', tags: ['Простое', 'Ближний бой'],
  },
  {
    id: 'javelin', name: 'Метательное копьё', nameEn: 'Javelin', kind: 'weapon', cost: '5 см', weight: 2,
    damage: '1d6', damageType: 'Колющий', properties: ['Метательное (30/120)'], mastery: 'Медлительное',
    range: '30/120 фт.', tags: ['Простое', 'Ближний бой'],
  },
  {
    id: 'light-hammer', name: 'Лёгкий молот', nameEn: 'Light Hammer', kind: 'weapon', cost: '2 зм', weight: 2,
    damage: '1d4', damageType: 'Дробящий', properties: ['Лёгкое', 'Метательное (20/60)'], mastery: 'Быстрое',
    range: '20/60 фт.', tags: ['Простое', 'Ближний бой'],
  },
  {
    id: 'mace', name: 'Булава', nameEn: 'Mace', kind: 'weapon', cost: '5 зм', weight: 4,
    damage: '1d6', damageType: 'Дробящий', properties: [], mastery: 'Медлительное', tags: ['Простое', 'Ближний бой'],
  },
  {
    id: 'quarterstaff', name: 'Боевой посох', nameEn: 'Quarterstaff', kind: 'weapon', cost: '2 см', weight: 4,
    damage: '1d6', damageType: 'Дробящий', properties: ['Универсальное (1d8)'], mastery: 'Опрокидывание',
    tags: ['Простое', 'Ближний бой'],
  },
  {
    id: 'sickle', name: 'Серп', nameEn: 'Sickle', kind: 'weapon', cost: '1 зм', weight: 2,
    damage: '1d4', damageType: 'Рубящий', properties: ['Лёгкое'], mastery: 'Быстрое', tags: ['Простое', 'Ближний бой'],
  },
  {
    id: 'spear', name: 'Копьё', nameEn: 'Spear', kind: 'weapon', cost: '1 зм', weight: 3,
    damage: '1d6', damageType: 'Колющий', properties: ['Метательное (20/60)', 'Универсальное (1d8)'],
    mastery: 'Опрокидывание', range: '20/60 фт.', tags: ['Простое', 'Ближний бой'],
  },

  /* ---------- простое дальнобойное оружие ---------- */
  {
    id: 'light-crossbow', name: 'Лёгкий арбалет', nameEn: 'Light Crossbow', kind: 'weapon', cost: '25 зм', weight: 5,
    damage: '1d8', damageType: 'Колющий', properties: ['Дальнобойное (80/320)', 'Двуручное', 'Перезарядка'],
    mastery: 'Медлительное', range: '80/320 фт.', tags: ['Простое', 'Дальний бой'],
  },
  {
    id: 'dart', name: 'Дротик', nameEn: 'Dart', kind: 'weapon', cost: '5 см', weight: 0.25,
    damage: '1d4', damageType: 'Колющий', properties: ['Фехтовальное', 'Метательное (20/60)'], mastery: 'Опрокидывание',
    range: '20/60 фт.', tags: ['Простое', 'Дальний бой'],
  },
  {
    id: 'shortbow', name: 'Короткий лук', nameEn: 'Shortbow', kind: 'weapon', cost: '25 зм', weight: 2,
    damage: '1d6', damageType: 'Колющий', properties: ['Дальнобойное (80/320)', 'Двуручное'], mastery: 'Опрокидывание',
    range: '80/320 фт.', tags: ['Простое', 'Дальний бой'],
  },
  {
    id: 'sling', name: 'Праща', nameEn: 'Sling', kind: 'weapon', cost: '1 см', weight: 0,
    damage: '1d4', damageType: 'Дробящий', properties: ['Дальнобойное (30/120)'], mastery: 'Медлительное',
    range: '30/120 фт.', tags: ['Простое', 'Дальний бой'],
  },

  /* ---------- военное оружие ---------- */
  {
    id: 'battleaxe', name: 'Боевой топор', nameEn: 'Battleaxe', kind: 'weapon', cost: '10 зм', weight: 4,
    damage: '1d8', damageType: 'Рубящий', properties: ['Универсальное (1d10)'], mastery: 'Опрокидывание',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'flail', name: 'Цеп', nameEn: 'Flail', kind: 'weapon', cost: '10 зм', weight: 2,
    damage: '1d8', damageType: 'Дробящий', properties: [], mastery: 'Медлительное', tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'glaive', name: 'Глефа', nameEn: 'Glaive', kind: 'weapon', cost: '20 зм', weight: 6,
    damage: '1d10', damageType: 'Рубящий', properties: ['Двуручное', 'Тяжёлое', 'Досягаемость'], mastery: 'Рассечение',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'greataxe', name: 'Секира', nameEn: 'Greataxe', kind: 'weapon', cost: '30 зм', weight: 7,
    damage: '1d12', damageType: 'Рубящий', properties: ['Двуручное', 'Тяжёлое'], mastery: 'Рассечение',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'greatsword', name: 'Двуручный меч', nameEn: 'Greatsword', kind: 'weapon', cost: '50 зм', weight: 6,
    damage: '2d6', damageType: 'Рубящий', properties: ['Двуручное', 'Тяжёлое'], mastery: 'Рассечение',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'halberd', name: 'Алебарда', nameEn: 'Halberd', kind: 'weapon', cost: '20 зм', weight: 6,
    damage: '1d10', damageType: 'Рубящий', properties: ['Двуручное', 'Тяжёлое', 'Досягаемость'], mastery: 'Рассечение',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'lance', name: 'Кавалерийское копьё', nameEn: 'Lance', kind: 'weapon', cost: '10 зм', weight: 6,
    damage: '1d10', damageType: 'Колющий', properties: ['Досягаемость', 'Тяжёлое', 'Двуручное (в седле — одноручное)'],
    mastery: 'Опрокидывание', tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'longsword', name: 'Длинный меч', nameEn: 'Longsword', kind: 'weapon', cost: '15 зм', weight: 3,
    damage: '1d8', damageType: 'Рубящий', properties: ['Универсальное (1d10)'], mastery: 'Медлительное',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'maul', name: 'Молот', nameEn: 'Maul', kind: 'weapon', cost: '10 зм', weight: 10,
    damage: '2d6', damageType: 'Дробящий', properties: ['Двуручное', 'Тяжёлое'], mastery: 'Опрокидывание',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'morningstar', name: 'Моргенштерн', nameEn: 'Morningstar', kind: 'weapon', cost: '15 зм', weight: 4,
    damage: '1d8', damageType: 'Колющий', properties: [], mastery: 'Медлительное', tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'pike', name: 'Пика', nameEn: 'Pike', kind: 'weapon', cost: '5 зм', weight: 18,
    damage: '1d10', damageType: 'Колющий', properties: ['Двуручное', 'Тяжёлое', 'Досягаемость'], mastery: 'Толчок',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'rapier', name: 'Рапира', nameEn: 'Rapier', kind: 'weapon', cost: '25 зм', weight: 2,
    damage: '1d8', damageType: 'Колющий', properties: ['Фехтовальное'], mastery: 'Опрокидывание',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'scimitar', name: 'Скимитар', nameEn: 'Scimitar', kind: 'weapon', cost: '25 зм', weight: 3,
    damage: '1d6', damageType: 'Рубящий', properties: ['Фехтовальное', 'Лёгкое'], mastery: 'Быстрое',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'shortsword', name: 'Короткий меч', nameEn: 'Shortsword', kind: 'weapon', cost: '10 зм', weight: 2,
    damage: '1d6', damageType: 'Колющий', properties: ['Фехтовальное', 'Лёгкое'], mastery: 'Опрокидывание',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'trident', name: 'Трезубец', nameEn: 'Trident', kind: 'weapon', cost: '5 зм', weight: 4,
    damage: '1d8', damageType: 'Колющий', properties: ['Метательное (20/60)', 'Универсальное (1d10)'],
    mastery: 'Опрокидывание', range: '20/60 фт.', tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'warhammer', name: 'Боевой молот', nameEn: 'Warhammer', kind: 'weapon', cost: '15 зм', weight: 5,
    damage: '1d8', damageType: 'Дробящий', properties: ['Универсальное (1d10)'], mastery: 'Толчок',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'war-pick', name: 'Клевец', nameEn: 'War Pick', kind: 'weapon', cost: '5 зм', weight: 2,
    damage: '1d8', damageType: 'Колющий', properties: [], mastery: 'Медлительное', tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'whip', name: 'Хлыст', nameEn: 'Whip', kind: 'weapon', cost: '2 зм', weight: 3,
    damage: '1d4', damageType: 'Рубящий', properties: ['Фехтовальное', 'Досягаемость'], mastery: 'Медлительное',
    tags: ['Военное', 'Ближний бой'],
  },
  {
    id: 'blowgun', name: 'Духовая трубка', nameEn: 'Blowgun', kind: 'weapon', cost: '10 зм', weight: 1,
    damage: '1', damageType: 'Колющий', properties: ['Дальнобойное (25/100)', 'Перезарядка'], mastery: 'Опрокидывание',
    range: '25/100 фт.', tags: ['Военное', 'Дальний бой'],
  },
  {
    id: 'hand-crossbow', name: 'Ручной арбалет', nameEn: 'Hand Crossbow', kind: 'weapon', cost: '75 зм', weight: 3,
    damage: '1d6', damageType: 'Колющий', properties: ['Дальнобойное (30/120)', 'Лёгкое', 'Перезарядка'],
    mastery: 'Опрокидывание', range: '30/120 фт.', tags: ['Военное', 'Дальний бой'],
  },
  {
    id: 'heavy-crossbow', name: 'Тяжёлый арбалет', nameEn: 'Heavy Crossbow', kind: 'weapon', cost: '50 зм', weight: 18,
    damage: '1d10', damageType: 'Колющий', properties: ['Дальнобойное (100/400)', 'Двуручное', 'Тяжёлое', 'Перезарядка'],
    mastery: 'Толчок', range: '100/400 фт.', tags: ['Военное', 'Дальний бой'],
  },
  {
    id: 'longbow', name: 'Длинный лук', nameEn: 'Longbow', kind: 'weapon', cost: '50 зм', weight: 2,
    damage: '1d8', damageType: 'Колющий', properties: ['Дальнобойное (150/600)', 'Двуручное', 'Тяжёлое'],
    mastery: 'Медлительное', range: '150/600 фт.', tags: ['Военное', 'Дальний бой'],
  },
  {
    id: 'musket', name: 'Мушкет', nameEn: 'Musket', kind: 'weapon', cost: '500 зм', weight: 10,
    damage: '1d12', damageType: 'Колющий', properties: ['Дальнобойное (40/120)', 'Двуручное', 'Перезарядка'],
    mastery: 'Медлительное', range: '40/120 фт.', tags: ['Военное', 'Огнестрельное'],
  },
  {
    id: 'pistol', name: 'Пистоль', nameEn: 'Pistol', kind: 'weapon', cost: '250 зм', weight: 3,
    damage: '1d10', damageType: 'Колющий', properties: ['Дальнобойное (30/90)', 'Перезарядка'], mastery: 'Опрокидывание',
    range: '30/90 фт.', tags: ['Военное', 'Огнестрельное'],
  },

  /* ---------- броня ---------- */
  {
    id: 'padded-armor', name: 'Стёганый доспех', nameEn: 'Padded Armor', kind: 'armor', cost: '5 зм', weight: 8,
    armorType: 'light', acBase: 11, acDexMax: 99, stealthDisadv: true, description: 'Помеха на проверки Скрытности.',
    tags: ['Лёгкий доспех'],
  },
  {
    id: 'leather-armor', name: 'Кожаный доспех', nameEn: 'Leather Armor', kind: 'armor', cost: '10 зм', weight: 10,
    armorType: 'light', acBase: 11, acDexMax: 99, tags: ['Лёгкий доспех'],
  },
  {
    id: 'studded-leather', name: 'Проклёпанный кожаный доспех', nameEn: 'Studded Leather Armor', kind: 'armor',
    cost: '45 зм', weight: 13, armorType: 'light', acBase: 12, acDexMax: 99, tags: ['Лёгкий доспех'],
  },
  {
    id: 'hide-armor', name: 'Шкурный доспех', nameEn: 'Hide Armor', kind: 'armor', cost: '10 зм', weight: 12,
    armorType: 'medium', acBase: 12, acDexMax: 2, tags: ['Средний доспех'],
  },
  {
    id: 'chain-shirt', name: 'Кольчужная рубаха', nameEn: 'Chain Shirt', kind: 'armor', cost: '50 зм', weight: 20,
    armorType: 'medium', acBase: 13, acDexMax: 2, tags: ['Средний доспех'],
  },
  {
    id: 'scale-mail', name: 'Чешуйчатый доспех', nameEn: 'Scale Mail', kind: 'armor', cost: '50 зм', weight: 45,
    armorType: 'medium', acBase: 14, acDexMax: 2, stealthDisadv: true, tags: ['Средний доспех'],
  },
  {
    id: 'breastplate', name: 'Нагрудник', nameEn: 'Breastplate', kind: 'armor', cost: '400 зм', weight: 20,
    armorType: 'medium', acBase: 14, acDexMax: 2, tags: ['Средний доспех'],
  },
  {
    id: 'half-plate', name: 'Полулаты', nameEn: 'Half Plate Armor', kind: 'armor', cost: '750 зм', weight: 40,
    armorType: 'medium', acBase: 15, acDexMax: 2, stealthDisadv: true, tags: ['Средний доспех'],
  },
  {
    id: 'ring-mail', name: 'Кольчатый доспех', nameEn: 'Ring Mail', kind: 'armor', cost: '30 зм', weight: 40,
    armorType: 'heavy', acBase: 14, acDexMax: 0, stealthDisadv: true, tags: ['Тяжёлый доспех'],
  },
  {
    id: 'chain-mail', name: 'Кольчуга', nameEn: 'Chain Mail', kind: 'armor', cost: '75 зм', weight: 55,
    armorType: 'heavy', acBase: 16, acDexMax: 0, strReq: 13, stealthDisadv: true, tags: ['Тяжёлый доспех'],
  },
  {
    id: 'splint-armor', name: 'Наборный доспех', nameEn: 'Splint Armor', kind: 'armor', cost: '200 зм', weight: 60,
    armorType: 'heavy', acBase: 17, acDexMax: 0, strReq: 15, stealthDisadv: true, tags: ['Тяжёлый доспех'],
  },
  {
    id: 'plate-armor', name: 'Латный доспех', nameEn: 'Plate Armor', kind: 'armor', cost: '1500 зм', weight: 65,
    armorType: 'heavy', acBase: 18, acDexMax: 0, strReq: 15, stealthDisadv: true, tags: ['Тяжёлый доспех'],
  },
  {
    id: 'shield', name: 'Щит', nameEn: 'Shield', kind: 'shield', cost: '10 зм', weight: 6, acBase: 2,
    description: '+2 к КД. Действием можно добавить +2 к КД против одной атаки.', tags: ['Щит'],
  },

  /* ---------- снаряжение ---------- */
  { id: 'backpack', name: 'Рюкзак', nameEn: 'Backpack', kind: 'gear', cost: '2 зм', weight: 5, tags: ['Снаряжение'] },
  { id: 'bedroll', name: 'Спальник', nameEn: 'Bedroll', kind: 'gear', cost: '1 зм', weight: 7, tags: ['Снаряжение'] },
  { id: 'rope', name: 'Верёвка пеньковая (50 фт.)', nameEn: 'Rope', kind: 'gear', cost: '1 зм', weight: 10, tags: ['Снаряжение'] },
  { id: 'torch', name: 'Факел', nameEn: 'Torch', kind: 'gear', cost: '1 мм', weight: 1, description: 'Яркий свет 20 фт., тусклый — ещё 20 фт. Горит 1 час.', tags: ['Снаряжение'] },
  { id: 'lantern', name: 'Фонарь закрытый', nameEn: 'Hooded Lantern', kind: 'gear', cost: '5 зм', weight: 2, description: 'Яркий свет 30 фт., тусклый — ещё 30 фт. Горит 6 часов на фляге масла.', tags: ['Снаряжение'] },
  { id: 'oil', name: 'Масло (фляга)', nameEn: 'Oil', kind: 'gear', cost: '1 см', weight: 1, tags: ['Снаряжение'] },
  { id: 'rations', name: 'Рационы (1 день)', nameEn: 'Rations', kind: 'gear', cost: '5 см', weight: 2, tags: ['Снаряжение'] },
  { id: 'waterskin', name: 'Фляга для воды', nameEn: 'Waterskin', kind: 'gear', cost: '2 см', weight: 5, tags: ['Снаряжение'] },
  { id: 'tinderbox', name: 'Огниво', nameEn: 'Tinderbox', kind: 'gear', cost: '5 см', weight: 1, tags: ['Снаряжение'] },
  { id: 'healing-potion', name: 'Зелье лечения', nameEn: 'Potion of Healing', kind: 'gear', cost: '50 зм', weight: 0.5, description: 'Действием выпейте или дайте другому: восстановите 2d4 + 2 хитов.', tags: ['Зелье'] },
  { id: 'antitoxin', name: 'Противоядие', nameEn: 'Antitoxin', kind: 'gear', cost: '50 зм', weight: 0, description: 'Бонусным действием: преимущество на спасброски от яда на 1 час.', tags: ['Зелье'] },
  { id: 'caltrops', name: 'Калтропы (20)', nameEn: 'Caltrops', kind: 'gear', cost: '1 зм', weight: 2, description: 'Действием рассыпьте на 5×5 фт. Существо, входящее в зону, получает 1 колющего урона и замедляется.', tags: ['Снаряжение'] },
  { id: 'thieves-tools', name: 'Воровские инструменты', nameEn: "Thieves' Tools", kind: 'tool', cost: '25 зм', weight: 1, description: 'Проверки Ловкости для вскрытия замков и обезвреживания ловушек.', tags: ['Инструмент'] },
  { id: 'calligrapher-tools', name: 'Инструменты каллиграфа', nameEn: "Calligrapher's Supplies", kind: 'tool', cost: '10 зм', weight: 5, tags: ['Инструмент'] },
  { id: 'herbalism-kit', name: 'Набор травника', nameEn: 'Herbalism Kit', kind: 'tool', cost: '5 зм', weight: 3, description: 'Позволяет создавать зелья лечения и противоядия.', tags: ['Инструмент'] },
  { id: 'navigator-tools', name: 'Инструменты навигатора', nameEn: "Navigator's Tools", kind: 'tool', cost: '25 зм', weight: 2, tags: ['Инструмент'] },
  { id: 'cartographer-tools', name: 'Инструменты картографа', nameEn: "Cartographer's Tools", kind: 'tool', cost: '15 зм', weight: 6, tags: ['Инструмент'] },
  { id: 'disguise-kit', name: 'Набор для маскировки', nameEn: 'Disguise Kit', kind: 'tool', cost: '25 зм', weight: 3, tags: ['Инструмент'] },
  { id: 'forgery-kit', name: 'Набор для подделок', nameEn: 'Forgery Kit', kind: 'tool', cost: '15 зм', weight: 5, tags: ['Инструмент'] },
  { id: 'gaming-set', name: 'Игровой набор', nameEn: 'Gaming Set', kind: 'tool', cost: '1 зм', weight: 1, tags: ['Инструмент'] },
  { id: 'musical-instrument', name: 'Музыкальный инструмент', nameEn: 'Musical Instrument', kind: 'tool', cost: '2–35 зм', weight: 3, tags: ['Инструмент'] },
  { id: 'arcane-focus', name: 'Магический фокус', nameEn: 'Arcane Focus', kind: 'focus', cost: '10 зм', weight: 1, tags: ['Фокус'] },
  { id: 'holy-symbol', name: 'Священный символ', nameEn: 'Holy Symbol', kind: 'focus', cost: '5 зм', weight: 1, tags: ['Фокус'] },
  { id: 'druidic-focus', name: 'Друидический фокус', nameEn: 'Druidic Focus', kind: 'focus', cost: '5 зм', weight: 1, tags: ['Фокус'] },
];

/** Наборы, которые можно добавить в инвентарь одним действием. */
export const PACKS: { id: string; name: string; items: { itemId: string; qty: number }[] }[] = [
  {
    id: 'explorer',
    name: 'Набор путешественника',
    items: [
      { itemId: 'backpack', qty: 1 },
      { itemId: 'bedroll', qty: 1 },
      { itemId: 'torch', qty: 10 },
      { itemId: 'rations', qty: 10 },
      { itemId: 'waterskin', qty: 1 },
      { itemId: 'rope', qty: 1 },
      { itemId: 'tinderbox', qty: 1 },
    ],
  },
  {
    id: 'dungeoneer',
    name: 'Набор исследователя подземелий',
    items: [
      { itemId: 'backpack', qty: 1 },
      { itemId: 'caltrops', qty: 1 },
      { itemId: 'oil', qty: 2 },
      { itemId: 'rations', qty: 10 },
      { itemId: 'rope', qty: 1 },
      { itemId: 'torch', qty: 10 },
      { itemId: 'waterskin', qty: 1 },
      { itemId: 'tinderbox', qty: 1 },
    ],
  },
  {
    id: 'burglar',
    name: 'Набор взломщика',
    items: [
      { itemId: 'backpack', qty: 1 },
      { itemId: 'thieves-tools', qty: 1 },
      { itemId: 'rope', qty: 1 },
      { itemId: 'caltrops', qty: 1 },
      { itemId: 'lantern', qty: 1 },
      { itemId: 'oil', qty: 2 },
    ],
  },
  {
    id: 'scholar',
    name: 'Набор учёного',
    items: [
      { itemId: 'backpack', qty: 1 },
      { itemId: 'calligrapher-tools', qty: 1 },
      { itemId: 'lantern', qty: 1 },
      { itemId: 'oil', qty: 2 },
      { itemId: 'rations', qty: 10 },
      { itemId: 'tinderbox', qty: 1 },
    ],
  },
  {
    id: 'priest',
    name: 'Набор священника',
    items: [
      { itemId: 'backpack', qty: 1 },
      { itemId: 'holy-symbol', qty: 1 },
      { itemId: 'rations', qty: 10 },
      { itemId: 'torch', qty: 10 },
      { itemId: 'waterskin', qty: 1 },
    ],
  },
];
