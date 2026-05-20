import type { ScaffoldTemplate } from '../scaffold-engine.js';
import {
  getEngineeringFiles,
  getPreCommitHook,
  mergeEngineeringDeps,
} from './shared-engineering.js';

export const DATABASE_CLI_TEMPLATE: ScaffoldTemplate = {
  name: 'database',
  description: 'A database management CLI tool (MySQL/PostgreSQL/SQLite)',
  variables: [
    {
      name: 'description',
      description: 'Project description',
      default: 'A database CLI tool built with @dyyz1993/xcli-core',
    },
    {
      name: 'dbType',
      description: 'Database type (mysql/postgres/sqlite)',
      default: 'sqlite',
      validate: (v: string) =>
        ['mysql', 'postgres', 'sqlite'].includes(v) || 'Must be one of: mysql, postgres, sqlite',
    },
    {
      name: 'author',
      description: 'Author name',
      default: '',
    },
  ],
  files: [
    {
      path: 'package.json',
      content: mergeEngineeringDeps(`{
  "name": "{{projectName}}",
  "version": "0.1.0",
  "description": "{{description}}",
  "type": "module",
  "bin": {
    "{{projectName}}": "dist/cli.js"
  },
  "main": "dist/index.js",
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit",
    "start": "node dist/cli.js"
  },
  "dependencies": {
    "@dyyz1993/xcli-core": "^0.9.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/better-sqlite3": "^7.6.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0"
  }
}`),
    },
    {
      path: 'tsconfig.json',
      content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true,
    "outDir": "dist"
  },
  "include": ["src/**/*", "bin/**/*"],
  "exclude": ["node_modules", "dist"]
}`,
    },
    {
      path: 'tsup.config.ts',
      content: `import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    external: ['better-sqlite3', 'mysql2', 'pg'],
  },
  {
    entry: ['bin/cli.ts'],
    format: ['esm'],
    dts: false,
    clean: false,
    external: ['better-sqlite3', 'mysql2', 'pg'],
  },
]);`,
    },
    {
      path: 'src/index.ts',
      content: `import { Core } from '@dyyz1993/xcli-core';
import { createDatabaseWorker } from './worker.js';
import { registerCommands } from './commands/index.js';

export function createApp() {
  const app = new Core({
    name: '{{projectName}}',
    version: '0.1.0',
    description: '{{description}}',
    configDirName: '.{{projectName}}',
    envPrefix: '{{ProjectName}}',
    pluginDirs: [],
  });

  registerCommands(app);

  return app;
}

export { createDatabaseWorker };
export { version } from './version.js';
`,
    },
    {
      path: 'src/version.ts',
      content: `export const version = '0.1.0';
`,
    },
    {
      path: 'src/types.ts',
      content: `export interface DatabaseConfig {
  dbType: 'mysql' | 'postgres' | 'sqlite';
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  filename?: string;
}

export interface DatabaseConnection {
  query(sql: string, params?: unknown[]): Promise<QueryResult>;
  run(sql: string, params?: unknown[]): Promise<RunResult>;
  close(): Promise<void>;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  columns: string[];
  rowCount: number;
}

export interface RunResult {
  changes: number;
  lastInsertRowid?: number | bigint;
}

export interface TableInfo {
  name: string;
  type: string;
  schema?: string;
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  primaryKey: boolean;
}
`,
    },
    {
      path: 'src/connection.ts',
      content: `import type { DatabaseConfig, DatabaseConnection, QueryResult, RunResult } from './types.js';

export async function createConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
  switch (config.dbType) {
    case 'sqlite':
      return createSqliteConnection(config);
    case 'mysql':
      return createMysqlConnection(config);
    case 'postgres':
      return createPostgresConnection(config);
    default:
      throw new Error(\`Unsupported database type: \${config.dbType}\`);
  }
}

async function createSqliteConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
  const Database = (await import('better-sqlite3')).default;
  const db = new Database(config.filename || ':memory:');

  return {
    async query(sql: string, params?: unknown[]): Promise<QueryResult> {
      const stmt = db.prepare(sql);
      if (stmt.reader) {
        const rows = stmt.all(...(params || [])) as Record<string, unknown>[];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return { rows, columns, rowCount: rows.length };
      }
      const info = stmt.run(...(params || []));
      return {
        rows: [],
        columns: [],
        rowCount: info.changes,
      };
    },
    async run(sql: string, params?: unknown[]): Promise<RunResult> {
      const stmt = db.prepare(sql);
      const info = stmt.run(...(params || []));
      return { changes: info.changes, lastInsertRowid: info.lastInsertRowid as number | bigint };
    },
    async close(): Promise<void> {
      db.close();
    },
  };
}

async function createMysqlConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
  const mysql = await import('mysql2/promise');
  const pool = mysql.createPool({
    host: config.host || 'localhost',
    port: config.port || 3306,
    user: config.user || 'root',
    password: config.password || '',
    database: config.database,
  });

  return {
    async query(sql: string, params?: unknown[]): Promise<QueryResult> {
      const [rows] = await pool.execute(sql, params);
      if (Array.isArray(rows)) {
        const columns = rows.length > 0 ? Object.keys(rows[0] as Record<string, unknown>) : [];
        return { rows: rows as Record<string, unknown>[], columns, rowCount: rows.length };
      }
      const info = rows as { affectedRows: number; insertId: number };
      return { rows: [], columns: [], rowCount: info.affectedRows };
    },
    async run(sql: string, params?: unknown[]): Promise<RunResult> {
      const [result] = await pool.execute(sql, params);
      const info = result as { affectedRows: number; insertId: number };
      return { changes: info.affectedRows, lastInsertRowid: info.insertId };
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}

async function createPostgresConnection(config: DatabaseConfig): Promise<DatabaseConnection> {
  const { Pool } = await import('pg');
  const pool = new Pool({
    host: config.host || 'localhost',
    port: config.port || 5432,
    user: config.user || 'postgres',
    password: config.password || '',
    database: config.database,
  });

  return {
    async query(sql: string, params?: unknown[]): Promise<QueryResult> {
      const result = await pool.query(sql, params);
      return {
        rows: result.rows,
        columns: result.fields.map((f: { name: string }) => f.name),
        rowCount: result.rowCount ?? 0,
      };
    },
    async run(sql: string, params?: unknown[]): Promise<RunResult> {
      const result = await pool.query(sql, params);
      return { changes: result.rowCount ?? 0 };
    },
    async close(): Promise<void> {
      await pool.end();
    },
  };
}

let _defaultConn: DatabaseConnection | null = null;
let _defaultConfig: DatabaseConfig = { dbType: 'sqlite', filename: 'data.db' };

export function setDefaultConfig(config: DatabaseConfig): void {
  _defaultConfig = config;
}

export async function getDefaultConnection(): Promise<DatabaseConnection> {
  if (!_defaultConn) {
    _defaultConn = await createConnection(_defaultConfig);
  }
  return _defaultConn;
}
`,
    },
    {
      path: 'src/context.ts',
      content: `import type { CommandContext } from '@dyyz1993/xcli-core';
import type { DatabaseConnection } from './types.js';

export interface DatabaseCommandContext extends CommandContext {
  connection: DatabaseConnection;
}
`,
    },
    {
      path: 'src/scope.ts',
      content: `export const DATABASE_SCOPE_ORDER: Record<string, number> = {
  project: 0,
  database: 1,
  table: 2,
  row: 3,
};
`,
    },
    {
      path: 'src/worker.ts',
      content: `import type { WorkerEntryPoint, WorkerContext } from '@dyyz1993/xcli-core';
import { createConnection } from './connection.js';
import type { DatabaseConnection, DatabaseConfig } from './types.js';

function parseConfig(raw: Record<string, unknown>): DatabaseConfig {
  return {
    dbType: (raw.dbType as DatabaseConfig['dbType']) ?? 'sqlite',
    host: raw.host as string | undefined,
    port: raw.port as number | undefined,
    user: raw.user as string | undefined,
    password: raw.password as string | undefined,
    database: raw.database as string | undefined,
    filename: raw.filename as string | undefined,
  };
}

export class DatabaseWorker implements WorkerEntryPoint {
  private ctx!: WorkerContext;
  private connection!: DatabaseConnection;

  async init(ctx: WorkerContext): Promise<void> {
    this.ctx = ctx;
    const config = parseConfig(ctx.config);
    this.connection = await createConnection(config);
    ctx.ipc.send('database:ready', { dbType: config.dbType });
  }

  async execute(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'query':
        return this.connection.query(params.sql as string, params.values as unknown[]);

      case 'tables': {
        const config = parseConfig(this.ctx.config);
        const sql =
          config.dbType === 'sqlite'
            ? "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'"
            : config.dbType === 'mysql'
              ? 'SHOW TABLES'
              : "SELECT tablename as name, 'table' as type FROM pg_tables WHERE schemaname = 'public'";
        return this.connection.query(sql);
      }

      case 'describe': {
        const config = parseConfig(this.ctx.config);
        const table = params.table as string;
        const sql =
          config.dbType === 'sqlite'
            ? \`PRAGMA table_info("\${table}")\`
            : config.dbType === 'mysql'
              ? \`DESCRIBE \\\`\${table}\\\`\`
              : \`SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '\${table}' ORDER BY ordinal_position\`;
        return this.connection.query(sql);
      }

      case 'insert': {
        const table = params.table as string;
        const data = params.data as Record<string, unknown>;
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = values.map((_, i) => parseConfig(this.ctx.config).dbType === 'postgres' ? \`$\${i + 1}\` : '?').join(', ');
        const columns = keys.join(', ');
        const sql = \`INSERT INTO "\${table}" (\${columns}) VALUES (\${placeholders})\`;
        return this.connection.run(sql, values);
      }

      case 'ping':
        return this.connection.query('SELECT 1 as ok');

      default:
        throw new Error(\`Unknown method: \${method}\`);
    }
  }

  async destroy(): Promise<void> {
    await this.connection?.close();
  }
}

export function createDatabaseWorker(): WorkerEntryPoint {
  return new DatabaseWorker();
}
`,
    },
    {
      path: 'src/commands/query.ts',
      content: `import { z } from 'zod/v4';
import type { Core } from '@dyyz1993/xcli-core';
import { ok } from '@dyyz1993/xcli-core';
import { getDefaultConnection } from '../connection.js';

export function registerQueryCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: '{{projectName}}',
    url: '',
  });

  site.command('query', {
    description: 'Execute a SQL query',
    scope: 'database',
    parameters: z.object({
      sql: z.string().describe('SQL query to execute'),
      values: z.array(z.unknown()).optional().describe('Query parameters'),
    }),
    handler: async (params) => {
      const conn = await getDefaultConnection();
      const result = await conn.query(params.sql, params.values);
      return ok(result, [\`查询返回 \${result.rowCount} 行\`]);
    },
  });
}
`,
    },
    {
      path: 'src/commands/tables.ts',
      content: `import { z } from 'zod/v4';
import type { Core } from '@dyyz1993/xcli-core';
import { ok } from '@dyyz1993/xcli-core';
import { getDefaultConnection } from '../connection.js';

export function registerTablesCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: '{{projectName}}',
    url: '',
  });

  site.command('tables', {
    description: 'List all tables in the database',
    scope: 'database',
    parameters: z.object({}).strict(),
    handler: async () => {
      const conn = await getDefaultConnection();
      const config = { dbType: 'sqlite' } as const;
      const sql = config.dbType === 'sqlite'
        ? "SELECT name, type FROM sqlite_master WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'"
        : 'SHOW TABLES';
      const result = await conn.query(sql);
      return ok(result, [\`共 \${result.rowCount} 个表\`]);
    },
  });
}
`,
    },
    {
      path: 'src/commands/describe.ts',
      content: `import { z } from 'zod/v4';
import type { Core } from '@dyyz1993/xcli-core';
import { ok } from '@dyyz1993/xcli-core';
import { getDefaultConnection } from '../connection.js';

export function registerDescribeCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: '{{projectName}}',
    url: '',
  });

  site.command('describe', {
    description: 'Describe a table structure',
    scope: 'table',
    parameters: z.object({
      table: z.string().describe('Table name to describe'),
    }),
    handler: async (params) => {
      const conn = await getDefaultConnection();
      const sql = \`PRAGMA table_info("\${params.table}")\`;
      const result = await conn.query(sql);
      return ok(result, [\`表 \${params.table} 共 \${result.rowCount} 列\`]);
    },
  });
}
`,
    },
    {
      path: 'src/commands/insert.ts',
      content: `import { z } from 'zod/v4';
import type { Core } from '@dyyz1993/xcli-core';
import { ok } from '@dyyz1993/xcli-core';
import { getDefaultConnection } from '../connection.js';

export function registerInsertCommand(app: Core): void {
  const site = app.loader.getAPI().createSite({
    name: '{{projectName}}',
    url: '',
  });

  site.command('insert', {
    description: 'Insert a row into a table',
    scope: 'table',
    parameters: z.object({
      table: z.string().describe('Target table name'),
      data: z.record(z.unknown()).describe('Column-value pairs to insert'),
    }),
    handler: async (params) => {
      const conn = await getDefaultConnection();
      const keys = Object.keys(params.data);
      const values = Object.values(params.data);
      const placeholders = values.map(() => '?').join(', ');
      const columns = keys.join(', ');
      const sql = \`INSERT INTO "\${params.table}" (\${columns}) VALUES (\${placeholders})\`;
      const result = await conn.run(sql, values);
      return ok(result, [\`插入成功，影响 \${result.changes} 行\`]);
    },
  });
}
`,
    },
    {
      path: 'src/commands/index.ts',
      content: `import type { Core } from '@dyyz1993/xcli-core';
import { registerQueryCommand } from './query.js';
import { registerTablesCommand } from './tables.js';
import { registerDescribeCommand } from './describe.js';
import { registerInsertCommand } from './insert.js';

export function registerCommands(app: Core): void {
  registerQueryCommand(app);
  registerTablesCommand(app);
  registerDescribeCommand(app);
  registerInsertCommand(app);
}
`,
    },
    {
      path: 'bin/cli.ts',
      content: `#!/usr/bin/env node
import { createApp } from '../src/index.js';

const app = createApp();

try {
  await app.run(process.argv.slice(2));
} catch (err) {
  console.error(err);
  process.exit(1);
}
`,
      mode: 0o755,
    },
    {
      path: '.gitignore',
      content: `node_modules/
dist/
*.tgz
.env
*.db
*.sqlite
`,
    },
    ...getEngineeringFiles(),
    {
      path: '.husky/pre-commit',
      content: getPreCommitHook(),
      mode: 0o755,
    },
    {
      path: 'README.md',
      content: `# {{projectName}}

{{description}}

## Install

\`\`\`bash
npm install
\`\`\`

## Build

\`\`\`bash
npm run build
\`\`\`

## Usage

\`\`\`bash
node dist/cli.js <command>
\`\`\`

## Commands

| Command | Scope | Description |
|---------|-------|-------------|
| \`query\` | database | Execute a SQL query |
| \`tables\` | database | List all tables |
| \`describe\` | table | Describe table structure |
| \`insert\` | table | Insert a row into a table |

## Database Setup

### SQLite (default)

No extra dependencies needed. Data stored in a local file.

### MySQL

\`\`\`bash
npm install mysql2
\`\`\`

### PostgreSQL

\`\`\`bash
npm install pg
\`\`\`

## Development

\`\`\`bash
npm run dev
\`\`\`
`,
    },
  ],
};
