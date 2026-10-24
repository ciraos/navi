import "server-only";

import { Pool, types, type PoolClient, type QueryResultRow } from "pg";

// PostgreSQL 的 timestamp 列不带时区，历史数据按 UTC 写入；
// 这里固定按 UTC 解析，避免 node-postgres 按本机时区解释。
types.setTypeParser(1114, (value: string) => new Date(`${value.replace(" ", "T")}Z`));

const globalForDb = globalThis as unknown as {
  __naviPool?: Pool;
  __naviSchema?: Promise<void>;
};

export function getDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) throw new Error("DATABASE_URL 未配置");

  return raw
    .replace(/^postgresql\+[^:]+:\/\//, "postgresql://")
    .replace(/^postgres\+[^:]+:\/\//, "postgres://");
}

export function getPool(): Pool {
  if (!globalForDb.__naviPool) {
    const pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    });
    pool.on("error", (error) => {
      console.error("[db] idle client error", error);
    });
    globalForDb.__naviPool = pool;
  }

  return globalForDb.__naviPool;
}

async function createSchema(): Promise<void> {
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_admin BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL,
      last_login_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(80) NOT NULL UNIQUE,
      icon VARCHAR(16),
      description VARCHAR(255),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sites (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      title VARCHAR(120) NOT NULL,
      url VARCHAR(2048) NOT NULL,
      description VARCHAR(500),
      icon VARCHAR(512),
      sort_order INTEGER NOT NULL DEFAULT 0,
      clicks INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      id INTEGER PRIMARY KEY,
      site_name VARCHAR(80),
      icp VARCHAR(120),
      police VARCHAR(120),
      updated_at TIMESTAMP NOT NULL
    )
  `);

  // 老库补列：create table if not exists 不会给已有表加字段
  await pool.query("ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS site_name VARCHAR(80)");

  await pool.query("CREATE INDEX IF NOT EXISTS ix_sites_category_id ON sites (category_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS ix_sites_category_sort ON sites (category_id, sort_order)");

  console.info("[db] schema ready");
}

export async function ensureSchema(): Promise<void> {
  if (!globalForDb.__naviSchema) {
    globalForDb.__naviSchema = createSchema().catch((error) => {
      globalForDb.__naviSchema = undefined;
      throw error;
    });
  }
  return globalForDb.__naviSchema;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  await ensureSchema();
  const result = await getPool().query<T>(text, params as never[]);
  return result.rows;
}

export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

/** 通知所有打开的前台页面重新拉取导航数据。 */
export async function notifyNav(): Promise<void> {
  try {
    await query("SELECT pg_notify('navi_events', $1)", ["nav"]);
  } catch (error) {
    console.error("[db] notify failed", error);
  }
}
