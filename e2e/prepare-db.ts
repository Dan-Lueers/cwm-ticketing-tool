// Rebuilds the end-to-end test database from scratch: drop, create, apply the migrations, seed the admin.
// Runs before the test server starts (playwright.config.ts) and via `bun run db:reset`. It only reads the
// environment it's given (e2e/.env), never server/.env, so it can't touch the development database.
import { SQL } from 'bun'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL must be set (see e2e/.env.example).')

const url = new URL(databaseUrl)
const name = decodeURIComponent(url.pathname.slice(1))
// The database is dropped on every run, so refuse anything that doesn't look like a test database.
if (!/^[A-Za-z0-9_-]+-test$/.test(name)) {
  throw new Error(`Refusing to reset "${name}": the end-to-end database name must end in "-test".`)
}

// Connect to the maintenance database to drop and create the test database.
const adminUrl = new URL(url)
adminUrl.pathname = '/postgres'
const sql = new SQL(adminUrl.toString())
try {
  // The name is checked above, so it's safe to quote it as an identifier. FORCE ends leftover connections.
  await sql.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
  await sql.unsafe(`CREATE DATABASE "${name}"`)
} finally {
  await sql.close()
}

const serverDir = new URL('../server/', import.meta.url).pathname

/** Runs a command in server/ with this environment only (--no-env-file keeps server/.env out). */
async function run(cmd: string[]) {
  // The seed loads the auth config, which wants a base URL; Playwright passes the real one, `db:reset` doesn't.
  const env = { BETTER_AUTH_URL: 'http://localhost:3100', ...process.env }
  const proc = Bun.spawn(cmd, { cwd: serverDir, env, stdout: 'inherit', stderr: 'inherit' })
  if ((await proc.exited) !== 0) throw new Error(`Command failed: ${cmd.join(' ')}`)
}

// Same steps as a deploy: migrations first, then the admin seed.
await run(['bun', '--no-env-file', '--bun', 'prisma', 'migrate', 'deploy'])
await run(['bun', '--no-env-file', 'src/db/seed.ts'])

console.log(`Test database "${name}" rebuilt from migrations and seeded.`)
