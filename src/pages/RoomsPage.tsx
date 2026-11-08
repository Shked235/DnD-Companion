import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../lib/store';
import { Icon, toast } from '../lib/ui';
import {
  createRoom,
  fetchRoomInfo,
  loadSavedRooms,
  removeSavedRoom,
  saveRoom,
  type SavedRoom,
} from '../lib/room';

export default function RoomsPage() {
  const state = useAppState();
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState('Подземелье, которого нет');
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<SavedRoom[]>(() => loadSavedRooms());
  const [lan, setLan] = useState<{ address: string; iface: string }[]>([]);

  useEffect(() => {
    fetch('/api/network')
      .then((response) => (response.ok ? response.json() : { addresses: [] }))
      .then((data) => setLan(Array.isArray(data.addresses) ? data.addresses : []))
      .catch(() => setLan([]));
  }, []);

  const radmin = lan.find((entry) => /radmin/i.test(entry.iface));
  const isCodespace =
    typeof window !== 'undefined' && window.location.hostname.endsWith('.app.github.dev');
  const publicOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  async function onCreate() {
    setBusy(true);
    try {
      const room = await createRoom(roomName, state.profile.name);
      saveRoom({ code: room.code, key: room.key, name: room.name, at: Date.now() });
      toast(`Комната ${room.code} создана`, 'success');
      navigate(`/room/${room.code}`);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Сервер комнат недоступен', 'danger');
    } finally {
      setBusy(false);
    }
  }

  async function onJoin() {
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      toast('Код комнаты слишком короткий', 'danger');
      return;
    }
    setBusy(true);
    try {
      const info = await fetchRoomInfo(code);
      if (!info.exists) {
        toast('Комната с таким кодом не найдена', 'danger');
        return;
      }
      navigate(`/room/${code}`);
    } catch {
      toast('Сервер комнат недоступен', 'danger');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Комнаты</h1>
          <p className="lead">
            Виртуальный стол: карта с сеткой, токены, инициатива, чат и общие броски. Комната живёт, пока
            запущен сервер приложения; он же открывает её участникам в локальной сети.
          </p>
        </div>
        <span className="chip">
          <Icon name="users" size={13} /> {state.profile.name}
        </span>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 22 }}>
        <section className="card">
          <div className="card-head">
            <h3>Создать комнату</h3>
            <span className="badge badge-accent">Мастер</span>
          </div>
          <div className="card-pad col" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="room-name">Название приключения</label>
              <input
                id="room-name"
                className="input"
                value={roomName}
                maxLength={60}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </div>
            <p className="hint" style={{ margin: 0 }}>
              Вы получите код комнаты и права Мастера: карта, токены, инициатива и хендауты. Игроки
              подключаются по коду.
            </p>
            <button className="btn btn-primary" disabled={busy} onClick={onCreate}>
              <Icon name="plus" />
              Создать и открыть
            </button>
          </div>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Войти по коду</h3>
            <span className="badge">Игрок</span>
          </div>
          <div className="card-pad col" style={{ gap: 12 }}>
            <div className="field">
              <label htmlFor="room-code">Код комнаты</label>
              <input
                id="room-code"
                className="input"
                style={{ letterSpacing: '0.24em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                placeholder="XXXXX"
                maxLength={8}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onJoin();
                }}
              />
            </div>
            <p className="hint" style={{ margin: 0 }}>
              Код выдаёт Мастер. Имя берётся из профиля: <strong>{state.profile.name}</strong>.
            </p>
            <button className="btn btn-primary" disabled={busy} onClick={onJoin}>
              <Icon name="play" />
              Подключиться
            </button>
          </div>
        </section>
      </div>

      <div className="row-between" style={{ marginBottom: 10 }}>
        <h2 style={{ margin: 0 }}>Мои комнаты</h2>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setSaved(loadSavedRooms())}
          title="Обновить список"
        >
          <Icon name="clock" size={14} />
          Обновить
        </button>
      </div>

      {saved.length === 0 ? (
        <div className="empty">
          <Icon name="map" size={44} />
          <h3>Комнат пока нет</h3>
          <p className="muted">Создайте первую — код и ключ Мастера сохранятся в этом браузере.</p>
        </div>
      ) : (
        <div className="grid grid-auto">
          {saved.map((room) => (
            <div key={room.code} className="char-card">
              <div className="row-between">
                <div>
                  <div className="serif" style={{ fontSize: 19, color: 'var(--text-strong)' }}>{room.name}</div>
                  <div className="hint mono" style={{ letterSpacing: '0.18em' }}>{room.code}</div>
                </div>
                <span className={`chip${room.key ? ' chip-accent' : ''}`}>{room.key ? 'Мастер' : 'Игрок'}</span>
              </div>
              <div className="row-between">
                <span className="tiny">
                  {new Date(room.at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
                <div className="row" style={{ gap: 6 }}>
                  <button
                    className="icon-btn"
                    title="Убрать из списка"
                    onClick={() => {
                      removeSavedRoom(room.code);
                      setSaved(loadSavedRooms());
                    }}
                  >
                    <Icon name="trash" size={15} />
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/room/${room.code}`)}>
                    Войти
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="panel" style={{ marginTop: 22 }}>
        <div className="row" style={{ gap: 8, marginBottom: 6 }}>
          <Icon name="warning" size={16} />
          <strong>Как это работает</strong>
        </div>
        <div className="hint">
          Состояние комнат хранится на сервере в <code>server/data/rooms.json</code>.{' '}
          {isCodespace ? (
            <>
              Вы в GitHub Codespaces. Публичный адрес приложения: <code>{publicOrigin}</code>. Проверьте,
              что порт открыт как <b>Public</b> на вкладке Ports, и отправьте эту ссылку игрокам. Codespace
              засыпает при простое — тогда ссылка перестанет отвечать до следующего запуска.
            </>
          ) : (
            <>
              Чтобы играть с другими компьютерами, откройте приложение по одному из адресов этого
              компьютера, а не по localhost:
              {lan.length ? (
                <div className="col" style={{ gap: 4, marginTop: 8 }}>
                  {lan.map((entry) => (
                    <div key={entry.address}>
                      <span className="tiny" style={{ display: 'inline-block', minWidth: 104 }}>
                        {entry.iface}
                      </span>{' '}
                      <code>http://{entry.address}:8787</code>{' '}
                      <span className="hint">(в dev-режиме — порт 5173)</span>
                    </div>
                  ))}
                  {radmin ? (
                    <div style={{ marginTop: 2 }}>Гость должен вступить в вашу сеть Radmin VPN.</div>
                  ) : null}
                </div>
              ) : (
                <div style={{ marginTop: 8 }}>
                  например <code>http://192.168.1.42:8787</code>, где <code>192.168.1.42</code> — IP
                  компьютера (его показывает команда <code>ipconfig</code>).
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                Публичного хостинга и аккаунтов нет — только код комнаты.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
