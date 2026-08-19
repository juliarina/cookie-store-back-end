import { defineConfig } from 'vitest/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const parseDotEnv = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const file = path.join(__dirname, '.env');
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (match) out[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  return out;
};

const devUrl = parseDotEnv().DATABASE_URL;
const testUrl = devUrl?.replace(/(\/[^/?#]+)(\?.*)?$/, '/cookie_store_test$2');

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    fileParallelism: false,
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    env: {
      NODE_ENV: 'test',
      REDIS_ENABLED: 'false',
      ...(testUrl ? { DATABASE_URL: testUrl } : {}),
    },
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});