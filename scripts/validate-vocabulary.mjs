import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteNodeCli = path.join(projectRoot, 'node_modules/vite-node/vite-node.mjs');
const runner = path.join(projectRoot, 'scripts/validate-vocabulary.ts');
const result = spawnSync(process.execPath, [viteNodeCli, '--script', runner], {
  cwd: projectRoot,
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
