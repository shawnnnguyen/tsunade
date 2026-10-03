import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const FIXTURES_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../../../../../fixtures');

export const loadFixture = (relativePath: string): unknown =>
  JSON.parse(readFileSync(path.join(FIXTURES_ROOT, relativePath), 'utf-8')) as unknown;
