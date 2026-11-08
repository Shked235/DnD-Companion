/**
 * Делает порты Codespace публичными.
 * Запуск: npm run codespace:public (внутри Codespace).
 * Сначала пробует gh CLI, затем GitHub REST API по GITHUB_TOKEN.
 */
const ports = ['5173', '8787'];
const name = process.env.CODESPACE_NAME;
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;

if (!name) {
  console.error('Это не Codespace: переменная CODESPACE_NAME не задана.');
  process.exit(1);
}

async function viaApi(port) {
  if (!token) return false;
  const res = await fetch(`https://api.github.com/user/codespaces/${name}/ports/${port}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ visibility: 'public' }),
  });
  return res.ok;
}

async function viaGh(port) {
  const { execFile } = await import('node:child_process');
  return new Promise((resolve) => {
    execFile('gh', ['codespace', 'ports', 'visibility', `${port}:public`, '-c', name], (error) => {
      resolve(!error);
    });
  });
}

let failed = 0;
for (const port of ports) {
  let ok = await viaGh(port);
  if (!ok) ok = await viaApi(port);
  if (ok) console.log(`✓ порт ${port}: public`);
  else {
    failed++;
    console.error(`✗ порт ${port}: не удалось. Откройте вкладку Ports → ${port} → Port Visibility → Public.`);
  }
}
process.exit(failed ? 1 : 0);
