import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import PengORM from './main.ts';

const BASE_MIGRATIONS = [
  [
    `CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task TEXT NOT NULL,
      userId INTEGER NOT NULL
    );`,
  ],
];

const createdDirs: string[] = [];

const createOrm = () => {
  const dir = mkdtempSync(join(tmpdir(), 'peng-orm-test-'));
  createdDirs.push(dir);
  const path = join(dir, 'test.db');

  return new PengORM(path, BASE_MIGRATIONS);
};

afterAll(() => {
  for (const dir of createdDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('PengORM', () => {
  test('exposes the expected public API', () => {
    const orm = createOrm();

    expect(typeof orm.query).toBe('function');
    expect(typeof orm.get).toBe('function');
    expect(typeof orm.exec).toBe('function');
  });

  test('exec writes data and get reads a single row', () => {
    const orm = createOrm();

    orm.exec('INSERT INTO todos (task, userId) VALUES (?, ?)', ['Ship tests', 42]);

    const row = orm.get<{ id: number; task: string; userId: number }>(
      'SELECT id, task, userId FROM todos WHERE userId = ?',
      [42],
    );

    expect(row).not.toBeNull();
    expect(row).toMatchObject({ task: 'Ship tests', userId: 42 });
    expect(typeof row?.id).toBe('number');
  });

  test('query returns multiple rows and applies a transformer', () => {
    const orm = createOrm();

    orm.exec('INSERT INTO todos (task, userId) VALUES (?, ?)', ['First task', 7]);
    orm.exec('INSERT INTO todos (task, userId) VALUES (?, ?)', ['Second task', 7]);

    const tasks = orm.query<string>(
      'SELECT task FROM todos WHERE userId = ? ORDER BY id',
      [7],
      (row) => String(row.task),
    );

    expect(tasks).toEqual(['First task', 'Second task']);
  });
});
