import { useEffect, useRef } from 'react';
import {
  SHEET_IFRAME_SANDBOX,
  createBridgeSheetSource,
  type DiceRollPayload,
} from '@longstoryshort/vtt-sdk';
import { Modal } from '../lib/ui';

/**
 * Официальное встраивание листа Long Story Short.
 * Броски приходят по postMessage (`lss:roll`) и уходят в чат комнаты.
 */
export function LssSheetModal({
  onClose,
  onRoll,
}: {
  onClose: () => void;
  onRoll: (roll: DiceRollPayload) => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isLocal =
    /^(localhost|127\.|0\.0\.0\.0|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) ||
    host.endsWith('.local') ||
    host === '';

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const source = createBridgeSheetSource({
      iframe,
      allowedOrigins: ['https://longstoryshort.app'],
    });
    const unsubscribe = source.onRoll(onRoll);
    return () => {
      unsubscribe();
      source.dispose();
    };
  }, [onRoll]);

  return (
    <Modal title="Лист Long Story Short" onClose={onClose} wide>
      <div className="col" style={{ gap: 12 }}>
        <div className="hint" style={{ margin: 0 }}>
          Броски из листа автоматически попадают в чат комнаты: лист присылает их через официальный
          протокол LSS (`lss:roll`), мы пересылаем их в чат.
        </div>

        {isLocal ? (
          <div className="panel panel-brown col" style={{ gap: 8 }}>
            <strong>Для встраивания нужен домен из белого списка LSS</strong>
            <div className="hint" style={{ margin: 0 }}>
              Сейчас приложение открыто по адресу <code>{host}</code>. Long Story Short разрешает
              встраивание только доменам из своего белого списка; <code>localhost</code> и локальные
              IP добавить нельзя.
            </div>
            <div className="hint" style={{ margin: 0 }}>
              Разверните приложение на домене и попросите добавить его: <b>@shakusky</b> в Telegram,{' '}
              <b>shakusky.lss</b> в Discord или в сообщения сообщества VK. После этого лист загрузится
              здесь, а его броски пойдут в чат.
            </div>
            <div className="row wrap" style={{ gap: 8 }}>
              <a
                className="btn btn-ghost btn-sm"
                href="https://longstoryshort.app/doc/developers/embedding/"
                target="_blank"
                rel="noreferrer"
              >
                Документация LSS
              </a>
              <a
                className="btn btn-ghost btn-sm"
                href="https://longstoryshort.app/characters/list/"
                target="_blank"
                rel="noreferrer"
              >
                Открыть лист на сайте LSS
              </a>
            </div>
          </div>
        ) : (
          <>
            <iframe
              ref={iframeRef}
              src="https://longstoryshort.app/iframe/characters/list/"
              sandbox={SHEET_IFRAME_SANDBOX}
              allow="clipboard-write"
              title="Лист персонажа Long Story Short"
              style={{
                width: '100%',
                height: '70vh',
                border: '1px solid var(--border-soft)',
                borderRadius: 8,
                background: '#fff',
              }}
            />
            <div className="hint" style={{ margin: 0 }}>
              Если лист не открылся, значит домен <code>{host}</code> ещё не добавлен в белый список
              LSS. Лист можно открыть{' '}
              <a href="https://longstoryshort.app/characters/list/" target="_blank" rel="noreferrer">
                на сайте LSS
              </a>
              .
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
