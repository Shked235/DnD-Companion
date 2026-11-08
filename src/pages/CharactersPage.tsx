import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Character } from '../data/types';
import { getClass } from '../data';
import { store, useAppState } from '../lib/store';
import { Icon, Modal, confirmAction, toast } from '../lib/ui';
import { deriveCharacter } from '../lib/rules/character';
import { exportCharacter, readJsonFile } from '../lib/files';
import { makeDemoCharacter } from '../lib/demo';
import { extractLssCharacter, mapLssCharacter, type LssImportResult } from '../lib/import/lss';

function isValidCharacter(value: unknown): value is Character {
  if (!value || typeof value !== 'object') return false;
  const c = value as Partial<Character>;
  return Boolean(
    typeof c.name === 'string' &&
      c.abilities &&
      typeof c.abilities.str === 'number' &&
      Array.isArray(c.classes) &&
      c.classes.length > 0 &&
      typeof c.level === 'number',
  );
}

export default function CharactersPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [lssOpen, setLssOpen] = useState(false);

  const filtered = state.characters.filter((c) =>
    query.trim() ? `${c.name} ${c.classes[0]?.classId ?? ''}`.toLowerCase().includes(query.toLowerCase()) : true,
  );

  async function onImport(file: File | undefined) {
    if (!file) return;
    try {
      const data = await readJsonFile<unknown>(file);
      const lss = extractLssCharacter(data);
      if (lss) {
        const { character, warnings } = mapLssCharacter(lss.raw, { label: lss.label });
        const created = store.addCharacter(character);
        toast(
          warnings.length
            ? `Импортировано из LSS. Замечания: ${warnings.join(' ')}`
            : 'Персонаж импортирован из Long Story Short',
          warnings.length ? 'info' : 'success',
        );
        navigate(`/characters/${created.id}`);
        return;
      }
      const list = Array.isArray(data) ? data : [data];
      const valid = list.filter(isValidCharacter);
      if (!valid.length) {
        toast('В файле нет персонажа в ожидаемом формате', 'danger');
        return;
      }
      let last: Character | null = null;
      for (const item of valid) last = store.importCharacter(item);
      toast(`Импортировано: ${valid.length}`, 'success');
      if (last) navigate(`/characters/${last.id}`);
    } catch {
      toast('Не удалось прочитать JSON-файл', 'danger');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Персонажи</h1>
          <p className="lead">
            Полные листы по правилам 2024: расчёты обновляются сразу, а экспорт в JSON позволяет
            перенести героя на другой стол.
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-ghost" onClick={() => setLssOpen(true)}>
            <Icon name="download" />
            Из Long Story Short
          </button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" />
            Импорт
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => onImport(e.target.files?.[0])}
          />
          <Link className="btn btn-primary" to="/characters/new">
            <Icon name="plus" />
            Новый персонаж
          </Link>
        </div>
      </div>

      {state.characters.length > 0 ? (
        <div className="row-between wrap" style={{ marginBottom: 16 }}>
          <div className="searchbar" style={{ maxWidth: 340, flex: '1 1 260px' }}>
            <Icon name="search" />
            <input
              placeholder="Найти по имени или классу"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="tiny">Всего: {state.characters.length}</span>
        </div>
      ) : null}

      {state.characters.length === 0 ? (
        <div className="empty">
          <Icon name="users" size={48} />
          <h3>Здесь появятся ваши герои</h3>
          <p className="muted" style={{ maxWidth: 520, margin: '0 auto 18px' }}>
            Конструктор проведёт по шагам: вид, класс, предыстория, характеристики, навыки и снаряжение.
            Или посмотрите, как выглядит готовый лист.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <Link className="btn btn-primary" to="/characters/new">
              <Icon name="plus" />
              Создать персонажа
            </Link>
            <button
              className="btn btn-ghost"
              onClick={() => {
                const demo = store.addCharacter(makeDemoCharacter());
                toast('Демо-персонаж добавлен', 'success');
                navigate(`/characters/${demo.id}`);
              }}
            >
              <Icon name="sparkles" />
              Показать пример
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <Icon name="search" size={42} />
          <h3>Ничего не найдено</h3>
          <p className="muted">Попробуйте другое имя или очистите поиск.</p>
        </div>
      ) : (
        <div className="grid grid-auto">
          {filtered.map((character) => {
            const derived = deriveCharacter(character);
            const cls = getClass(character.classes[0]?.classId ?? '');
            const hpPct = derived.hpMax ? Math.round((character.hp.current / derived.hpMax) * 100) : 0;
            return (
              <article key={character.id} className="char-card">
                <div className="row-between">
                  <Link className="name" to={`/characters/${character.id}`}>
                    {character.name || 'Безымянный герой'}
                  </Link>
                  <span className="chip chip-accent">{derived.level} ур.</span>
                </div>
                <div className="sub">
                  {derived.species?.name ?? '—'} · {cls?.name ?? '—'}
                  {character.classes[0]?.subclass ? ` · ${character.classes[0].subclass}` : ''}
                </div>
                <div className="row" style={{ gap: 10 }}>
                  <Icon name="heart" size={14} />
                  <div className="meter hp" style={{ flex: 1 }}>
                    <span style={{ width: `${Math.max(0, Math.min(100, hpPct))}%` }} />
                  </div>
                  <span className="mono" style={{ fontSize: 12.5 }}>
                    {character.hp.current}/{derived.hpMax}
                  </span>
                </div>
                <div className="row wrap" style={{ gap: 6 }}>
                  <span className="chip">
                    <Icon name="shield" size={12} /> КД {derived.ac}
                  </span>
                  <span className="chip">Инициатива {derived.initiative >= 0 ? '+' : ''}{derived.initiative}</span>
                  <span className="chip">Владение +{derived.profBonus}</span>
                </div>
                <div className="row-between" style={{ marginTop: 2 }}>
                  <span className="tiny">
                    {new Date(character.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                  </span>
                  <div className="row" style={{ gap: 2 }}>
                    <button
                      className="icon-btn"
                      title="Экспорт JSON"
                      onClick={() => exportCharacter(character)}
                    >
                      <Icon name="download" size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      title="Удалить"
                      onClick={() => {
                        if (confirmAction(`Удалить персонажа «${character.name}»? Действие необратимо.`)) {
                          store.removeCharacter(character.id);
                          toast('Персонаж удалён');
                        }
                      }}
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {lssOpen ? (
        <LssImportModal
          onClose={() => setLssOpen(false)}
          onImported={(created) => {
            const saved = store.addCharacter(created);
            setLssOpen(false);
            toast('Персонаж импортирован из Long Story Short', 'success');
            navigate(`/characters/${saved.id}`);
          }}
        />
      ) : null}
    </div>
  );
}

function LssImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (character: Character) => void;
}) {
  const [url, setUrl] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LssImportResult | null>(null);
  const [error, setError] = useState('');

  async function load() {
    const trimmed = url.trim();
    if (!/^https:\/\/longstoryshort\.app\/characters\/[a-z0-9-]+\/?$/i.test(trimmed)) {
      setError('Нужна ссылка вида https://longstoryshort.app/characters/elf-bard/');
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch(`/api/import/lss?url=${encodeURIComponent(trimmed)}&gender=${gender}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось загрузить персонажа');
      const extracted = extractLssCharacter(data, gender);
      if (!extracted) throw new Error('В ответе нет персонажа LSS');
      const mapped = mapLssCharacter(extracted.raw, {
        label: extracted.label ?? undefined,
        sourceUrl: data.sourceUrl ?? trimmed,
      });
      setResult(mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка импорта');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      title="Импорт из Long Story Short"
      onClose={onClose}
      wide
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          {result ? (
            <button className="btn btn-primary" onClick={() => onImported(result.character)}>
              <Icon name="check" />
              Импортировать
            </button>
          ) : (
            <button className="btn btn-primary" disabled={busy || !url.trim()} onClick={load}>
              <Icon name="download" />
              {busy ? 'Загружаем…' : 'Загрузить'}
            </button>
          )}
        </>
      }
    >
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <label htmlFor="lss-url">Ссылка на персонажа</label>
          <input
            id="lss-url"
            className="input"
            placeholder="https://longstoryshort.app/characters/elf-bard/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <span className="hint">
            Подойдёт публичный лист из каталога LSS. Файл JSON из конструктора тоже можно импортировать
            кнопкой «Импорт».
          </span>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <span className="tiny">Вариант листа</span>
          <div className="tabs">
            <button className={gender === 'male' ? 'active' : ''} onClick={() => setGender('male')}>
              Мужской
            </button>
            <button className={gender === 'female' ? 'active' : ''} onClick={() => setGender('female')}>
              Женский
            </button>
          </div>
        </div>

        {error ? (
          <div className="panel" style={{ color: 'var(--danger-text)' }}>
            {error}
          </div>
        ) : null}

        {result ? (
          <div className="panel panel-brown col" style={{ gap: 8 }}>
            <div className="row-between">
              <strong>{result.character.name}</strong>
              <span className="chip chip-accent">{result.character.level} ур.</span>
            </div>
            <div className="row wrap" style={{ gap: 6 }}>
              <span className="chip">Хиты {result.character.hp.max}</span>
              <span className="chip">КД {result.character.acOverride ?? '—'}</span>
              <span className="chip">Предметов: {result.character.inventory.length}</span>
            </div>
            {result.warnings.length ? (
              <div className="col" style={{ gap: 4 }}>
                <span className="tiny">Замечания</span>
                {result.warnings.map((warning) => (
                  <div key={warning} className="hint">
                    • {warning}
                  </div>
                ))}
              </div>
            ) : (
              <div className="hint">Все поля распознаны.</div>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
