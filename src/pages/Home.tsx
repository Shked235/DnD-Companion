import { Link } from 'react-router-dom';
import { CATEGORIES, allEntries, getClass } from '../data';
import { useAppState } from '../lib/store';
import { Icon } from '../lib/ui';
import { deriveCharacter } from '../lib/rules/character';

export default function Home() {
  const state = useAppState();
  const entries = allEntries();
  const recent = [...state.characters].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-inner">
          <div className="eyebrow">Dungeons &amp; Dragons · правила 2024</div>
          <h1>Всё приключение — в одном месте</h1>
          <p>
            Лист персонажа с автоматическими расчётами, игровая комната с картой и общими бросками,
            справочник на {entries.length} записей. Без установки, без подписки, без облака.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/characters/new">
              <Icon name="plus" />
              Создать персонажа
            </Link>
            <Link className="btn btn-ghost" to="/compendium" style={{ color: 'var(--text-strong)', borderColor: 'rgba(240,228,198,0.35)' }}>
              <Icon name="book" />
              Открыть справочник
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-3" style={{ marginBottom: 26 }}>
        <Link className="feature-card" to="/characters">
          <span className="ico">
            <Icon name="users" size={22} />
          </span>
          <h3>Лист персонажа</h3>
          <p>
            Вид, класс, предыстория, характеристики и снаряжение. КД, хиты, спасброски, ячейки и
            атаки считаются сами. Отдых, повышение уровня, экспорт и печать.
          </p>
          <span className="more">Создать героя →</span>
        </Link>
        <Link className="feature-card" to="/rooms">
          <span className="ico">
            <Icon name="map" size={22} />
          </span>
          <h3>Комната для игры</h3>
          <p>
            Вход по коду, роли Мастера и игрока. Карта с сеткой и токенами, трекер инициативы, чат,
            общий лог бросков и хендауты.
          </p>
          <span className="more">Собрать стол →</span>
        </Link>
        <Link className="feature-card" to="/compendium">
          <span className="ico">
            <Icon name="book" size={22} />
          </span>
          <h3>Справочник 2024</h3>
          <p>
            Классы, виды, предыстории, черты, заклинания, оружие с мастерством, магические предметы,
            бестиарий, состояния и ключевые правила.
          </p>
          <span className="more">Искать правило →</span>
        </Link>
      </div>

      <div className="split">
        <div className="col" style={{ gap: 16 }}>
          <div className="row-between">
            <h2 style={{ margin: 0 }}>Мои персонажи</h2>
            {state.characters.length > 0 ? (
              <Link className="btn btn-ghost btn-sm" to="/characters">
                Все ({state.characters.length})
              </Link>
            ) : null}
          </div>
          {recent.length === 0 ? (
            <div className="empty">
              <Icon name="d20" size={44} />
              <h3>Пока ни одного героя</h3>
              <p className="muted">
                Соберите первого персонажа за пару минут — или импортируйте готовый JSON.
              </p>
              <Link className="btn btn-primary" to="/characters/new">
                <Icon name="plus" />
                Начать
              </Link>
            </div>
          ) : (
            <div className="grid grid-auto">
              {recent.map((character) => {
                const derived = deriveCharacter(character);
                const cls = getClass(character.classes[0]?.classId ?? '');
                return (
                  <article key={character.id} className="char-card">
                    <div className="row-between">
                      <Link className="name" to={`/characters/${character.id}`}>
                        {character.name || 'Безымянный герой'}
                      </Link>
                      <span className="chip chip-accent">{character.level} ур.</span>
                    </div>
                    <div className="sub">
                      {derived.species?.name ?? '—'} · {cls?.name ?? '—'}
                      {character.classes[0]?.subclass ? ` (${character.classes[0].subclass})` : ''}
                    </div>
                    <div className="row wrap" style={{ gap: 6 }}>
                      <span className="chip">
                        <Icon name="heart" size={12} /> {character.hp.current}/{derived.hpMax}
                      </span>
                      <span className="chip">
                        <Icon name="shield" size={12} /> КД {derived.ac}
                      </span>
                      <span className="chip">d20 {derived.initiative >= 0 ? '+' : ''}{derived.initiative}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <aside className="card">
          <div className="card-head">
            <h3>Справочник в цифрах</h3>
          </div>
          <div className="card-pad col" style={{ gap: 10 }}>
            {CATEGORIES.map((category) => (
              <Link
                key={category.id}
                to="/compendium"
                state={{ category: category.id }}
                className="row-between"
                style={{ textDecoration: 'none', color: 'inherit', fontSize: 14 }}
              >
                <span>{category.label}</span>
                <span className="chip">{entries.filter((e) => e.category === category.id).length}</span>
              </Link>
            ))}
            <div className="hint" style={{ marginTop: 6 }}>
              Основано на SRD 5.2 (CC BY 4.0). Формулировки механики — авторские, краткие.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
