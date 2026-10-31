import { test, expect } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureDevVars } from '../../scripts/ensure-dev-vars.mjs';

const dir = () => {
  const d = mkdtempSync(join(tmpdir(), 'devvars-'));
  writeFileSync(join(d, '.dev.vars.example'), 'TURNSTILE_SECRET=test\n');
  return d;
};

test('creates .dev.vars from the example when it is missing', () => {
  const d = dir();
  expect(ensureDevVars(d)).toBe(true);
  expect(readFileSync(join(d, '.dev.vars'), 'utf8')).toBe('TURNSTILE_SECRET=test\n');
});

test('never overwrites an existing .dev.vars', () => {
  const d = dir();
  writeFileSync(join(d, '.dev.vars'), 'MINE=1\n');
  expect(ensureDevVars(d)).toBe(false);
  expect(readFileSync(join(d, '.dev.vars'), 'utf8')).toBe('MINE=1\n');
});

test('does nothing without an example file', () => {
  const d = mkdtempSync(join(tmpdir(), 'devvars-'));
  expect(ensureDevVars(d)).toBe(false);
  expect(existsSync(join(d, '.dev.vars'))).toBe(false);
});
