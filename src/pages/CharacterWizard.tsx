import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { AbilityId, AbilityScores, SkillId } from '../data/types';
import { BACKGROUNDS, CLASSES, SPECIES, getBackground, getClass, getSpecies } from '../data';
import { ABILITIES, SKILLS, abilityMod, formatMod, pointBuySum, rollDie } from '../lib/rules/core';
import { createCharacter, deriveCharacter } from '../lib/rules/character';
import { startingKit } from '../lib/kit';
import { store } from '../lib/store';
import { Icon, confirmAction, toast } from '../lib/ui';

type Method = 'standard' | 'pointbuy' | 'roll' | 'manual';

const STANDARD = [15, 14, 13, 12, 10, 8];

const DEFAULT_SCORES: AbilityScores = { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 };

const DRAFT_KEY = 'dnd-companion:wizard-draft';

interface WizardDraft {
  name?: string;
  speciesId?: string;
  classId?: string;
  backgroundId?: string;
  level?: number;
  method?: Method;
  base?: AbilityScores;
  rolled?: number[] | null;
  bonusMode?: '2/1' | '1/1/1';
  bonusPicks?: { a: AbilityId; b: AbilityId; c: AbilityId };
  pickedSkills?: SkillId[];
  withKit?: boolean;
}

function readDraft(): WizardDraft {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as WizardDraft) : {};
  } catch {
    return {};
  }
}

export default function CharacterWizard() {
  const navigate = useNavigate();
  const [draft] = useState<WizardDraft>(() => readDraft());
  const [name, setName] = useState(draft.name ?? '');
  const [speciesId, setSpeciesId] = useState(() =>
    SPECIES.some((s) => s.id === draft.speciesId) ? draft.speciesId! : 'human',
  );
  const [classId, setClassId] = useState(() =>
    CLASSES.some((c) => c.id === draft.classId) ? draft.classId! : 'fighter',
  );
  const [backgroundId, setBackgroundId] = useState(() =>
    BACKGROUNDS.some((b) => b.id === draft.backgroundId) ? draft.backgroundId! : 'soldier',
  );
  const [level, setLevel] = useState(() => Math.min(20, Math.max(1, draft.level ?? 1)));
  const [method, setMethod] = useState<Method>(() =>
    ['standard', 'pointbuy', 'roll', 'manual'].includes(draft.method ?? '') ? draft.method! : 'standard',
  );
  const [base, setBase] = useState<AbilityScores>(() => ({ ...DEFAULT_SCORES, ...(draft.base ?? {}) }));
  const [rolled, setRolled] = useState<number[] | null>(draft.rolled ?? null);
  const [bonusMode, setBonusMode] = useState<'2/1' | '1/1/1'>(draft.bonusMode ?? '2/1');
  const [bonusPicks, setBonusPicks] = useState<{ a: AbilityId; b: AbilityId; c: AbilityId }>(
    draft.bonusPicks ?? { a: 'str', b: 'con', c: 'dex' },
  );
  const [pickedSkills, setPickedSkills] = useState<SkillId[]>(draft.pickedSkills ?? []);
  const [withKit, setWithKit] = useState(draft.withKit ?? true);
  const prevClass = useRef(classId);

  const species = getSpecies(speciesId);
  const klass = getClass(classId);
  const background = getBackground(backgroundId);

  useEffect(() => {
    if (!background) return;
    setBonusPicks((prev) => {
      const allowed = new Set(background.abilities);
      if (allowed.has(prev.a) && allowed.has(prev.b) && allowed.has(prev.c)) return prev;
      const [a, b, c] = background.abilities;
      return { a, b, c };
    });
  }, [backgroundId, background]);

  useEffect(() => {
    if (prevClass.current !== classId) {
      setPickedSkills([]);
      prevClass.current = classId;
    }
  }, [classId]);

  useEffect(() => {
    const data: WizardDraft = {
      name,
      speciesId,
      classId,
      backgroundId,
      level,
      method,
      base,
      rolled,
      bonusMode,
      bonusPicks,
      pickedSkills,
      withKit,
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    } catch {
      /* приватный режим — просто не сохраняем */
    }
  }, [name, speciesId, classId, backgroundId, level, method, base, rolled, bonusMode, bonusPicks, pickedSkills, withKit]);

  const bonusFor = (ability: AbilityId): number => {
    if (!background) return 0;
    const allowed = background.abilities.includes(ability);
    if (!allowed) return 0;
    if (bonusMode === '2/1') {
      return (bonusPicks.a === ability ? 2 : 0) + (bonusPicks.b === ability ? 1 : 0);
    }
    return [bonusPicks.a, bonusPicks.b, bonusPicks.c].filter((x) => x === ability).length;
  };

  const finalAbilities = useMemo(() => {
    const out = {} as AbilityScores;
    for (const a of ABILITIES) out[a.id] = Math.min(20, base[a.id] + bonusFor(a.id));
    return out;
  }, [base, bonusPicks, bonusMode, backgroundId, background]);

  const preview = useMemo(
    () =>
      createCharacter({
        name: name || 'Безымянный герой',
        speciesId,
        classId,
        backgroundId,
        level,
        abilities: finalAbilities,
        skillProfs: Object.fromEntries([
          ...(background?.skillIds ?? []).map((s) => [s, 1 as const]),
          ...pickedSkills.map((s) => [s, 1 as const]),
        ]) as Partial<Record<SkillId, 1 | 2>>,
        inventory: withKit ? startingKit(classId) : [],
      }),
    [name, speciesId, classId, backgroundId, level, finalAbilities, pickedSkills, withKit, background],
  );

  const previewDerived = useMemo(() => deriveCharacter(preview), [preview]);

  function setStandard(ability: AbilityId, value: number) {    const usedBy = (Object.keys(base) as AbilityId[]).find((k) => k !== ability && base[k] === value);
    setBase((prev) => {
      const next = { ...prev, [ability]: value };
      if (usedBy) next[usedBy] = prev[ability];
      return next;
    });
  }

  function adjustPointBuy(ability: AbilityId, delta: number) {
    const current = base[ability];
    const target = current + delta;
    if (target < 8 || target > 15) return;
    const projected = { ...base, [ability]: target };
    if (pointBuySum(projected) > 27) return;
    setBase(projected);
  }

  function rollScores() {
    const values: number[] = [];
    for (let i = 0; i < 6; i++) {
      const dice = [rollDie(6), rollDie(6), rollDie(6), rollDie(6)].sort((x, y) => y - x);
      values.push(dice[0] + dice[1] + dice[2]);
    }
    values.sort((a, b) => b - a);
    setRolled(values);
    const order: AbilityId[] = [...(klass?.primaryAbilities ?? []), ...ABILITIES.map((a) => a.id).filter((id) => !(klass?.primaryAbilities ?? []).includes(id as AbilityId))] as AbilityId[];
    const next = {} as AbilityScores;
    order.forEach((id, idx) => {
      next[id] = values[idx];
    });
    setBase(next);
  }

  const skillLimit = klass?.skillChoices.count ?? 2;
  const skillPool = klass?.skillChoices.from ?? [];
  const backgroundSkills = background?.skillIds ?? [];
  const skillsOk = pickedSkills.length === skillLimit;
  const bonusDistinct =
    bonusMode === '2/1'
      ? bonusPicks.a !== bonusPicks.b
      : new Set([bonusPicks.a, bonusPicks.b, bonusPicks.c]).size === 3;
  const canCreate = Boolean(name.trim()) && Boolean(klass) && Boolean(background) && skillsOk && bonusDistinct;

  function create() {
    if (!canCreate) return;
    const skillProfs: Partial<Record<SkillId, 1 | 2>> = {};
    for (const id of backgroundSkills) skillProfs[id] = 1;
    for (const id of pickedSkills) skillProfs[id] = 1;
    const character = createCharacter({
      name,
      speciesId,
      classId,
      backgroundId,
      level,
      abilities: finalAbilities,
      skillProfs,
      inventory: withKit ? startingKit(classId) : [],
      spells: { known: [], prepared: [] },
    });
    store.addCharacter(character);
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
    toast('Персонаж создан. Добавьте заклинания и снаряжение на листе.', 'success');
    navigate(`/characters/${character.id}`);
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <Link to="/characters" className="tiny" style={{ textDecoration: 'none' }}>
            ← Персонажи
          </Link>
          <h1>Новый персонаж</h1>
          <p className="lead">Правила 2024: предыстория даёт прибавки к характеристикам, вид — черты, класс — владения.</p>
          <div className="hint" style={{ marginTop: 6 }}>
            Черновик сохраняется в браузере: страницу можно обновить и продолжить с того же места.
          </div>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-ghost"
            onClick={() => {
              if (confirmAction('Очистить черновик и начать заново?')) {
                try {
                  localStorage.removeItem(DRAFT_KEY);
                } catch {
                  /* ignore */
                }
                window.location.reload();
              }
            }}
          >
            Сбросить
          </button>
          <button className="btn btn-primary" disabled={!canCreate} onClick={create}>
            <Icon name="check" />
            Создать героя
          </button>
        </div>
      </div>

      <div className="split">
        <div className="col" style={{ gap: 16 }}>
          {/* 1. Основное */}
          <section className="card">
            <div className="card-head">
              <h3>1. Кто ваш герой</h3>
            </div>
            <div className="card-pad col" style={{ gap: 14 }}>
              <div className="field">
                <label htmlFor="char-name">Имя</label>
                <input
                  id="char-name"
                  className="input"
                  value={name}
                  maxLength={50}
                  placeholder="Например, Кайра из Ветреного предела"
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="char-species">Вид</label>
                  <select id="char-species" className="select" value={speciesId} onChange={(e) => setSpeciesId(e.target.value)}>
                    {SPECIES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="char-class">Класс</label>
                  <select id="char-class" className="select" value={classId} onChange={(e) => setClassId(e.target.value)}>
                    {CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (d{c.hitDie})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="char-background">Предыстория</label>
                  <select
                    id="char-background"
                    className="select"
                    value={backgroundId}
                    onChange={(e) => setBackgroundId(e.target.value)}
                  >
                    {BACKGROUNDS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="char-level">Уровень</label>
                  <input
                    id="char-level"
                    className="input"
                    type="number"
                    min={1}
                    max={20}
                    value={level}
                    onChange={(e) => setLevel(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                  />
                </div>
              </div>

              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="panel">
                  <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                    <Icon name="sparkles" size={15} />
                    <strong>{species?.name}</strong>
                    <span className="chip">{species?.size}</span>
                    <span className="chip">{species?.speed} фт.</span>
                  </div>
                  <div className="hint">
                    {(species?.traits ?? []).slice(0, 3).map((t) => t.name).join(' · ')}
                    {species?.darkvision ? ` · тёмное зрение ${species.darkvision} фт.` : ''}
                  </div>
                </div>
                <div className="panel">
                  <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                    <Icon name="sword" size={15} />
                    <strong>{klass?.name}</strong>
                    <span className="chip">d{klass?.hitDie}</span>
                  </div>
                  <div className="hint">
                    Спасброски: {klass?.saves.map((s) => ABILITIES.find((a) => a.id === s)?.name).join(', ')}
                    {klass?.spellcasting ? ` · заклинания от ${ABILITIES.find((a) => a.id === klass.spellcasting?.ability)?.name}` : ''}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Характеристики */}
          <section className="card">
            <div className="card-head">
              <h3>2. Характеристики</h3>
            </div>
            <div className="card-pad col" style={{ gap: 14 }}>
              <div className="row-between wrap">
                <div className="tabs">
                  {(
                    [
                      ['standard', 'Стандартный набор'],
                      ['pointbuy', 'Покупка за очки'],
                      ['roll', 'Бросок 4d6'],
                      ['manual', 'Вручную'],
                    ] as [Method, string][]
                  ).map(([id, label]) => (
                    <button key={id} className={method === id ? 'active' : ''} onClick={() => setMethod(id)}>
                      {label}
                    </button>
                  ))}
                </div>
                {method === 'pointbuy' ? (
                  <span className="chip chip-accent">Осталось очков: {27 - pointBuySum(base)}</span>
                ) : null}
                {method === 'standard' ? <span className="chip">15 · 14 · 13 · 12 · 10 · 8</span> : null}
                {method === 'roll' ? (
                  <button className="btn btn-ghost btn-sm" onClick={rollScores}>
                    <Icon name="dice" size={14} />
                    Бросить
                  </button>
                ) : null}
              </div>

              <div className="field-row" style={{ gap: 10 }}>
                {ABILITIES.map((a) => {
                  const bonus = bonusFor(a.id);
                  const total = finalAbilities[a.id];
                  return (
                    <div key={a.id} className="panel" style={{ padding: 10, textAlign: 'center' }}>
                      <div className="tiny">{a.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
                        {method === 'pointbuy' ? (
                          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => adjustPointBuy(a.id, -1)}>
                            −
                          </button>
                        ) : null}
                        {method === 'standard' ? (
                          <select
                            className="select input-sm"
                            style={{ width: 62, minHeight: 30, padding: '4px 22px 4px 8px', backgroundPosition: 'calc(100% - 14px) 13px, calc(100% - 9px) 13px' }}
                            value={base[a.id]}
                            onChange={(e) => setStandard(a.id, Number(e.target.value))}
                            aria-label={`Значение ${a.name}`}
                          >
                            {STANDARD.map((value) => (
                              <option key={value} value={value} disabled={Object.entries(base).some(([k, v]) => k !== a.id && v === value)}>
                                {value}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            className="input input-sm"
                            style={{ width: 62, textAlign: 'center' }}
                            type="number"
                            min={method === 'pointbuy' ? 8 : 3}
                            max={method === 'pointbuy' ? 15 : 20}
                            value={base[a.id]}
                            onChange={(e) => {
                              const value = Number(e.target.value) || 0;
                              setBase((prev) => ({ ...prev, [a.id]: value }));
                            }}
                          />
                        )}
                        {method === 'pointbuy' ? (
                          <button className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => adjustPointBuy(a.id, 1)}>
                            +
                          </button>
                        ) : null}
                      </div>
                      <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                        {formatMod(abilityMod(total))}
                      </div>
                      <div className="tiny" style={{ marginTop: 2 }}>
                        Итог {total}
                        {bonus ? <span style={{ color: 'var(--c-a4ac86)' }}> (+{bonus})</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="panel panel-brown col" style={{ gap: 10 }}>
                <div className="row-between wrap">
                  <div>
                    <strong>Прибавки предыстории</strong>
                    <div className="hint">Предыстория «{background?.name}» даёт +2/+1 или +1/+1/+1 к характеристикам на выбор.</div>
                  </div>
                  <div className="tabs">
                    <button className={bonusMode === '2/1' ? 'active' : ''} onClick={() => setBonusMode('2/1')}>
                      +2 / +1
                    </button>
                    <button className={bonusMode === '1/1/1' ? 'active' : ''} onClick={() => setBonusMode('1/1/1')}>
                      +1 / +1 / +1
                    </button>
                  </div>
                </div>
                <div className="row wrap">
                  {(background?.abilities ?? []).map((id) => {
                    const label = ABILITIES.find((a) => a.id === id)?.name ?? id;
                    const value = bonusFor(id);
                    return (
                      <span key={id} className={`chip${value ? ' chip-accent' : ''}`}>
                        {label} {value ? `+${value}` : '—'}
                      </span>
                    );
                  })}
                </div>
                <div className="field-row" style={{ gap: 10 }}>
                  <div className="field">
                    <label>{bonusMode === '2/1' ? 'Характеристика +2' : 'Первая +1'}</label>
                    <select
                      className="select"
                      value={bonusPicks.a}
                      onChange={(e) => setBonusPicks((p) => ({ ...p, a: e.target.value as AbilityId }))}
                    >
                      {(background?.abilities ?? []).map((id) => (
                        <option key={id} value={id} disabled={id === bonusPicks.b || (bonusMode === '1/1/1' && id === bonusPicks.c)}>
                          {ABILITIES.find((a) => a.id === id)?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>{bonusMode === '2/1' ? 'Характеристика +1' : 'Вторая +1'}</label>
                    <select
                      className="select"
                      value={bonusPicks.b}
                      onChange={(e) => setBonusPicks((p) => ({ ...p, b: e.target.value as AbilityId }))}
                    >
                      {(background?.abilities ?? []).map((id) => (
                        <option key={id} value={id} disabled={id === bonusPicks.a || (bonusMode === '1/1/1' && id === bonusPicks.c)}>
                          {ABILITIES.find((a) => a.id === id)?.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {bonusMode === '1/1/1' ? (
                    <div className="field">
                      <label>Третья +1</label>
                      <select
                        className="select"
                        value={bonusPicks.c}
                        onChange={(e) => setBonusPicks((p) => ({ ...p, c: e.target.value as AbilityId }))}
                      >
                        {(background?.abilities ?? []).map((id) => (
                          <option key={id} value={id} disabled={id === bonusPicks.a || id === bonusPicks.b}>
                            {ABILITIES.find((a) => a.id === id)?.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
                {!bonusDistinct ? <div className="hint" style={{ color: 'var(--danger)' }}>Выберите разные характеристики.</div> : null}
                {rolled ? <div className="hint">Последний бросок: {rolled.join(', ')}</div> : null}
              </div>
            </div>
          </section>

          {/* 3. Навыки */}
          <section className="card">
            <div className="card-head">
              <h3>3. Навыки</h3>
              <span className={`chip${skillsOk ? ' chip-success' : ''}`}>
                {pickedSkills.length} / {skillLimit}
              </span>
            </div>
            <div className="card-pad col" style={{ gap: 12 }}>
              <div>
                <div className="tiny" style={{ marginBottom: 6 }}>От предыстории (автоматически)</div>
                <div className="pill-list">
                  {backgroundSkills.map((id) => (
                    <span key={id} className="chip chip-success">
                      <Icon name="check" size={12} />
                      {SKILLS.find((s) => s.id === id)?.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="tiny" style={{ marginBottom: 6 }}>Выберите {skillLimit} из списка класса</div>
                <div className="grid grid-2" style={{ gap: 4 }}>
                  {skillPool.map((id) => {
                    const skill = SKILLS.find((s) => s.id === id);
                    const isBackground = backgroundSkills.includes(id);
                    const active = pickedSkills.includes(id);
                    return (
                      <label
                        key={id}
                        className="check"
                        style={{
                          padding: '6px 8px',
                          border: `1px solid ${active ? 'var(--border-accent)' : 'transparent'}`,
                          borderRadius: 4,
                          background: active ? 'rgba(166,138,100,0.1)' : 'transparent',
                          opacity: isBackground ? 0.55 : 1,
                          cursor: isBackground ? 'not-allowed' : 'pointer',
                        }}
                        title={isBackground ? 'Уже есть от предыстории' : undefined}
                      >
                        <input
                          type="checkbox"
                          checked={active || isBackground}
                          disabled={isBackground}
                          onChange={() =>
                            setPickedSkills((prev) =>
                              prev.includes(id)
                                ? prev.filter((s) => s !== id)
                                : prev.length < skillLimit
                                  ? [...prev, id]
                                  : prev,
                            )
                          }
                        />
                        <span>{skill?.name}</span>
                        <span className="ab" style={{ marginLeft: 'auto', fontSize: 10.5 }}>
                          {ABILITIES.find((a) => a.id === skill?.ability)?.short}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Снаряжение */}
          <section className="card">
            <div className="card-head">
              <h3>4. Снаряжение</h3>
            </div>
            <div className="card-pad col" style={{ gap: 10 }}>
              <label className="check">
                <input type="checkbox" checked={withKit} onChange={(e) => setWithKit(e.target.checked)} />
                Выдать стартовый набор класса (оружие, доспех, принадлежности)
              </label>
              {klass ? (
                <div className="hint">Снаряжение по книге: {klass.startingEquipment.join('; ')}. Золото: {klass.gold}.</div>
              ) : null}
              {withKit ? (
                <div className="pill-list">
                  {preview.inventory.map((i) => (
                    <span key={i.id} className="chip">
                      {i.name}
                      {i.qty > 1 ? ` ×${i.qty}` : ''}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Сводка */}
        <aside className="card" style={{ position: 'sticky', top: 74 }}>
          <div className="card-head">
            <h3>Предпросмотр</h3>
            <span className="chip">{level} ур.</span>
          </div>
          <div className="card-pad col" style={{ gap: 12 }}>
            <div>
              <div className="serif" style={{ fontSize: 21, color: 'var(--text-strong)' }}>{name || 'Безымянный герой'}</div>
              <div className="hint">
                {species?.name} · {klass?.name}
                {background ? ` · ${background.name}` : ''}
              </div>
            </div>

            <div className="vitals" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="vital">
                <div className="k">Хиты</div>
                <div className="v">{preview.hp.max}</div>
                <div className="tiny" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>
                  Кость хитов d{klass?.hitDie ?? 8}
                </div>
              </div>
              <div className="vital">
                <div className="k">КД</div>
                <div className="v">{previewDerived.ac}</div>
              </div>
              <div className="vital">
                <div className="k">Инициатива</div>
                <div className="v">{formatMod(abilityMod(finalAbilities.dex))}</div>
              </div>
              <div className="vital">
                <div className="k">Владение</div>
                <div className="v">+{2 + Math.floor((level - 1) / 4)}</div>
              </div>
            </div>

            <div>
              <div className="tiny" style={{ marginBottom: 5 }}>Характеристики</div>
              <div className="row wrap" style={{ gap: 5 }}>
                {ABILITIES.map((a) => (
                  <span key={a.id} className="chip">
                    {a.short} {finalAbilities[a.id]} ({formatMod(abilityMod(finalAbilities[a.id]))})
                  </span>
                ))}
              </div>
            </div>

            {klass?.spellcasting ? (
              <div className="panel">
                <div className="tiny">Заклинания</div>
                <div style={{ marginTop: 3 }}>
                  СЛ {8 + 2 + Math.floor((level - 1) / 4) + abilityMod(finalAbilities[klass.spellcasting.ability])} · атака{' '}
                  {formatMod(2 + Math.floor((level - 1) / 4) + abilityMod(finalAbilities[klass.spellcasting.ability]))}
                </div>
                <div className="hint">Характеристика: {ABILITIES.find((a) => a.id === klass.spellcasting?.ability)?.name}</div>
              </div>
            ) : null}

            <div>
              <div className="tiny" style={{ marginBottom: 5 }}>Умения на уровне</div>
              <div className="hint">
                {klass?.features.filter((f) => f.level <= level).slice(-4).map((f) => f.name).join(' · ')}
              </div>
            </div>

            <button className="btn btn-primary btn-block" disabled={!canCreate} onClick={create}>
              <Icon name="check" />
              Создать персонажа
            </button>
            {!skillsOk ? <div className="hint" style={{ color: 'var(--warning)' }}>Выберите {skillLimit} навыка класса.</div> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
