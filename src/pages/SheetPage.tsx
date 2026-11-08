import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AttackEntry, Character } from '../data/types';
import { GLOSSARY, ITEMS, SPELLS, getClass, getSpell } from '../data';
import { ABILITIES, formatMod, rollCheck, rollDice, type Advantage } from '../lib/rules/core';
import {
  applyDamage,
  applyHealing,
  defaultAttack,
  deriveCharacter,
  levelUp,
  longRest,
  makeInventoryItem,
  shortRest,
  spendSlot,
  restoreSlot,
  toggleCondition,
  togglePrepared,
  totalLevel,
  xpProgress,
} from '../lib/rules/character';
import { store, useCharacter } from '../lib/store';
import { Icon, Modal, confirmAction, toast } from '../lib/ui';
import { exportCharacter } from '../lib/files';

interface RollEntry {
  id: number;
  label: string;
  total: number;
  detail: string;
  tone: 'normal' | 'crit' | 'fail';
}

const CONDITIONS = GLOSSARY.filter((g) => g.category === 'Состояние');
const SCHOOL_ABBR: Record<string, string> = {
  Воплощение: 'Вопл.',
  Ограждение: 'Огр.',
  Вызов: 'Выз.',
  Прорицание: 'Пров.',
  Очарование: 'Очар.',
  Иллюзия: 'Илл.',
  Некромантия: 'Некр.',
  Преобразование: 'Преб.',
};

export default function SheetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const character = useCharacter(id);
  const [roll, setRoll] = useState<RollEntry | null>(null);
  const [log, setLog] = useState<RollEntry[]>([]);
  const [restOpen, setRestOpen] = useState(false);
  const [spellOpen, setSpellOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [attackOpen, setAttackOpen] = useState(false);
  const [damageInput, setDamageInput] = useState('');
  const [restDice, setRestDice] = useState(1);
  const [spellQuery, setSpellQuery] = useState('');
  const [itemQuery, setItemQuery] = useState('');

  useEffect(() => {
    if (!roll) return;
    const timer = window.setTimeout(() => setRoll(null), 2400);
    return () => window.clearTimeout(timer);
  }, [roll]);

  const derived = useMemo(
    () => (character ? deriveCharacter(character) : null),
    [character],
  );

  if (!character || !derived) {
    return (
      <div className="page">
        <div className="empty">
          <Icon name="scroll" size={44} />
          <h3>Персонаж не найден</h3>
          <p className="muted">Возможно, он удалён или ссылка ведёт на другого героя.</p>
          <Link className="btn btn-primary" to="/characters">
            К списку персонажей
          </Link>
        </div>
      </div>
    );
  }

  const klass = getClass(character.classes[0]?.classId ?? '');
  const subclass = character.classes[0]?.subclass;

  const update = (fn: (c: Character) => Character) => {
    store.updateCharacter(fn(character));
  };

  const pushLog = (entry: Omit<RollEntry, 'id'>) => {
    const item: RollEntry = { ...entry, id: Date.now() + Math.random() };
    setLog((prev) => [item, ...prev].slice(0, 40));
    setRoll(item);
  };

  const doRoll = (label: string, mod: number, advantage: Advantage = 'none') => {
    const result = rollCheck(mod, { advantage });
    pushLog({
      label,
      total: result.total,
      detail: `${result.advantage === 'adv' ? 'преимущество' : result.advantage === 'dis' ? 'помеха' : 'd20'} [${result.rolls.join(', ')}] ${formatMod(mod)}`,
      tone: result.crit ? 'crit' : result.critFail ? 'fail' : 'normal',
    });
  };

  const rollDamage = (label: string, expression: string) => {
    if (!expression || expression === '—') return;
    try {
      const result = rollDice(expression);
      pushLog({ label, total: result.total, detail: result.text, tone: 'normal' });
    } catch {
      toast('Не удалось разобрать формулу урона', 'danger');
    }
  };

  const damage = () => {
    const value = Number(damageInput);
    if (!value || value <= 0) return;
    update((c) => applyDamage(c, value));
    setDamageInput('');
  };

  const heal = () => {
    const value = Number(damageInput);
    if (!value || value <= 0) return;
    update((c) => applyHealing(c, value));
    setDamageInput('');
  };

  const hpPercent = Math.max(0, Math.min(100, (character.hp.current / Math.max(1, derived.hpMax)) * 100));
  const progress = xpProgress(character);

  return (
    <div className="page sheet">
      {roll ? (
        <div className={`roll-pop ${roll.tone === 'crit' ? 'crit' : roll.tone === 'fail' ? 'fail' : ''}`}>
          <div className="total">{roll.total}</div>
          <div className="desc">
            {roll.label} · {roll.detail}
          </div>
        </div>
      ) : null}

      <div className="page-head no-print" style={{ marginBottom: 4 }}>
        <Link to="/characters" className="tiny" style={{ textDecoration: 'none' }}>
          ← Персонажи
        </Link>
        <div className="page-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => exportCharacter(character)}>
            <Icon name="download" size={14} />
            Экспорт
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            <Icon name="print" size={14} />
            Печать
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              if (confirmAction(`Удалить «${character.name}»? Это необратимо.`)) {
                store.removeCharacter(character.id);
                navigate('/characters');
              }
            }}
          >
            <Icon name="trash" size={14} />
            Удалить
          </button>
        </div>
      </div>

      {/* Шапка листа */}
      <div className="sheet-band">
        <div className="identity">
          <input
            className="input"
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              padding: '2px 4px',
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(24px, 2.6vw, 34px)',
              color: 'var(--text-strong)',
              maxWidth: 520,
            }}
            value={character.name}
            aria-label="Имя персонажа"
            onChange={(e) => update((c) => ({ ...c, name: e.target.value }))}
          />
          <div className="meta">
            <span>
              <b>{derived.species?.name ?? '—'}</b> · {klass?.name ?? '—'}
            </span>
            <span>
              Уровень <b>{totalLevel(character)}</b>
            </span>
            <span>
              Предыстория <b>{derived.background?.name ?? '—'}</b>
            </span>
            <span>
              Владение <b>+{derived.profBonus}</b>
            </span>
            <span>
              Опыт <b>{character.xp}</b>
              {progress.next !== null ? ` / ${progress.next}` : ''}
            </span>
          </div>
          <div className="row wrap no-print" style={{ gap: 6, marginTop: 10 }}>
            <select
              className="select input-sm"
              style={{ width: 210 }}
              value={subclass ?? ''}
              onChange={(e) =>
                update((c) => ({
                  ...c,
                  classes: c.classes.map((cl, idx) => (idx === 0 ? { ...cl, subclass: e.target.value || undefined } : cl)),
                }))
              }
            >
              <option value="">Подкласс не выбран</option>
              {(klass?.subclasses ?? []).map((s) => (
                <option key={s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
            <button className="btn btn-ghost btn-sm" onClick={() => setRestOpen(true)}>
              <Icon name="moon" size={14} />
              Отдых
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={totalLevel(character) >= 20}
              onClick={() => {
                const result = levelUp(character, 'average');
                store.updateCharacter(result.character);
                toast(
                  result.gainedFeatures.length
                    ? `Уровень ${result.character.level}. Новое: ${result.gainedFeatures.join(', ')} (+${result.hpGain} хитов)`
                    : `Уровень ${result.character.level} (+${result.hpGain} хитов)`,
                  'success',
                );
              }}
            >
              <Icon name="arrowRight" size={14} />
              Повысить уровень
            </button>
          </div>
        </div>
        <div style={{ flex: '0 0 auto' }} className="no-print">
          <button className="btn btn-primary" onClick={() => doRoll('Проверка d20', 0)}>
            <Icon name="dice" />
            Бросок d20
          </button>
        </div>
      </div>

      <div className="sheet-grid">
        {/* Левая колонка — характеристики */}
        <div className="col" style={{ gap: 10 }}>
          {ABILITIES.map((a) => {
            const save = derived.saves[a.id];
            return (
              <div key={a.id} className={`ability-box${save.prof ? ' prof' : ''}`}>
                {save.prof ? <span className="prof-dot" title="Владение спасброском" /> : null}
                <div className="abbr">{a.short}</div>
                <div className="score">{character.abilities[a.id]}</div>
                <div className="mod">{formatMod(derived.mods[a.id])}</div>
                <button
                  className="save no-print"
                  style={{ background: 'none', border: 0, cursor: 'pointer', color: 'inherit' }}
                  onClick={() => doRoll(`Спасбросок ${a.name}`, save.mod)}
                >
                  Спас {formatMod(save.mod)}
                  {save.prof ? ' ●' : ''}
                </button>
                <div className="save" style={{ display: 'none' }}>
                  Спас {formatMod(save.mod)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Центр */}
        <div className="col" style={{ gap: 14 }}>
          <div className="vitals">
            <div className="vital">
              <div className="k">КД</div>
              <div className="v">{derived.ac}</div>
            </div>
            <div className="vital">
              <div className="k">Инициатива</div>
              <div className="v">{formatMod(derived.initiative)}</div>
            </div>
            <div className="vital">
              <div className="k">Скорость</div>
              <div className="v">
                {derived.speed} <small>фт.</small>
              </div>
            </div>
            <div className="vital">
              <div className="k">Пасс. Внимательность</div>
              <div className="v">{derived.passivePerception}</div>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Хиты</h3>
              <span className="tiny">{derived.acSource}</span>
            </div>
            <div className="card-pad col" style={{ gap: 10 }}>
              <div className="row-between wrap" style={{ gap: 10 }}>
                <div className="hp-numbers">
                  <span>{character.hp.current}</span>
                  <span className="sep">/</span>
                  <span className="max">{derived.hpMax}</span>
                  {character.hp.temp > 0 ? <span className="chip chip-success">+{character.hp.temp} врем.</span> : null}
                </div>
                <div className="row no-print" style={{ gap: 6 }}>
                  <input
                    className="input input-sm"
                    style={{ width: 78 }}
                    placeholder="число"
                    inputMode="numeric"
                    value={damageInput}
                    onChange={(e) => setDamageInput(e.target.value.replace(/[^\d]/g, ''))}
                  />
                  <button className="btn btn-ghost btn-sm" onClick={damage} style={{ color: 'var(--danger-text)' }}>
                    Урон
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={heal}>
                    Лечить
                  </button>
                </div>
              </div>
              <div className="meter hp">
                <span style={{ width: `${hpPercent}%` }} />
              </div>
              <div className="row wrap" style={{ gap: 8 }}>
                <span className="chip">
                  Кость хитов d{derived.hitDie} · осталось {derived.hitDiceLeft}/{derived.hitDiceTotal}
                </span>
                <span className="chip">
                  <Icon name="heart" size={12} /> Временные: {character.hp.temp}
                </span>
                <button
                  className="btn btn-ghost btn-sm no-print"
                  onClick={() => {
                    const value = window.prompt('Сколько временных хитов выдать?', '5');
                    if (value === null) return;
                    update((c) => ({ ...c, hp: { ...c.hp, temp: Math.max(0, Number(value) || 0) } }));
                  }}
                >
                  Врем. хиты
                </button>
              </div>
            </div>
          </div>

          {/* Атаки */}
          <div className="card">
            <div className="card-head">
              <h3>Атаки</h3>
              <button className="btn btn-ghost btn-sm no-print" onClick={() => setAttackOpen(true)}>
                <Icon name="plus" size={14} />
                Своя атака
              </button>
            </div>
            <div className="card-pad" style={{ paddingTop: 6 }}>
              {derived.attacks.length === 0 ? (
                <p className="hint" style={{ margin: 10 }}>
                  Наденьте оружие в инвентаре — атаки появятся здесь с автоматическим бонусом и уроном.
                </p>
              ) : (
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Оружие</th>
                      <th>Атака</th>
                      <th>Урон</th>
                      <th className="no-print" />
                    </tr>
                  </thead>
                  <tbody>
                    {derived.attacks.map((attack) => (
                      <tr key={attack.id}>
                        <td>
                          <div>{attack.name}</div>
                          <div className="hint">
                            {attack.range ? `${attack.range} · ` : ''}
                            {attack.notes}
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm no-print"
                            onClick={() => doRoll(`${attack.name}: атака`, attack.toHit)}
                          >
                            {formatMod(attack.toHit)}
                          </button>
                          <span className="mono" style={{ display: 'none' }}>
                            {formatMod(attack.toHit)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-ghost btn-sm no-print"
                            onClick={() => rollDamage(`${attack.name}: урон`, attack.damage)}
                          >
                            {attack.damage}
                          </button>
                          <span className="mono" style={{ display: 'none' }}>
                            {attack.damage}
                          </span>
                          <span className="hint"> {attack.damageType}</span>
                        </td>
                        <td className="no-print">
                          {attack.source === 'custom' ? (
                            <button
                              className="icon-btn"
                              title="Удалить атаку"
                              onClick={() =>
                                update((c) => ({ ...c, extraAttacks: c.extraAttacks.filter((a) => a.id !== attack.id) }))
                              }
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Навыки */}
          <div className="card">
            <div className="card-head">
              <h3>Навыки</h3>
              <span className="tiny">клик — бросок</span>
            </div>
            <div className="card-pad">
              <div className="skill-list">
                {derived.skills.map((skill) => (
                  <button
                    key={skill.id}
                    className={`skill-row${skill.prof === 1 ? ' prof' : skill.prof === 2 ? ' exp' : ''}`}
                    style={{ background: 'none', textAlign: 'left', fontFamily: 'inherit', color: 'inherit' }}
                    onClick={() => doRoll(`${skill.name}`, skill.mod)}
                    title={skill.prof === 2 ? 'Компетентность' : skill.prof === 1 ? 'Владение' : 'Без владения'}
                  >
                    <span className="dot" />
                    <span>{skill.name}</span>
                    <span className="ab">{ABILITIES.find((a) => a.id === skill.ability)?.short}</span>
                    <span className="val">{formatMod(skill.mod)}</span>
                  </button>
                ))}
              </div>
              <div className="hint" style={{ marginTop: 8 }}>
                ● владение · ○ без владения. Пассивная Внимательность: {derived.passivePerception}.
              </div>
            </div>
          </div>

          {/* Заклинания */}
          {derived.spellcasting ? (
            <div className="card">
              <div className="card-head">
                <h3>Заклинания</h3>
                <div className="row" style={{ gap: 6 }}>
                  <span className="chip">СЛ {derived.spellcasting.dc}</span>
                  <span className="chip">Атака {formatMod(derived.spellcasting.attack)}</span>
                  <button className="btn btn-ghost btn-sm no-print" onClick={() => setSpellOpen(true)}>
                    <Icon name="plus" size={14} />
                    Добавить
                  </button>
                </div>
              </div>
              <div className="card-pad col" style={{ gap: 12 }}>
                {derived.spellcasting.pact ? (
                  <div>
                    <div className="tiny" style={{ marginBottom: 4 }}>
                      Ячейки договора · {derived.spellcasting.pact.slots} × {derived.spellcasting.pact.level} ур.
                    </div>
                    <div className="slot-track">
                      {Array.from({ length: derived.spellcasting.pact.slots }).map((_, idx) => (
                        <button
                          key={idx}
                          className={`slot-pip${idx < derived.spellcasting!.pact!.used ? ' spent' : ''}`}
                          onClick={() =>
                            update((c) => ({
                              ...c,
                              spells: {
                                ...c.spells,
                                pactUsed:
                                  idx < derived.spellcasting!.pact!.used
                                    ? c.spells.pactUsed - 1
                                    : c.spells.pactUsed + 1,
                              },
                            }))
                          }
                          title={`Ячейка ${idx + 1}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  derived.spellcasting.slots.map((count, index) => {
                    if (!count) return null;
                    const used = derived.spellcasting!.used[index] ?? 0;
                    return (
                      <div key={index}>
                        <div className="tiny" style={{ marginBottom: 4 }}>
                          {index + 1} уровень · {count - used} из {count}
                        </div>
                        <div className="slot-track">
                          {Array.from({ length: count }).map((_, idx) => (
                            <button
                              key={idx}
                              className={`slot-pip${idx < used ? ' spent' : ''}`}
                              onClick={() =>
                                update((c) =>
                                  idx < used ? restoreSlot(c, index + 1) : spendSlot(c, index + 1),
                                )
                              }
                              title={`Ячейка ${index + 1} уровня`}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}

                {character.spells.known.length === 0 ? (
                  <p className="hint">
                    Пока нет заклинаний. Нажмите «Добавить» — список отфильтрован по классу {klass?.name}.
                  </p>
                ) : (
                  <div>
                    {[...character.spells.known]
                      .map((sid) => getSpell(sid))
                      .filter(Boolean)
                      .sort((a, b) => (a!.level - b!.level) || a!.name.localeCompare(b!.name, 'ru'))
                      .map((spell) => {
                        const s = spell!;
                        const prepared = character.spells.prepared.includes(s.id);
                        return (
                          <div key={s.id} className="spell-row">
                            <span className="lvl">{s.level === 0 ? 'заг.' : `${s.level} ур.`}</span>
                            <span className="nm">
                              <Link to={`/compendium/spells/${s.id}`}>{s.name}</Link>{' '}
                              <span className="hint">
                                {s.school} · {s.castingTime} · {s.range}
                                {s.concentration ? ' · конц.' : ''}
                              </span>
                            </span>
                            <button
                              className={`chip${prepared ? ' chip-accent' : ''}`}
                              title={prepared ? 'Подготовлено' : 'Не подготовлено'}
                              onClick={() => update((c) => togglePrepared(c, s.id))}
                            >
                              {prepared ? 'подг.' : '—'}
                            </button>
                            {s.damage ? (
                              <button
                                className="btn btn-ghost btn-sm no-print"
                                onClick={() => rollDamage(`${s.name}: ${s.damageType === 'Лечение' ? 'лечение' : 'урон'}`, s.damage!)}
                                title={`${s.damageType === 'Лечение' ? 'Лечение' : 'Урон'} ${s.damage}`}
                                aria-label={`${s.damageType === 'Лечение' ? 'Лечение' : 'Урон'} ${s.damage}`}
                              >
                                <Icon name="dice" size={13} />
                              </button>
                            ) : null}
                            <button
                              className="icon-btn no-print"
                              title="Убрать"
                              onClick={() =>
                                update((c) => ({
                                  ...c,
                                  spells: {
                                    ...c.spells,
                                    known: c.spells.known.filter((x) => x !== s.id),
                                    prepared: c.spells.prepared.filter((x) => x !== s.id),
                                  },
                                }))
                              }
                            >
                              <Icon name="close" size={14} />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {/* Инвентарь */}
          <div className="card">
            <div className="card-head">
              <h3>Снаряжение</h3>
              <div className="row" style={{ gap: 8 }}>
                <span className="tiny">
                  {derived.carrying.weight} / {derived.carrying.capacity} фнт.
                </span>
                <button className="btn btn-ghost btn-sm no-print" onClick={() => setItemOpen(true)}>
                  <Icon name="plus" size={14} />
                  Добавить
                </button>
              </div>
            </div>
            <div className="card-pad col" style={{ gap: 8 }}>
              {character.inventory.length === 0 ? (
                <p className="hint">Инвентарь пуст. Добавьте оружие, доспех или снаряжение.</p>
              ) : (
                character.inventory.map((item) => (
                  <div key={item.id} className="inv-row">
                    <div className="row" style={{ gap: 8, minWidth: 0 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(item.equipped)}
                        title="Надето / в руках"
                        style={{ accentColor: 'var(--c-a68a64)' }}
                        onChange={(e) =>
                          update((c) => ({
                            ...c,
                            inventory: c.inventory.map((i) =>
                              i.id === item.id ? { ...i, equipped: e.target.checked } : i,
                            ),
                          }))
                        }
                      />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.itemId ? (
                            <Link to={`/compendium/equipment/${item.itemId}`}>{item.name}</Link>
                          ) : (
                            item.name
                          )}
                        </div>
                        {item.notes ? <div className="hint">{item.notes}</div> : null}
                      </div>
                    </div>
                    <input
                      className="input input-sm"
                      type="number"
                      min={0}
                      value={item.qty}
                      aria-label="Количество"
                      onChange={(e) =>
                        update((c) => ({
                          ...c,
                          inventory: c.inventory.map((i) =>
                            i.id === item.id ? { ...i, qty: Math.max(0, Number(e.target.value) || 0) } : i,
                          ),
                        }))
                      }
                    />
                    <span className="hint" style={{ textAlign: 'right' }}>
                      {item.weight ? `${Math.round(item.weight * item.qty * 10) / 10} фнт.` : '—'}
                    </span>
                    <button
                      className="icon-btn no-print"
                      title="Убрать"
                      onClick={() =>
                        update((c) => ({ ...c, inventory: c.inventory.filter((i) => i.id !== item.id) }))
                      }
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  </div>
                ))
              )}
              {derived.carrying.encumbered ? (
                <div className="hint" style={{ color: 'var(--warning)' }}>
                  Вес превышает грузоподъёмность: скорость −10 футов по правилу нагрузки.
                </div>
              ) : null}
              <div className="coins" style={{ marginTop: 6 }}>
                {(
                  [
                    ['pp', 'ПМ'],
                    ['gp', 'ЗМ'],
                    ['ep', 'ЭМ'],
                    ['sp', 'СМ'],
                    ['cp', 'ММ'],
                  ] as [keyof Character['coins'], string][]
                ).map(([key, label]) => (
                  <div key={key} className="coin">
                    <div className="k">{label}</div>
                    <input
                      type="number"
                      min={0}
                      value={character.coins[key]}
                      aria-label={label}
                      onChange={(e) =>
                        update((c) => ({
                          ...c,
                          coins: { ...c.coins, [key]: Math.max(0, Number(e.target.value) || 0) },
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Умения */}
          <div className="card">
            <div className="card-head">
              <h3>Умения и черты</h3>
              <span className="tiny">{character.features.length}</span>
            </div>
            <div className="card-pad">
              {character.features.length === 0 ? (
                <p className="hint">Умения класса появятся автоматически при повышении уровня.</p>
              ) : (
                character.features.map((feature) => (
                  <div key={feature.id} className="feature-block">
                    <h4>
                      {feature.name} <span className="src">· {feature.source}</span>
                    </h4>
                    {feature.text ? <div className="hint">{feature.text}</div> : null}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Заметки */}
          <div className="card">
            <div className="card-head">
              <h3>Заметки</h3>
            </div>
            <div className="card-pad col" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="notes">Заметки, идеи, долги</label>
                <textarea
                  id="notes"
                  className="textarea"
                  value={character.notes}
                  onChange={(e) => update((c) => ({ ...c, notes: e.target.value }))}
                  placeholder="Что нужно не забыть на следующей сессии…"
                />
              </div>
              <div className="field">
                <label htmlFor="appearance">Внешность</label>
                <textarea
                  id="appearance"
                  className="textarea"
                  style={{ minHeight: 70 }}
                  value={character.appearance}
                  onChange={(e) => update((c) => ({ ...c, appearance: e.target.value }))}
                />
              </div>
              <div className="field">
                <label htmlFor="backstory">Предыстория</label>
                <textarea
                  id="backstory"
                  className="textarea"
                  value={character.backstory}
                  onChange={(e) => update((c) => ({ ...c, backstory: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Правая колонка */}
        <div className="col sheet-side" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-head">
              <h3>Состояния</h3>
              <div className="row" style={{ gap: 6 }}>
                <span className="tiny">Истощение</span>
                <select
                  className="select input-sm"
                  style={{ width: 58, minHeight: 28, padding: '2px 20px 2px 8px', backgroundPosition: 'calc(100% - 14px) 12px, calc(100% - 9px) 12px' }}
                  value={character.exhaustion}
                  onChange={(e) => update((c) => ({ ...c, exhaustion: Number(e.target.value) }))}
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="card-pad col" style={{ gap: 8 }}>
              <div className="pill-list">
                {CONDITIONS.map((condition) => {
                  const active = character.conditions.some((c) => c.id === condition.id);
                  return (
                    <button
                      key={condition.id}
                      className={`chip${active ? ' chip-danger' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => update((c) => toggleCondition(c, condition.id))}
                      title={condition.description}
                    >
                      {condition.name}
                    </button>
                  );
                })}
              </div>
              {character.exhaustion > 0 ? (
                <div className="hint" style={{ color: 'var(--warning)' }}>
                  −{character.exhaustion * 2} к проверкам, −{character.exhaustion * 5} фт. скорости
                  {character.exhaustion >= 6 ? '. Смерть.' : ''}
                </div>
              ) : null}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Спасброски от смерти</h3>
            </div>
            <div className="card-pad col" style={{ gap: 8 }}>
              {(
                [
                  ['success', 'Успехи'],
                  ['failure', 'Провалы'],
                ] as ['success' | 'failure', string][]
              ).map(([key, label]) => (
                <div key={key} className="row-between">
                  <span className="hint">{label}</span>
                  <div className="row" style={{ gap: 6 }}>
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        className="icon-btn"
                        style={{ width: 26, height: 26, border: '1px solid var(--border)' }}
                        onClick={() =>
                          update((c) => ({
                            ...c,
                            deathSaves: {
                              ...c.deathSaves,
                              [key]: c.deathSaves[key] >= n ? n - 1 : n,
                            },
                          }))
                        }
                        title={`${label}: ${n}`}
                      >
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: character.deathSaves[key] >= n ? 'var(--c-a68a64)' : 'transparent',
                            border: '1px solid var(--c-a68a64)',
                            display: 'block',
                          }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => update((c) => ({ ...c, deathSaves: { success: 0, failure: 0 } }))}
              >
                Сбросить
              </button>
            </div>
          </div>

          <div className="card no-print">
            <div className="card-head">
              <h3>Журнал бросков</h3>
              <button className="icon-btn" onClick={() => setLog([])} title="Очистить">
                <Icon name="trash" size={14} />
              </button>
            </div>
            <div className="card-pad col" style={{ gap: 6, maxHeight: 300, overflowY: 'auto' }}>
              {log.length === 0 ? (
                <p className="hint">Броски появятся здесь: навыки, спасброски, атаки и урон.</p>
              ) : (
                log.map((entry) => (
                  <div key={entry.id} className="row-between" style={{ fontSize: 13 }}>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.label}
                      <span className="hint"> · {entry.detail}</span>
                    </span>
                    <strong
                      className="mono"
                      style={{
                        color:
                          entry.tone === 'crit'
                            ? 'var(--warning)'
                            : entry.tone === 'fail'
                              ? 'var(--danger)'
                              : 'var(--text)',
                      }}
                    >
                      {entry.total}
                    </strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card no-print">
            <div className="card-head">
              <h3>Быстрые броски</h3>
            </div>
            <div className="card-pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5 }}>
              {[4, 6, 8, 10, 12, 20, 100].map((sides) => (
                <button
                  key={sides}
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    const result = rollDice(`1d${sides}`);
                    pushLog({ label: `d${sides}`, total: result.total, detail: result.text, tone: 'normal' });
                  }}
                >
                  d{sides}
                </button>
              ))}
            </div>
          </div>

          <div className="card no-print">
            <div className="card-head">
              <h3>Тонкая настройка</h3>
            </div>
            <div className="card-pad col" style={{ gap: 10 }}>
              <div className="field">
                <label htmlFor="ac-override">КД вручную</label>
                <input
                  id="ac-override"
                  className="input input-sm"
                  type="number"
                  min={1}
                  max={40}
                  placeholder={`авто: ${derived.ac}`}
                  value={character.acOverride ?? ''}
                  onChange={(e) =>
                    update((c) => ({
                      ...c,
                      acOverride: e.target.value === '' ? null : Math.max(1, Number(e.target.value) || 10),
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="speed-override">Скорость, фт.</label>
                <input
                  id="speed-override"
                  className="input input-sm"
                  type="number"
                  min={0}
                  max={200}
                  placeholder={`авто: ${derived.speed}`}
                  value={character.speedOverride ?? ''}
                  onChange={(e) =>
                    update((c) => ({
                      ...c,
                      speedOverride: e.target.value === '' ? null : Math.max(0, Number(e.target.value) || 0),
                    }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="init-bonus">Бонус инициативы</label>
                <input
                  id="init-bonus"
                  className="input input-sm"
                  type="number"
                  min={-10}
                  max={20}
                  value={character.initiativeBonus ?? 0}
                  onChange={(e) => update((c) => ({ ...c, initiativeBonus: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="hint">
                Пригодится для бездоспешной защиты, магических предметов и особенностей подкласса.
              </div>
            </div>
          </div>

          <div className="card no-print">
            <div className="card-head">
              <h3>За столом</h3>
            </div>
            <div className="card-pad">
              <p className="hint" style={{ margin: 0 }}>
                Откройте комнату и пригласите друзей: Мастер увидит ваш лист, а броски попадут в общий чат.
              </p>
              <Link className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 10 }} to="/rooms">
                <Icon name="map" size={14} />
                Перейти в комнаты
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Модалка отдыха */}
      {restOpen ? (
        <Modal
          title="Отдых"
          onClose={() => setRestOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setRestOpen(false)}>
                Закрыть
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => {
                  const result = shortRest(character, restDice);
                  store.updateCharacter(result.character);
                  setRestOpen(false);
                  toast(`Короткий отдых: восстановлено ${result.healed} хитов (потрачено ${result.spent} кd${derived.hitDie})`, 'success');
                }}
              >
                Короткий отдых
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  store.updateCharacter(longRest(character));
                  setRestOpen(false);
                  toast('Длинный отдых: хиты и ячейки восстановлены', 'success');
                }}
              >
                Длинный отдых (8 ч)
              </button>
            </>
          }
        >
          <div className="col" style={{ gap: 14 }}>
            <p className="hint" style={{ margin: 0 }}>
              Короткий отдых (1 час) позволяет потратить кости хитов. Длинный отдых (8 часов) полностью
              восстанавливает хиты, все потраченные кости хитов и ячейки, а также снимает один уровень истощения.
            </p>
            <div className="field">
              <label>Сколько костей хитов потратить (d{derived.hitDie})</label>
              <input
                className="input"
                type="number"
                min={0}
                max={derived.hitDiceLeft}
                value={restDice}
                onChange={(e) => setRestDice(Math.max(0, Math.min(derived.hitDiceLeft, Number(e.target.value) || 0)))}
              />
              <span className="hint">Доступно: {derived.hitDiceLeft}. Каждая кость лечит d{derived.hitDie} + Телосложение.</span>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* Модалка заклинаний */}
      {spellOpen ? (
        <Modal title="Добавить заклинание" onClose={() => setSpellOpen(false)} wide>
          <div className="col" style={{ gap: 12 }}>
            <div className="searchbar">
              <Icon name="search" />
              <input
                autoFocus
                placeholder="Название или школа…"
                value={spellQuery}
                onChange={(e) => setSpellQuery(e.target.value)}
              />
            </div>
            <div className="hint">
              Показаны заклинания классов: {klass?.name}. На листе можно отметить подготовленные.
            </div>
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              {SPELLS.filter((s) => {
                const forClass = s.classes.includes(character.classes[0]?.classId ?? '');
                const q = spellQuery.trim().toLowerCase();
                const match = !q || s.name.toLowerCase().includes(q) || s.nameEn.toLowerCase().includes(q) || s.school.toLowerCase().includes(q);
                return forClass && match;
              })
                .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, 'ru'))
                .map((spell) => {
                  const added = character.spells.known.includes(spell.id);
                  return (
                    <div key={spell.id} className="spell-row">
                      <span className="lvl">{spell.level === 0 ? 'заг.' : spell.level}</span>
                      <span className="nm">
                        <strong>{spell.name}</strong>{' '}
                        <span className="hint">
                          {SCHOOL_ABBR[spell.school] ?? spell.school} · {spell.castingTime} · {spell.range}
                          {spell.damage ? ` · ${spell.damage} ${spell.damageType ?? ''}` : ''}
                        </span>
                      </span>
                      <button
                        className={`btn btn-sm ${added ? 'btn-ghost' : 'btn-primary'}`}
                        onClick={() => {
                          if (added) {
                            update((c) => ({
                              ...c,
                              spells: {
                                ...c.spells,
                                known: c.spells.known.filter((x) => x !== spell.id),
                                prepared: c.spells.prepared.filter((x) => x !== spell.id),
                              },
                            }));
                          } else {
                            update((c) => ({
                              ...c,
                              spells: {
                                ...c.spells,
                                known: [...c.spells.known, spell.id],
                                prepared: [...c.spells.prepared, spell.id],
                              },
                            }));
                            toast(`${spell.name} добавлено`, 'success');
                          }
                        }}
                      >
                        {added ? 'Убрать' : 'Добавить'}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </Modal>
      ) : null}

      {/* Модалка предметов */}
      {itemOpen ? (
        <Modal title="Добавить предмет" onClose={() => setItemOpen(false)} wide>
          <div className="col" style={{ gap: 12 }}>
            <div className="searchbar">
              <Icon name="search" />
              <input
                autoFocus
                placeholder="Оружие, доспех, снаряжение…"
                value={itemQuery}
                onChange={(e) => setItemQuery(e.target.value)}
              />
            </div>
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {ITEMS.filter((i) => {
                const q = itemQuery.trim().toLowerCase();
                return !q || i.name.toLowerCase().includes(q) || i.nameEn.toLowerCase().includes(q);
              }).map((item) => (
                <div key={item.id} className="spell-row">
                  <span className="nm">
                    <strong>{item.name}</strong>{' '}
                    <span className="hint">
                      {item.damage ? `${item.damage} ${item.damageType}` : ''}
                      {item.acBase ? `КД ${item.acBase}` : ''} {item.cost ? `· ${item.cost}` : ''}
                      {item.weight ? ` · ${item.weight} фнт.` : ''}
                    </span>
                  </span>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      update((c) => ({
                        ...c,
                        inventory: [
                          ...c.inventory,
                          makeInventoryItem({
                            itemId: item.id,
                            name: item.name,
                            qty: 1,
                            weight: item.weight ?? 0,
                            equipped: item.kind === 'weapon' || item.kind === 'armor',
                          }),
                        ],
                      }));
                      toast(`${item.name} добавлено`, 'success');
                    }}
                  >
                    Добавить
                  </button>
                </div>
              ))}
            </div>
            <div className="panel">
              <div className="field">
                <label>Свой предмет</label>
                <div className="row">
                  <input
                    className="input"
                    placeholder="Например, карта подземелья"
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      const name = (e.target as HTMLInputElement).value.trim();
                      if (!name) return;
                      update((c) => ({ ...c, inventory: [...c.inventory, makeInventoryItem({ name, qty: 1, weight: 0 })] }));
                      (e.target as HTMLInputElement).value = '';
                    }}
                  />
                </div>
                <span className="hint">Нажмите Enter, чтобы добавить.</span>
              </div>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* Модалка своей атаки */}
      {attackOpen ? (
        <AttackModal
          onClose={() => setAttackOpen(false)}
          onSubmit={(attack) => {
            update((c) => ({ ...c, extraAttacks: [...c.extraAttacks, attack] }));
            setAttackOpen(false);
            toast('Атака добавлена', 'success');
          }}
        />
      ) : null}
    </div>
  );
}

function AttackModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (attack: AttackEntry) => void }) {
  const [draft, setDraft] = useState<AttackEntry>(defaultAttack());
  return (
    <Modal
      title="Своя атака"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button className="btn btn-primary" onClick={() => onSubmit(draft)}>
            Добавить
          </button>
        </>
      }
    >
      <div className="field-row">
        <div className="field">
          <label>Название</label>
          <input className="input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </div>
        <div className="field">
          <label>Характеристика</label>
          <select
            className="select"
            value={draft.ability}
            onChange={(e) => setDraft({ ...draft, ability: e.target.value as AttackEntry['ability'] })}
          >
            {ABILITIES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            <option value="none">Без модификатора</option>
          </select>
        </div>
        <div className="field">
          <label>Владение</label>
          <label className="check" style={{ paddingTop: 8 }}>
            <input
              type="checkbox"
              checked={draft.proficient}
              onChange={(e) => setDraft({ ...draft, proficient: e.target.checked })}
            />
            Добавлять бонус владения
          </label>
        </div>
        <div className="field">
          <label>Кости урона</label>
          <input
            className="input"
            value={draft.damageDice}
            onChange={(e) => setDraft({ ...draft, damageDice: e.target.value })}
            placeholder="1d8"
          />
        </div>
        <div className="field">
          <label>Тип урона</label>
          <input
            className="input"
            value={draft.damageType}
            onChange={(e) => setDraft({ ...draft, damageType: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Дистанция</label>
          <input className="input" value={draft.range ?? ''} onChange={(e) => setDraft({ ...draft, range: e.target.value })} />
        </div>
      </div>
    </Modal>
  );
}
