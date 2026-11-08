import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Toaster, Icon, Modal, toast } from './lib/ui';
import { store, useAppState } from './lib/store';
import Home from './pages/Home';
import CharactersPage from './pages/CharactersPage';
import CharacterWizard from './pages/CharacterWizard';
import SheetPage from './pages/SheetPage';
import CompendiumPage from './pages/CompendiumPage';
import EntryPage from './pages/EntryPage';
import RoomsPage from './pages/RoomsPage';
import RoomPage from './pages/RoomPage';

const NAV = [
  { to: '/', label: 'Главная', icon: 'home', end: true },
  { to: '/characters', label: 'Персонажи', icon: 'users' },
  { to: '/compendium', label: 'Справочник', icon: 'book' },
  { to: '/rooms', label: 'Комнаты', icon: 'map' },
];

const CRUMBS: Record<string, string> = {
  characters: 'Персонажи',
  compendium: 'Справочник',
  rooms: 'Комнаты',
  room: 'Комната',
};

export default function App() {
  const state = useAppState();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(state.profile.name);
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'),
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('dnd-companion:theme', theme);
    } catch {
      /* приватный режим — просто не сохраняем */
    }
  }, [theme]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    document.title =
      location.pathname === '/'
        ? 'DnD Companion'
        : `${CRUMBS[location.pathname.split('/')[1] ?? ''] ?? 'DnD Companion'} — DnD Companion`;
  }, [location.pathname]);

  const section = location.pathname.split('/')[1] ?? '';
  const crumb = CRUMBS[section] ?? 'Главная';

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link to="/" className="brand" style={{ textDecoration: 'none' }}>
          <Icon name="d20" size={38} className="brand-mark" />
          <div>
            <div className="brand-name">DnD Companion</div>
            <div className="brand-sub">5e · 2024</div>
          </div>
        </Link>

        <nav className="nav" aria-label="Основная навигация">
          <div className="nav-label">Приключение</div>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.to === '/characters' && state.characters.length > 0 ? (
                <span className="nav-count">{state.characters.length}</span>
              ) : null}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span>Локальный профиль</span>
            <button
              className="icon-btn"
              style={{ width: 24, height: 24 }}
              onClick={() => {
                setNameDraft(state.profile.name);
                setProfileOpen(true);
              }}
              aria-label="Изменить имя игрока"
              title="Изменить имя игрока"
            >
              <Icon name="edit" size={14} />
            </button>
          </div>
          <div style={{ color: 'var(--text-strong)', marginTop: 3 }}>{state.profile.name}</div>
          <div style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.4 }}>
            Данные хранятся в этом браузере. Персонажей можно экспортировать в JSON.
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="crumb">
            <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
              DnD Companion
            </Link>{' '}
            / {crumb}
          </div>
          <div className="grow" />
          <button
            className="icon-btn"
            onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
          </button>
          <button className="user-chip" onClick={() => setProfileOpen(true)} title="Профиль игрока">
            <span className="avatar">{state.profile.name.slice(0, 1).toUpperCase()}</span>
            <span>{state.profile.name}</span>
          </button>
        </header>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/characters/new" element={<CharacterWizard />} />
          <Route path="/characters/:id" element={<SheetPage />} />
          <Route path="/compendium" element={<CompendiumPage />} />
          <Route path="/compendium/:category/:id" element={<EntryPage />} />
          <Route path="/rooms" element={<RoomsPage />} />
          <Route path="/room/:code" element={<RoomPage />} />
          <Route
            path="*"
            element={
              <div className="page">
                <div className="empty">
                  <Icon name="scroll" size={42} />
                  <h3>Страница не найдена</h3>
                  <p className="muted">Возможно, ссылка устарела или в адресе опечатка.</p>
                  <Link className="btn btn-primary" to="/">
                    На главную
                  </Link>
                </div>
              </div>
            }
          />
        </Routes>
      </div>

      <Toaster />

      {profileOpen ? (
        <Modal
          title="Профиль игрока"
          onClose={() => setProfileOpen(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setProfileOpen(false)}>
                Отмена
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  store.setProfileName(nameDraft);
                  setProfileOpen(false);
                  toast('Имя игрока сохранено', 'success');
                }}
              >
                Сохранить
              </button>
            </>
          }
        >
          <div className="field">
            <label htmlFor="profile-name">Как вас зовут за столом</label>
            <input
              id="profile-name"
              className="input"
              value={nameDraft}
              maxLength={40}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Например, Мастер Алекс"
            />
            <span className="hint">
              Имя видно другим участникам комнаты. Это не аккаунт: вход по паролю не требуется, данные
              не покидают ваш браузер, кроме комнат, к которым вы подключаетесь.
            </span>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
