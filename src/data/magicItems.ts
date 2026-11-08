import type { MagicItem } from './types';

/** Магические предметы: редкость, настройка и краткая механика. */
export const MAGIC_ITEMS: MagicItem[] = [
  {
    id: 'potion-of-healing', name: 'Зелье лечения', nameEn: 'Potion of Healing', type: 'Зелье',
    rarity: 'Варьируется', attunement: false,
    description: 'Действием выпить или дать другому: 2d4 + 2 хитов. Улучшенные версии: большое (4d4 + 4, редкое), превосходное (8d4 + 8, очень редкое), высшее (10d4 + 20, легендарное).',
    tags: ['лечение'],
  },
  {
    id: 'bag-of-holding', name: 'Сумка хранения', nameEn: 'Bag of Holding', type: 'Чудесный предмет',
    rarity: 'Необычный', attunement: false,
    description: 'Внутреннее пространство 64 кубических фута, вмещает до 500 фунтов; весит всегда 15 фунтов. Если проколоть или вывернуть — всё высыпается.',
    tags: ['хранение'],
  },
  {
    id: 'immovable-rod', name: 'Неподвижный жезл', nameEn: 'Immovable Rod', type: 'Жезл',
    rarity: 'Необычный', attunement: false,
    description: 'Кнопка фиксирует жезл в пространстве: он держит до 8000 фунтов. Повторное нажатие освобождает.',
    tags: ['утварь'],
  },
  {
    id: 'boots-of-elvenkind', name: 'Эльфийские сапоги', nameEn: 'Boots of Elvenkind', type: 'Обувь',
    rarity: 'Необычный', attunement: false,
    description: 'Ваши шаги не издают звука. Вы совершаете проверки Скрытности с преимуществом.',
    tags: ['скрытность'],
  },
  {
    id: 'cloak-of-protection', name: 'Плащ защиты', nameEn: 'Cloak of Protection', type: 'Плащ',
    rarity: 'Необычный', attunement: true,
    description: '+1 к КД и всем спасброскам.',
    tags: ['защита'],
  },
  {
    id: 'ring-of-protection', name: 'Кольцо защиты', nameEn: 'Ring of Protection', type: 'Кольцо',
    rarity: 'Редкий', attunement: true,
    description: '+1 к КД и всем спасброскам.',
    tags: ['защита'],
  },
  {
    id: 'amulet-of-health', name: 'Амулет здоровья', nameEn: 'Amulet of Health', type: 'Амулет',
    rarity: 'Редкий', attunement: true,
    description: 'Ваше Телосложение становится 19, если не было выше.',
    tags: ['характеристики'],
  },
  {
    id: 'gauntlets-of-ogre-power', name: 'Рукавицы силы огра', nameEn: 'Gauntlets of Ogre Power', type: 'Рукавицы',
    rarity: 'Необычный', attunement: true,
    description: 'Ваша Сила становится 19, если не была выше.',
    tags: ['характеристики'],
  },
  {
    id: 'headband-of-intellect', name: 'Обруч интеллекта', nameEn: 'Headband of Intellect', type: 'Головной убор',
    rarity: 'Необычный', attunement: true,
    description: 'Ваш Интеллект становится 19, если не был выше.',
    tags: ['характеристики'],
  },
  {
    id: 'wand-of-magic-missiles', name: 'Волшебная палочка снарядов', nameEn: 'Wand of Magic Missiles', type: 'Палочка',
    rarity: 'Необычный', attunement: false,
    description: '7 зарядов. Действием потратьте 1–3 заряда: «Волшебная стрела» с тем же числом дротиков. На рассвете восстанавливает 1d6 + 1 заряд; при нуле зарядов может рассыпаться.',
    tags: ['магия'],
  },
  {
    id: 'pearl-of-power', name: 'Жемчужина силы', nameEn: 'Pearl of Power', type: 'Чудесный предмет',
    rarity: 'Необычный', attunement: true,
    description: 'Действием восстановите одну израсходованную ячейку заклинаний 3-го уровня или ниже. Раз за длинный отдых.',
    tags: ['заклинания'],
  },
  {
    id: 'bracers-of-defense', name: 'Наручи защиты', nameEn: 'Bracers of Defense', type: 'Наручи',
    rarity: 'Редкий', attunement: true,
    description: '+2 к КД, если вы не носите доспехов и не используете щит.',
    tags: ['защита'],
  },
  {
    id: 'flame-tongue', name: 'Пламенный язык', nameEn: 'Flame Tongue', type: 'Оружие',
    rarity: 'Редкий', attunement: true,
    description: 'Бонусным действием оружие вспыхивает пламенем: +2d6 урона огнём и яркий свет 40 футов. Гаснет бонусным действием.',
    tags: ['урон'],
  },
  {
    id: 'cloak-of-displacement', name: 'Плащ смещения', nameEn: 'Cloak of Displacement', type: 'Плащ',
    rarity: 'Редкий', attunement: true,
    description: 'Атаки по вам совершаются с помехой, пока вы не получили урон; эффект возвращается в начале вашего следующего хода.',
    tags: ['защита'],
  },
  {
    id: 'staff-of-power', name: 'Посох силы', nameEn: 'Staff of Power', type: 'Посох',
    rarity: 'Очень редкий', attunement: true,
    description: '+2 к броскам атаки и урону, +2 к КД и спасброскам, 20 зарядов для мощных заклинаний. При 0 зарядах может взорваться.',
    tags: ['магия'],
  },
  {
    id: 'belt-of-giant-strength', name: 'Пояс силы великана', nameEn: 'Belt of Giant Strength', type: 'Пояс',
    rarity: 'Варьируется', attunement: true,
    description: 'Сила становится 21 (холмовой, редкий), 23 (каменный/ледяной, очень редкий), 25 (огненный, очень редкий) или 27 (облачный, легендарный).',
    tags: ['характеристики'],
  },
  {
    id: 'deck-of-many-things', name: 'Колода многих вещей', nameEn: 'Deck of Many Things', type: 'Чудесный предмет',
    rarity: 'Легендарный', attunement: false,
    description: 'Колода карт с непредсказуемыми эффектами: от богатства и повышения уровня до изгнания души в другой план. Опасный предмет.',
    tags: ['хаос'],
  },
  {
    id: 'vorpal-sword', name: 'Меч отсечения', nameEn: 'Vorpal Sword', type: 'Оружие',
    rarity: 'Легендарный', attunement: true,
    description: '+3 к атаке и урону. При «20» на d20 вы отрубаете цель, если у неё есть голова; иначе наносите +6d8 урона.',
    tags: ['урон'],
  },
];
