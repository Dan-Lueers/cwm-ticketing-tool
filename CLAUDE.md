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

Add libraries to this table as they're introduced (Prisma, React Router, Tailwind, pg-boss, Anthropic SDK, ...).

## Commands (run from the repo root)

| Command | What it does |
|---|---|
| `bun install` | Install dependencies for all workspaces |
| `bun run dev` | Start client (http://localhost:5173) and server (http://localhost:3000) with reload |
| `bun run test` | Server tests (`bun test`) |
| `bun run typecheck` | Type-check the server and build the client |
| `bun run lint` | Lint the client (oxlint) |
| `bun run build` | Build the client into `client/dist` |

## Layout

```
client/   React + TypeScript (Vite)
server/   Express 5 + TypeScript, run directly by Bun (no build step)
```

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
- **Database:** versioned migrations from the first table (Prisma Migrate). Never `prisma db push`, never create
  tables at runtime, and never edit an applied migration. See tech-stack.md → Database.
- TypeScript is strict on both sides. Imports use explicit `.ts`/`.tsx` extensions.
