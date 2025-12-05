import { DatabaseSync, type SQLInputValue, SQLOutputValue } from 'node:sqlite';

export type Row = Record<string, SQLOutputValue>;

export type TransformRow<T> = (row: Row) => T;

interface PengORM {
  db?: DatabaseSync;
  path: string;
  migrations: string[][];
  logger: (stm: string) => void;
  getDb(): DatabaseSync;
  migrateDb(db: DatabaseSync): void;
  query<T>(stmt: string, args?: SQLInputValue[], transform?: TransformRow<T>): T[];
  get<T>(stmt: string, args?: SQLInputValue[], transform?: TransformRow<T>): T | null;
  exec(stmt: string, args?: SQLInputValue[]): void;
}

interface PengORMConstructor {
  new (
    path: PengORM['path'],
    migrations: PengORM['migrations'],
    logger?: PengORM['logger'],
  ): PengORM;
}

function PengORM(
  this: PengORM,
  path: PengORM['path'],
  migrations: PengORM['migrations'],
  logger?: PengORM['logger'],
) {
  this.path = path;
  this.migrations = migrations;
  this.logger = logger || console.log;
}

PengORM.prototype.getDb = function (this: PengORM): DatabaseSync {
  if (!this.db) {
    this.logger('[DB] Opening db file: ' + this.path);
    this.db = new DatabaseSync(this.path);

    this.logger('[DB] Migrate');
    this.migrateDb(this.db);
  }

  return this.db;
};

PengORM.prototype.migrateDb = function (this: PengORM, db: DatabaseSync) {
  const version = Number(db.prepare('PRAGMA user_version').get()?.['user_version']);

  if (version === undefined || isNaN(version)) {
    throw new Error('Could not get database version');
  }

  if (version === this.migrations.length) {
    this.logger('[DB] Database is up to date');

    return;
  }

  let _version = version + 1;
  for (const migration of this.migrations.slice(version)) {
    this.logger('[DB] Running statements for version ' + _version);

    let _stms = 0;
    for (const statement of migration) {
      try {
        this.logger('[DB] ' + statement);
        db.prepare(statement).run();
      } catch (e: any) {
        this.logger('[DB ERROR] ' + e?.message);

        continue;
      }

      _stms++;
    }

    if (_stms !== migration.length) {
      throw new Error('Error while executing statements for version ' + _version);
    }

    _version++;
  }

  this.logger('[DB] Saving database version ' + this.migrations.length);
  db.prepare('PRAGMA user_version = ' + this.migrations.length).run();
};

PengORM.prototype.query = function <T>(
  this: PengORM,
  stmt: string,
  args: SQLInputValue[] = [],
  transform?: TransformRow<T>,
): T[] {
  const db = this.getDb();

  const query = db.prepare(stmt);

  const rows = query.all(...args) as Row[];

  return !!transform ? rows.map(transform) : (rows as T[]);
};

PengORM.prototype.get = function <T>(
  this: PengORM,
  stmt: string,
  args: SQLInputValue[] = [],
  transform?: TransformRow<T>,
): T | null {
  const db = this.getDb();

  const query = db.prepare(stmt);

  const first = query.get(...args) as Row;

  return !first ? null : !!transform ? transform(first) : (first as T);
};

PengORM.prototype.exec = function (
  this: PengORM,
  stmt: string,
  args: SQLInputValue[] = [],
): void {
  const db = this.getDb();

  db.prepare(stmt).run(...args);
};

const PengORMFn = PengORM as unknown as PengORMConstructor;

Object.freeze(PengORM);
Object.freeze(PengORM.prototype);

export default PengORMFn;
