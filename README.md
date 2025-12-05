<p align="center">
  <img src="./logo.png" width="180" height="180" alt="Peng ORM logo" />
</p>

# Peng ORM

Micro ORM for Node's native SQLite module.

## Setup

To create a database context, only two arguments are required by the constructor: the path to the database file and a migration array with sql instructions.

```ts
import PengORM from 'peng-orm';

const todos = `
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER NOT NULL PRIMARY KEY,
    task TEXT NOT NULL
  );
`;

const alterTodos = `ALTER TABLE todos ADD COLUMN userId INTEGER NOT NULL DEFAULT 0;`;

const users = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER NOT NULL PRIMARY KEY,
    name TEXT NOT NULL
  );
`;

const migrations: string[][] = [[todos], [users, alterTodos]];

const dbContext = new PengORM('./data.db', migrations);

export default dbContext;
```

### Migrations

In the example above, we can see that the migration array has two items, it means our database will be in its `version 2`. The statements of version one (index 0) will be executed and then the statements of version two, always in order that they were provided.

If more alterations are made to the database schema, a new array of statements should be added to the migrations array. In this way we can ensure that databases in production are updated to the latest version without conflicts.

### Logging

The ORM also accepts a custom logging function (`(stm: string) => void`), like this example:

```ts
const myLogger = (stm: string) => console.log(`[MyDB]: ${stm}`);

const dbContext = new PengORM('./data.db', [], myLogger);
```

## Usage

### Query

Use `query` to retrieve multiple rows. Pass positional parameters as an array; the method handles statement preparation and execution for you.

```ts
type Todo = { id: number; task: string; userId: number };

const todos = dbContext.query<Todo>(
  'SELECT id, task, userId FROM todos WHERE userId = ? ORDER BY id',
  [currentUserId],
);

// With a transformer you can cast values or rename fields.
const simpleTodos = dbContext.query('SELECT id, task FROM todos', [], (row) => ({
  id: Number(row.id),
  task: String(row.task),
}));
```

### Get

Use `get` when you expect at most one row. A transformer can shape the result, and `null` is returned if nothing matches.

```ts
const todo = dbContext.get(
  'SELECT id, task FROM todos WHERE id = ?',
  [todoId],
  (row) => ({ id: Number(row.id), task: String(row.task) }),
);

if (!todo) {
  throw new Error('Todo not found');
}
```

### Exec

Use `exec` for statements that do not return rows, such as inserts, updates, or schema changes.

```ts
dbContext.exec('INSERT INTO todos (task, userId) VALUES (?, ?)', [
  'Write documentation',
  currentUserId,
]);

dbContext.exec('DELETE FROM todos WHERE id = ?', [completedTodoId]);
```

## API Summary

| Method                                   | Parameters                                                       | Returns            | Notes                                                                 |
| ---------------------------------------- | ---------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------- |
| `new PengORM(path, migrations, logger?)` | `path: string`, `migrations: string[][]`, optional `logger(stm)` | `PengORM` instance | Automatically opens the database on first use and applies migrations. |
| `query(stmt, args?, transform?)`         | SQL string, optional positional args array, optional row mapper  | `T[]`              | Use for multi-row reads; mapper lets you coerce values.               |
| `get(stmt, args?, transform?)`           | SQL string, optional positional args array, optional row mapper  | `T \| null`        | Returns first row or `null`; mapper shapes the single row result.     |
| `exec(stmt, args?)`                      | SQL string, optional positional args array                       | `void`             | Runs statements without results (INSERT/UPDATE/DDL).                  |

> Note: `getDb` is internal to the ORM. Interact through the exported methods above.

## Testing

Run the Jest suite in watch mode:

```bash
yarn test
```

The command starts Jest in watch mode, so it reruns relevant tests as files change. Use `q` inside the watcher to quit when finished.
