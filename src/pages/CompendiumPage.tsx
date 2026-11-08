import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  CATEGORIES,
  SPELLS,
  ITEMS,
  MONSTERS,
  MAGIC_ITEMS,
  CLASSES,
  entriesByCategory,
  searchEntries,
  type CompendiumCategoryId,
  type CompendiumEntry,
} from '../data';
import { Icon } from '../lib/ui';

const SCHOOLS = ['Воплощение', 'Ограждение', 'Вызов', 'Прорицание', 'Очарование', 'Иллюзия', 'Некромантия', 'Преобразование'];
const EQUIPMENT_KINDS: Record<string, string> = {
  weapon: 'Оружие',
  armor: 'Доспех',
  shield: 'Щит',
  gear: 'Снаряжение',
  tool: 'Инструмент',
  focus: 'Фокус',
};
const RARITIES = ['Обычный', 'Необычный', 'Редкий', 'Очень редкий', 'Легендарный', 'Артефакт', 'Варьируется'];
const CR_LIST = ['0', '1/8', '1/4', '1/2', '1', '2', '3', '5', '10', '13', '21', '24'];

export default function CompendiumPage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const initial = (params.get('cat') as CompendiumCategoryId | null) ?? (location.state as { category?: CompendiumCategoryId } | null)?.category ?? 'classes';
  const [category, setCategory] = useState<CompendiumCategoryId>(initial);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [level, setLevel] = useState('');
  const [school, setSchool] = useState('');
  const [spellClass, setSpellClass] = useState('');
  const [kind, setKind] = useState('');
  const [rarity, setRarity] = useState('');
  const [cr, setCr] = useState('');

  useEffect(() => {
    const next = new URLSearchParams();
    next.set('cat', category);
    if (query) next.set('q', query);
    setParams(next, { replace: true });
  }, [category, query]);

  const entries = useMemo(() => {
    if (query.trim()) return searchEntries(query);
    let list = entriesByCategory(category);
    if (category === 'spells') {
      if (level) list = list.filter((e) => (level === '0' ? e.meta[0] === 'Заговор' : e.meta[0].startsWith(`${level} `)));
      if (school) list = list.filter((e) => e.meta.includes(school));
      if (spellClass) list = list.filter((e) => e.meta.includes(CLASSES.find((c) => c.id === spellClass)?.name ?? ''));
    }
    if (category === 'equipment' && kind) list = list.filter((e) => e.meta[0] === EQUIPMENT_KINDS[kind]);
    if (category === 'magic-items' && rarity) list = list.filter((e) => e.meta.includes(rarity));
    if (category === 'bestiary' && cr) list = list.filter((e) => e.meta.includes(`CR ${cr}`));
    return list;
  }, [category, query, level, school, spellClass, kind, rarity, cr]);

  const activeCategory = CATEGORIES.find((c) => c.id === category);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Справочник</h1>
          <p className="lead">
            {query.trim()
              ? `Поиск «${query}» по всем разделам`
              : activeCategory?.description}
          </p>
        </div>
        <div className="page-actions">
          <span className="chip">{entries.length} записей</span>
        </div>
      </div>

      <div className="ref-layout">
        <nav className="ref-nav" aria-label="Разделы справочника">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={category === c.id && !query ? 'active' : ''}
              onClick={() => {
                setCategory(c.id);
                setQuery('');
                setLevel('');
                setSchool('');
                setSpellClass('');
                setKind('');
                setRarity('');
                setCr('');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '7px 10px',
                border: '1px solid transparent',
                borderRadius: 4,
                background: 'transparent',
                color: 'inherit',
                fontFamily: 'inherit',
                fontSize: 14,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span>{c.label}</span>
              <span className="count">{entriesByCategory(c.id).length}</span>
            </button>
          ))}
        </nav>

        <div className="col" style={{ gap: 16 }}>
          <div className="searchbar">
            <Icon name="search" />
            <input
              placeholder="Найти заклинание, правило, монстра…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Поиск по справочнику"
            />
            {query ? (
              <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setQuery('')} aria-label="Очистить">
                <Icon name="close" size={14} />
              </button>
            ) : (
              <kbd>/</kbd>
            )}
          </div>

          {!query ? (
            <div className="filters">
              {category === 'spells' ? (
                <>
                  <select className="select" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Уровень заклинания">
                    <option value="">Любой уровень</option>
                    <option value="0">Заговор</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                      <option key={n} value={String(n)}>
                        {n} уровень
                      </option>
                    ))}
                  </select>
                  <select className="select" value={school} onChange={(e) => setSchool(e.target.value)} aria-label="Школа">
                    <option value="">Любая школа</option>
                    {SCHOOLS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <select className="select" value={spellClass} onChange={(e) => setSpellClass(e.target.value)} aria-label="Класс">
                    <option value="">Все классы</option>
                    {CLASSES.filter((c) => c.spellcasting).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : null}
              {category === 'equipment' ? (
                <select className="select" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Тип снаряжения">
                  <option value="">Всё снаряжение</option>
                  {Object.entries(EQUIPMENT_KINDS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              ) : null}
              {category === 'magic-items' ? (
                <select className="select" value={rarity} onChange={(e) => setRarity(e.target.value)} aria-label="Редкость">
                  <option value="">Любая редкость</option>
                  {RARITIES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : null}
              {category === 'bestiary' ? (
                <select className="select" value={cr} onChange={(e) => setCr(e.target.value)} aria-label="Опасность">
                  <option value="">Любая опасность</option>
                  {CR_LIST.map((value) => (
                    <option key={value} value={value}>
                      CR {value}
                    </option>
                  ))}
                </select>
              ) : null}
              {(level || school || spellClass || kind || rarity || cr) ? (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    setLevel('');
                    setSchool('');
                    setSpellClass('');
                    setKind('');
                    setRarity('');
                    setCr('');
                  }}
                >
                  Сбросить
                </button>
              ) : null}
              <span className="hint" style={{ marginLeft: 'auto' }}>
                {category === 'spells'
                  ? `${SPELLS.length} заклинаний в базе`
                  : category === 'equipment'
                    ? `${ITEMS.length} предметов`
                    : category === 'bestiary'
                      ? `${MONSTERS.length} существ`
                      : category === 'magic-items'
                        ? `${MAGIC_ITEMS.length} артефактов`
                        : ''}
              </span>
            </div>
          ) : null}

          {entries.length === 0 ? (
            <div className="empty">
              <Icon name="search" size={40} />
              <h3>Ничего не найдено</h3>
              <p className="muted">Попробуйте другое слово — поиск идёт по названию и описанию.</p>
            </div>
          ) : (
            <div className="entry-grid">
              {entries.map((entry) => (
                <EntryCard key={`${entry.category}:${entry.id}`} entry={entry} showCategory={Boolean(query)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EntryCard({ entry, showCategory = false }: { entry: CompendiumEntry; showCategory?: boolean }) {
  const cat = CATEGORIES.find((c) => c.id === entry.category);
  return (
    <Link className="entry-card" to={`/compendium/${entry.category}/${entry.id}`}>
      <div className="row-between" style={{ gap: 8 }}>
        <div className="t">
          {entry.name}
          <span className="en">{entry.nameEn}</span>
        </div>
      </div>
      <div className="d">{entry.summary}</div>
      <div className="tags">
        {showCategory ? <span className="badge badge-accent">{cat?.short}</span> : null}
        {entry.meta.slice(0, 3).map((m) => (
          <span key={m} className="chip">
            {m}
          </span>
        ))}
      </div>
    </Link>
  );
}
