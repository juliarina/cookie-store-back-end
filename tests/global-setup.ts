import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const parseDotEnv = (): Record<string, string> => {
  const out: Record<string, string> = {};
  const file = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(file)) return out;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
    if (match) out[match[1]] = match[2].replace(/^"|"$/g, '');
  }
  return out;
};

export default function globalSetup(): void {
  const devUrl = parseDotEnv().DATABASE_URL;
  const testUrl = devUrl?.replace(/(\/[^/?#]+)(\?.*)?$/, '/cookie_store_test$2');
  if (!testUrl) {
    throw new Error('Could not derive a test DATABASE_URL from .env');
  }
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: testUrl },
    stdio: 'inherit',
  });
}