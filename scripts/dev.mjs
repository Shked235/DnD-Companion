import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const node = process.execPath;

const children = [
  spawn(node, [path.join('server', 'index.mjs')], { cwd: root, stdio: 'inherit', env: process.env }),
  spawn(node, [path.join('node_modules', 'vite', 'bin', 'vite.js')], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  }),
];

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      } else {
        child.kill(signal || 'SIGTERM');
      }
    }
  }
  setTimeout(() => process.exit(0), 300);
}

for (const child of children) {
  child.on('exit', (code) => {
    if (!shuttingDown) {
      console.log(`[dev] процесс завершился с кодом ${code}`);
      shutdown();
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('[dev] клиент: http://localhost:5173 · сервер комнат: http://localhost:8787');

const codespace = process.env.CODESPACE_NAME;
const forwardingDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;
if (codespace && forwardingDomain) {
  console.log(`[dev] Codespaces (сделайте порт 5173 Public): https://${codespace}-5173.${forwardingDomain}`);
  console.log(`[dev] Собранная версия: https://${codespace}-8787.${forwardingDomain} (npm run codespace, порт 8787 Public)`);
}
