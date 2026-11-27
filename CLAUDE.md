# Ticketing Tool

AI-powered support ticketing system: reads support emails, answers the ones the knowledge base covers automatically,
and leaves the rest for human agents. Demo/tutorial project, not used with real customers.

- What it does: [project-scope.md](project-scope.md)
- Stack and design decisions: [tech-stack.md](tech-stack.md)
- Phased task list: [implementation-plan.md](implementation-plan.md). Tick tasks off as they're completed.

## Documentation: always use Context7

Use the Context7 MCP to fetch current documentation before writing or changing code that uses a library, framework,
CLI or API, even well-known ones. Versions in this project are recent (Bun 1.4, Express 5, Vite 8, React 19,
TypeScript 7), so training data is often out of date.

1. Resolve the library ID with `resolve-library-id` (or use one from the table below).
2. Query with `query-docs`, one concept per query, passing `language: "TypeScript"`.
3. Prefer a version-specific ID matching the version in `package.json` when one exists.

| Library | Context7 ID |
|---|---|
| Bun (runtime, `bun test`, workspaces) | `/oven-sh/bun` |
| Express 5 | `/expressjs/express/v5.3.0` |
| Vite | `/vitejs/vite` |
| Prisma ORM 7 | `/prisma/orm/7.10.1` (guides: `/prisma/web`) |
| Better Auth 1.7 | `/better-auth/better-auth/v1.7.15` |
| React Router 8 (declarative mode) | `/remix-run/react-router` |
| Tailwind CSS 4 | `/tailwindlabs/tailwindcss.com` |
| React Hook Form 7 | `/react-hook-form/documentation` |
| Hook Form resolvers (`zodResolver`) | `/react-hook-form/resolvers` |
| Zod 4 | `/colinhacks/zod` |
| shadcn/ui (Base UI, `base-nova` style) | `/shadcn-ui/ui` |
| Playwright (`@playwright/test`) | `/microsoft/playwright` |

Add libraries to this table as they're introduced (pg-boss, Anthropic SDK, ...).

**Prisma: stay on version 7.** npm's `latest` tag is Prisma 8 ("Prisma Next"), a rewrite with no `schema.prisma`,
`generate` or `migrate dev`. Many current Prisma docs describe 8; only follow docs for Prisma 7.

## Commands (run from the repo root)

| Command | What it does |
|---|---|
| `bun install` | Install dependencies for all workspaces |
| `bun run dev` | Start client (http://localhost:5173) and server (http://localhost:3000) with reload |
| `bun run test` | Server tests (`bun test`) |
| `bun run test:e2e` | End-to-end tests (Playwright) against the test database |
| `bun run typecheck` | Type-check the server and e2e, and build the client |
| `bun run lint` | Lint the client (oxlint) |
| `bun run build` | Build the client into `client/dist` |

Database commands (run from `server/`):

| Command | What it does |
|---|---|
| `bun run db:migrate --name <change>` | Create and apply a new migration in development |
| `bun run db:deploy` | Apply pending migrations (deploys, CI) |
| `bun run db:status` | Show migration status |
| `bun run db:seed` | Create the user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if missing (idempotent) |
| `bun run db:generate` | Regenerate the Prisma Client (after every schema change; `migrate dev` doesn't) |
| `bun run db:studio` | Open Prisma Studio |

## Layout

```
client/   React + TypeScript (Vite)
server/   Express 5 + TypeScript, run directly by Bun (no build step)
e2e/      Playwright end-to-end tests (tests in e2e/tests/)
```

## End-to-end tests (Playwright)

Playwright tests live in `e2e/tests/`. How they're written, run and set up (separate `ticketing-tool-test`
database, own ports) is in `.claude/agents/e2e-test-writer.md`.

- **Delegate e2e test work to the `e2e-test-writer` subagent:** adding, extending or fixing tests in `e2e/`. Don't
  write Playwright tests in the main session.
- **When:** when asked, and after finishing a user-visible feature whose implementation-plan task or "Done when"
  describes a flow (log in, admin creates agent, ticket reply, ...). Ask before starting it if the user didn't.
- **What to tell it:** the flow or feature to cover, the routes, pages and API endpoints involved, which roles
  should and shouldn't have access, and anything not built yet that it should leave out. It starts cold: it
  doesn't see this conversation.
- **Afterwards:** relay its report. It only changes `e2e/`; app bugs come back as `test.fixme()` tests and missing
  pieces (endpoints, accessible names, mocks) as a list. Fix those in the app, then have it remove the `fixme` and
  rerun.

## Conventions

- **Bun, not npm/node.** Use `bun add`, `bun run`, `bun test`. One lockfile (`bun.lock`) at the root; add
  dependencies from inside the workspace folder (`cd server && bun add ...`).
- **Tests use `bun test`** (`import { test, expect } from 'bun:test'`), not Vitest or Jest. Test files sit next to the
  code as `*.test.ts`.
- **Server structure:** `server/src/app.ts` builds the Express app (`createApp()`); `server/src/index.ts` only starts
  it. Tests start their own instance on a random port.
- **Express 5** forwards errors from async handlers to the error middleware automatically; no try/catch wrappers.
  API errors are JSON (`{ error: string }`).
- **API calls from the client use relative `/api/...` paths.** Vite proxies them in development; in production
  Express serves the client, so it's the same origin. Don't add CORS (cookie sessions make permissive CORS unsafe).
- **Database:** local PostgreSQL, database `ticketing-tool`, URL in `server/.env` (`DATABASE_URL`). Versioned
  migrations from the first table (Prisma Migrate). Never `prisma db push`, never create tables at runtime, and never
  edit an applied migration. See tech-stack.md → Database.
- **Prisma setup:** config in `server/prisma.config.ts`, schema in `server/prisma/schema.prisma`, client generated to
  `server/src/generated/prisma` (gitignored). Import the shared client from `server/src/db/prisma.ts`; it uses the
  `@prisma/adapter-pg` driver adapter.
- **Running Prisma CLI:** always through the `db:*` scripts. Prisma 7 doesn't load `.env`, and Bun doesn't auto-load
  it for package binaries, so the scripts pass `--env-file=.env`.
- **Dependencies are injected into `createApp()`** (e.g. `checkDatabase`) so route tests can run without a database.
  Tests that need the real database (like `src/db/prisma.test.ts`) use `DATABASE_URL`.
- **UI components: shadcn/ui** (Base UI primitives, default Nova theme, config in `client/components.json`). Add
  components with `cd client && bunx --bun shadcn@latest add <name>`; they land in `client/src/components/ui/`.
  Client code can import via the `@/` alias (`@/components/ui/button.tsx`).
- **Styling: use the shadcn theme, not fixed colors.** Build UI from the components in `client/src/components/ui/`
  and the theme tokens (`bg-background`, `bg-muted`, `text-muted-foreground`, `text-destructive`, `border`, ...),
  never hard-coded palette classes like `bg-blue-600` or `text-gray-700`; those bypass the theme and dark mode. The
  theme's CSS variables live in `client/src/index.css`.
- TypeScript is strict on both sides. Imports use explicit `.ts`/`.tsx` extensions.

## Authentication

Better Auth with email/password, sessions stored in PostgreSQL. Design and reasons: tech-stack.md → Authentication.

**Server**
- Config: `server/src/auth/auth.ts` (`auth`, `Session` type). Rate limiting is on only when
  `NODE_ENV=production`, so every deploy must set it. No `cookieCache` or `secondaryStorage`: every request
  checks the database, so signing out takes effect immediately. Keep it that way.
- Better Auth's handler serves everything under `/api/auth/*` and is mounted **before** `express.json()` (it reads the
  raw body). Our own endpoints never go under `/api/auth` (e.g. the current user is `GET /api/me`).
- Protect routes with `requireAuth(getSession)` from `server/src/auth/require-auth.ts`: 401 JSON without a session,
  otherwise sets `req.user` / `req.session` (types in `server/src/types/express.d.ts`, inferred from the auth config).
- `authHandler` and `getSession` are injected into `createApp()`, like `checkDatabase`; route tests can pass a fake
  `getSession`. `server/src/auth/auth.test.ts` signs in for real against the database.
- **No public sign-up** (`disableSignUp: true`). Users are created on the server with `ensureUser()` from
  `server/src/db/seed.ts` (the seed, tests, later user management), never via `auth.api.signUpEmail`.
- **Roles:** `admin` / `agent`, the Prisma enum `Role` in `user.role` (default `agent`). Use `Role.admin` /
  `Role.agent` from `src/generated/prisma/enums.ts`, never string literals. The field has `input: false`, so only
  server code can set it, never a request body.
- **Auth tables are Prisma migrations too.** After changing the auth config (fields, plugins), run `bunx auth
  generate`, keep `role Role` (it writes `role String`), then `bun run db:migrate --name <change>`. Never
  `auth migrate`.
- CSRF origin checks stay on. In development `trustedOrigins` contains the Vite origin (`http://localhost:5173`); in
  production the client is same-origin.
- Env vars in `server/.env` (see `.env.example`): `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `ADMIN_EMAIL` /
  `ADMIN_PASSWORD` for the seed.

**Client**
- Use the shared `authClient` from `client/src/lib/auth-client.ts` (no `baseURL`: same origin, default base path
  `/api/auth`). `authClient.useSession()` for the session, `authClient.signIn.email()` / `authClient.signOut()`;
  `SessionUser` is the user type.
- Signed-in pages go inside the `<RequireAuth />` layout route in `client/src/App.tsx`, which redirects to `/login`
  without a session and renders the nav bar. `/login` redirects to `/` when already signed in.
- Admin-only pages go inside the `<RequireAdmin />` layout route (nested in `<RequireAuth />`), which sends
  non-admins to `/`. Admin-only nav links check `user.role === 'admin'` in `NavBar.tsx`.
- Hiding a page in the client is not security: admin-only API routes still need a server-side role check.
