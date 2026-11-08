import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CATEGORIES,
  getBackground,
  getClass,
  getFeat,
  getGlossaryEntry,
  getItem,
  getMagicItem,
  getMonster,
  getSpecies,
  getSpell,
  type CompendiumCategoryId,
} from '../data';
import { ABILITIES, abilityMod, formatMod, proficiencyBonus } from '../lib/rules/core';
import { Icon } from '../lib/ui';
import type { AbilityScores } from '../data/types';

const SCHOOL_ABBR: Record<string, string> = {
  Воплощение: 'Воплощение',
  Ограждение: 'Ограждение',
  Вызов: 'Вызов',
  Прорицание: 'Прорицание',
  Очарование: 'Очарование',
  Иллюзия: 'Иллюзия',
  Некромантия: 'Некромантия',
  Преобразование: 'Преобразование',
};

function StatLine({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="stat-line">
      <div className="k">{k}</div>
      <div className="v">{children}</div>
    </div>
  );
}

export default function EntryPage() {
  const { category, id } = useParams<{ category: CompendiumCategoryId; id: string }>();
  const cat = CATEGORIES.find((c) => c.id === category);

  if (!category || !cat || !id) return <NotFound />;

  const backLink = (
    <Link to={`/compendium?cat=${category}`} className="tiny" style={{ textDecoration: 'none' }}>
      ← {cat.label}
    </Link>
  );

  if (category === 'classes') {
    const cls = getClass(id);
    if (!cls) return <NotFound />;
    return (
      <Shell category={category} back={backLink} title={cls.name} nameEn={cls.nameEn} chips={[`Кость хитов d${cls.hitDie}`, `Мастерство оружия: ${cls.weaponMastery}`]}>
        <p className="prose">{cls.description}</p>
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-pad">
            <StatLine k="Кость хитов">{`1d${cls.hitDie}`}</StatLine>
            <StatLine k="Основные характеристики">
              {cls.primaryAbilities.map((a) => ABILITIES.find((x) => x.id === a)?.name).join(', ')}
            </StatLine>
            <StatLine k="Спасброски">{cls.saves.map((a) => ABILITIES.find((x) => x.id === a)?.name).join(', ')}</StatLine>
            <StatLine k="Доспехи">{cls.armorTraining.join(', ') || '—'}</StatLine>
            <StatLine k="Оружие">{cls.weaponTraining.join(', ')}</StatLine>
            {cls.toolTraining ? <StatLine k="Инструменты">{cls.toolTraining.join(', ')}</StatLine> : null}
            <StatLine k="Навыки">
              Выберите {cls.skillChoices.count} из: {cls.skillChoices.from.length === 18 ? 'любых' : cls.skillChoices.from.map((s) => skillName(s)).join(', ')}
            </StatLine>
            {cls.spellcasting ? (
              <StatLine k="Заклинания">
                {ABILITIES.find((a) => a.id === cls.spellcasting?.ability)?.name} ·{' '}
                {cls.spellcasting.progression === 'full'
                  ? 'полный заклинатель'
                  : cls.spellcasting.progression === 'half'
                    ? 'полузаклинатель'
                    : 'магия договора'}
                {cls.spellcasting.ritual ? ' · ритуалы' : ''}
                {cls.spellcasting.focus ? ` · фокус: ${cls.spellcasting.focus}` : ''}
              </StatLine>
            ) : null}
            <StatLine k="Снаряжение">{cls.startingEquipment.join('; ')}</StatLine>
            <StatLine k="Золото">{cls.gold}</StatLine>
          </div>
        </div>

        <h3>Умения по уровням</h3>
        <div className="card">
          <table className="table table-sm">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Уровень</th>
                <th>Умение</th>
                <th style={{ width: 90 }}>Владение</th>
              </tr>
            </thead>
            <tbody>
              {cls.features.map((f, idx) => (
                <tr key={`${f.level}-${f.name}-${idx}`}>
                  <td className="mono">{f.level}</td>
                  <td>
                    <strong>{f.name}</strong>
                    {f.text ? <div className="hint" style={{ marginTop: 2 }}>{f.text}</div> : null}
                  </td>
                  <td className="mono">+{proficiencyBonus(f.level)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3>Подклассы</h3>
        <div className="grid grid-2">
          {cls.subclasses.map((s) => (
            <div key={s.name} className="panel">
              <strong>{s.name}</strong>
              <div className="hint" style={{ marginTop: 4 }}>{s.summary}</div>
              <div className="tiny" style={{ marginTop: 6 }}>с {cls.subclassLevel}-го уровня</div>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  if (category === 'species') {
    const sp = getSpecies(id);
    if (!sp) return <NotFound />;
    return (
      <Shell category={category} back={backLink} title={sp.name} nameEn={sp.nameEn} chips={[sp.size, `${sp.speed} фт.`, sp.creatureType]}>
        <p className="prose">{sp.description}</p>
        {sp.darkvision ? <div className="chip chip-accent">Тёмное зрение {sp.darkvision} фт.</div> : null}
        <h3>Черты</h3>
        {sp.traits.map((t) => (
          <div key={t.name} className="feature-block">
            <h4>{t.name}</h4>
            <div className="hint">{t.text}</div>
          </div>
        ))}
        {sp.lineages ? (
          <>
            <h3>Наследия</h3>
            <div className="grid grid-2">
              {sp.lineages.map((l) => (
                <div key={l.name} className="panel">
                  <strong>{l.name}</strong>
                  <div className="hint" style={{ marginTop: 4 }}>{l.text}</div>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </Shell>
    );
  }

  if (category === 'backgrounds') {
    const bg = getBackground(id);
    if (!bg) return <NotFound />;
    const feat = getFeat(bg.featId);
    return (
      <Shell category={category} back={backLink} title={bg.name} nameEn={bg.nameEn} chips={['Предыстория']}>
        <p className="prose">{bg.description}</p>
        <div className="card">
          <div className="card-pad">
            <StatLine k="Характеристики">
              {bg.abilities.map((a) => ABILITIES.find((x) => x.id === a)?.name).join(', ')} — +2/+1 или +1/+1/+1
            </StatLine>
            <StatLine k="Черта">
              {feat ? <Link to={`/compendium/feats/${feat.id}`}>{feat.name}</Link> : bg.featId}
            </StatLine>
            <StatLine k="Навыки">{bg.skillIds.map((s) => skillName(s)).join(', ')}</StatLine>
            <StatLine k="Инструмент">{bg.tool}</StatLine>
            <StatLine k="Снаряжение">{bg.equipment.join('; ')}</StatLine>
          </div>
        </div>
      </Shell>
    );
  }

  if (category === 'feats') {
    const feat = getFeat(id);
    if (!feat) return <NotFound />;
    return (
      <Shell category={category} back={backLink} title={feat.name} nameEn={feat.nameEn} chips={[feat.category, feat.repeatable ? 'можно брать повторно' : '']}>
        <p className="prose">{feat.description}</p>
        {feat.prerequisite ? <div className="panel">Требование: {feat.prerequisite}</div> : null}
        <h3>Как это работает</h3>
        <p className="hint">
          Черты даются предысторией, классами (боевые стили) или вместо увеличения характеристик на
          уровнях 4, 8, 12 и 16. Эпические дары доступны с 19-го уровня.
        </p>
      </Shell>
    );
  }

  if (category === 'spells') {
    const spell = getSpell(id);
    if (!spell) return <NotFound />;
    return (
      <Shell
        category={category}
        back={backLink}
        title={spell.name}
        nameEn={spell.nameEn}
        chips={[spell.level === 0 ? 'Заговор' : `${spell.level} уровень`, SCHOOL_ABBR[spell.school] ?? spell.school, spell.concentration ? 'концентрация' : '', spell.ritual ? 'ритуал' : '']}
      >
        <div className="card">
          <div className="card-pad">
            <StatLine k="Время"> {spell.castingTime}</StatLine>
            <StatLine k="Дистанция">{spell.range}</StatLine>
            <StatLine k="Компоненты">{spell.components}</StatLine>
            <StatLine k="Длительность">{spell.duration}</StatLine>
            {spell.damage ? (
              <StatLine k="Урон/эффект">
                {spell.damage} {spell.damageType ?? ''}
                {spell.attackRoll ? ' · бросок атаки' : ''}
                {spell.savingThrow ? ` · спасбросок ${ABILITIES.find((a) => a.id === spell.savingThrow)?.name}` : ''}
              </StatLine>
            ) : null}
            <StatLine k="Классы">
              {spell.classes.map((c) => {
                const cls = getClass(c);
                return cls ? (
                  <Link key={c} to={`/compendium/classes/${c}`} style={{ marginRight: 8 }}>
                    {cls.name}
                  </Link>
                ) : (
                  c
                );
              })}
            </StatLine>
          </div>
        </div>
        <p className="prose" style={{ marginTop: 14 }}>{spell.description}</p>
        {spell.upcast ? (
          <div className="panel panel-brown">
            <strong>Усиление</strong>
            <div className="hint" style={{ marginTop: 4 }}>{spell.upcast}</div>
          </div>
        ) : null}
      </Shell>
    );
  }

  if (category === 'equipment') {
    const item = getItem(id);
    if (!item) return <NotFound />;
    return (
      <Shell
        category={category}
        back={backLink}
        title={item.name}
        nameEn={item.nameEn}
        chips={[
          item.kind === 'weapon' ? 'Оружие' : item.kind === 'armor' ? 'Доспех' : item.kind === 'shield' ? 'Щит' : 'Снаряжение',
          item.cost ?? '',
        ]}
      >
        <div className="card">
          <div className="card-pad">
            {item.damage ? <StatLine k="Урон">{`${item.damage} ${item.damageType ?? ''}`}</StatLine> : null}
            {item.properties?.length ? <StatLine k="Свойства">{item.properties.join(', ')}</StatLine> : null}
            {item.mastery ? <StatLine k="Мастерство">{item.mastery}</StatLine> : null}
            {item.range ? <StatLine k="Дистанция">{item.range}</StatLine> : null}
            {item.acBase ? <StatLine k="КД">{item.armorType === 'light' ? `${item.acBase} + Ловкость` : item.acBase}</StatLine> : null}
            {item.armorType ? (
              <StatLine k="Тип">
                {item.armorType === 'light' ? 'Лёгкий' : item.armorType === 'medium' ? 'Средний' : 'Тяжёлый'}
                {item.acDexMax !== undefined && item.acDexMax !== null && item.armorType !== 'heavy' ? ` · макс. Ловкость +${item.acDexMax === 99 ? '∞' : item.acDexMax}` : ''}
              </StatLine>
            ) : null}
            {item.strReq ? <StatLine k="Требование">{`Сила ${item.strReq}`}</StatLine> : null}
            {item.stealthDisadv ? <StatLine k="Скрытность">Помеха</StatLine> : null}
            <StatLine k="Вес">{item.weight ? `${item.weight} фнт.` : '—'}</StatLine>
          </div>
        </div>
        {item.description ? <p className="prose" style={{ marginTop: 14 }}>{item.description}</p> : null}
      </Shell>
    );
  }

  if (category === 'magic-items') {
    const item = getMagicItem(id);
    if (!item) return <NotFound />;
    return (
      <Shell category={category} back={backLink} title={item.name} nameEn={item.nameEn} chips={[item.rarity, item.attunement ? 'требует настройки' : 'без настройки']}>
        <p className="prose">{item.description}</p>
        <div className="panel">
          <div className="hint">
            Тип: {item.type}. Редкость: {item.rarity}. {item.attunement ? 'Требуется настройка (короткий отдых, до трёх предметов).' : 'Настройка не требуется.'}
          </div>
        </div>
      </Shell>
    );
  }

  if (category === 'bestiary') {
    const monster = getMonster(id);
    if (!monster) return <NotFound />;
    return (
      <Shell
        category={category}
        back={backLink}
        title={monster.name}
        nameEn={monster.nameEn}
        chips={[monster.size, monster.type, `CR ${monster.cr}`]}
      >
        {monster.description ? <p className="prose">{monster.description}</p> : null}
        <div className="card" style={{ marginTop: 8 }}>
          <div className="card-pad">
            <StatLine k="КД">{monster.ac}</StatLine>
            <StatLine k="Хиты">{monster.hp}</StatLine>
            <StatLine k="Скорость">{monster.speeds}</StatLine>
            {monster.saves ? <StatLine k="Спасброски">{monster.saves}</StatLine> : null}
            {monster.skills ? <StatLine k="Навыки">{monster.skills}</StatLine> : null}
            <StatLine k="Чувства">{monster.senses ?? '—'}</StatLine>
            <StatLine k="Языки">{monster.languages ?? '—'}</StatLine>
            <StatLine k="Опасность">CR {monster.cr}{monster.xp ? ` (${monster.xp} опыта)` : ''}</StatLine>
          </div>
        </div>

        <div className="grid grid-3" style={{ marginTop: 12, gap: 8 }}>
          {ABILITIES.map((a) => (
            <div key={a.id} className="vital">
              <div className="k">{a.short}</div>
              <div className="v" style={{ fontSize: 19 }}>
                {monster.abilities[a.id as keyof AbilityScores]}{' '}
                <small>{formatMod(abilityMod(monster.abilities[a.id as keyof AbilityScores]))}</small>
              </div>
            </div>
          ))}
        </div>

        {monster.traits?.length ? (
          <>
            <h3>Особенности</h3>
            {monster.traits.map((t) => (
              <div key={t.name} className="feature-block">
                <h4>{t.name}</h4>
                <div className="hint">{t.text}</div>
              </div>
            ))}
          </>
        ) : null}

        <h3>Действия</h3>
        {monster.actions.map((t) => (
          <div key={t.name} className="feature-block">
            <h4>{t.name}</h4>
            <div className="hint">{t.text}</div>
          </div>
        ))}
        {monster.bonusActions?.length ? (
          <>
            <h3>Бонусные действия</h3>
            {monster.bonusActions.map((t) => (
              <div key={t.name} className="feature-block">
                <h4>{t.name}</h4>
                <div className="hint">{t.text}</div>
              </div>
            ))}
          </>
        ) : null}
        {monster.reactions?.length ? (
          <>
            <h3>Реакции</h3>
            {monster.reactions.map((t) => (
              <div key={t.name} className="feature-block">
                <h4>{t.name}</h4>
                <div className="hint">{t.text}</div>
              </div>
            ))}
          </>
        ) : null}
      </Shell>
    );
  }

  // conditions & rules
  const entry = getGlossaryEntry(id);
  if (!entry) return <NotFound />;
  return (
    <Shell category={category} back={backLink} title={entry.name} nameEn={entry.nameEn} chips={[entry.category]}>
      <p className="prose" style={{ whiteSpace: 'pre-line' }}>{entry.description}</p>
      {entry.bullets?.length ? (
        <ul className="prose">
          {entry.bullets.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      ) : null}
      <div className="panel">
        <div className="hint">
          Это краткая механическая выжимка. Если правило в вашей книге отличается формулировкой — приоритет у
          книги, а не у конспекта.
        </div>
      </div>
    </Shell>
  );
}

function skillName(id: string): string {
  const map: Record<string, string> = {
    acrobatics: 'Акробатика',
    animal: 'Обращение с животными',
    arcana: 'Магия',
    athletics: 'Атлетика',
    deception: 'Обман',
    history: 'История',
    insight: 'Проницательность',
    intimidation: 'Запугивание',
    investigation: 'Анализ',
    medicine: 'Медицина',
    nature: 'Природа',
    perception: 'Внимательность',
    performance: 'Выступление',
    persuasion: 'Убеждение',
    religion: 'Религия',
    sleight: 'Ловкость рук',
    stealth: 'Скрытность',
    survival: 'Выживание',
  };
  return map[id] ?? id;
}

function NotFound() {
  return (
    <div className="page">
      <div className="empty">
        <Icon name="book" size={42} />
        <h3>Запись не найдена</h3>
        <p className="muted">Возможно, ссылка устарела.</p>
        <Link className="btn btn-primary" to="/compendium">
          В справочник
        </Link>
      </div>
    </div>
  );
}

function Shell({
  category,
  back,
  title,
  nameEn,
  chips,
  children,
}: {
  category: CompendiumCategoryId;
  back: ReactNode;
  title: string;
  nameEn: string;
  chips: string[];
  children: ReactNode;
}) {
  const cat = CATEGORIES.find((c) => c.id === category);
  return (
    <div className="page">
      <div style={{ marginBottom: 8 }}>{back}</div>
      <div className="entry-detail">
        <div>
          <div className="entry-title">
            <h1>{title}</h1>
            <div className="en">{nameEn}</div>
            <div className="row wrap" style={{ gap: 6, marginTop: 10 }}>
              <span className="badge badge-accent">{cat?.label}</span>
              {chips.filter(Boolean).map((chip) => (
                <span key={chip} className="chip">
                  {chip}
                </span>
              ))}
            </div>
          </div>
          {children}
        </div>
        <aside className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <h3>Раздел</h3>
            </div>
            <div className="card-pad col" style={{ gap: 4 }}>
              {CATEGORIES.filter((c) => c.group === cat?.group).map((c) => (
                <Link
                  key={c.id}
                  className="toc-link"
                  to={`/compendium?cat=${c.id}`}
                  style={{ fontWeight: c.id === category ? 600 : 400 }}
                >
                  {c.label}
                </Link>
              ))}
              <div className="hint" style={{ marginTop: 8 }}>
                {cat?.description}
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-head">
              <h3>Источник</h3>
            </div>
            <div className="card-pad">
              <div className="hint">
                Основано на правилах Dungeons &amp; Dragons 5e (2024) и SRD 5.2 (CC BY 4.0). Формулировки —
                авторский конспект механики.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
