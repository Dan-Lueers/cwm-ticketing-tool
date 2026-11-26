# Tech stack

See [project-scope.md](project-scope.md) for what the system does.

## Overview

| Layer | Choice |
|---|---|
| Runtime + package manager | Bun (workspaces) |
| Backend | Express 5 + TypeScript (running on Bun) |
| Frontend | React + TypeScript + Tailwind CSS + React Router (built with Vite) |
| Database | PostgreSQL |
| ORM + migrations | Prisma (Prisma Migrate) |
| Authentication | Better Auth (email/password, database sessions via the Prisma adapter) |
| AI | Claude API via `@anthropic-ai/sdk` |
| Email (inbound + outbound) | SendGrid or Mailgun — to be decided |
| Background jobs | pg-boss (job queue in PostgreSQL) |
| Testing | `bun test` (unit + integration), Playwright (end-to-end) |
| Deployment | Docker on Railway |

## Backend
- **Express 5 + TypeScript**, run directly by **Bun** (no build step; `bun --watch` in development).
- Request validation with **Zod**. Shared schemas can also type the frontend's API calls.
- The API serves JSON under `/api/*`. In production, Express also serves the built React app as static files, so the
  whole app is a single service.

## Frontend
- **React + TypeScript**, bundled with **Vite**.
- **Tailwind CSS** for styling.
- **React Router** for routing (login, ticket list, ticket detail, dashboard, user management).
- Optional: **TanStack Query** for fetching and caching data from the API, and **TanStack Table** for the ticket list's
  filtering and sorting.

## Database
- **PostgreSQL.** In local development it runs in Docker; on Railway it's a managed Railway Postgres.
- **Prisma** for queries and **Prisma Migrate** for schema changes:
  - Every schema change is a new numbered migration in `prisma/migrations/`, committed to git.
  - `prisma migrate deploy` runs before the app starts (see Deployment). Never use `prisma db push` against a database
    that holds real data.
  - Never edit a migration that has already been applied. Only additive changes per deploy; renames and drops take
    two deploys.
  - Tests build their database from the same migrations.
  - An empty database must be buildable from the migrations alone.

## Authentication
- **Better Auth** (`server/src/auth/auth.ts`) with email/password and the **Prisma adapter**.
  - Sessions are stored in PostgreSQL (`session` table). No `secondaryStorage` and no `cookieCache`, so every request
    is checked against the database and signing out takes effect immediately.
  - Its tables (`user`, `session`, `account`, `verification`) come from `bunx auth generate` and are applied with
    Prisma Migrate like every other table. After changing the auth config (fields, plugins), regenerate and add a
    migration; never `auth migrate`.
  - Public sign-up is disabled. Users are created on the server: the seed script, later the admin's user management.
  - The handler is mounted at `/api/auth/*splat` before `express.json()`. Routes check the session with `requireAuth`.
  - Cookies are `httpOnly`, `sameSite: "lax"` and `secure` in production (Better Auth defaults). Origin checks
    (CSRF) stay on; the Vite dev origin is in `trustedOrigins`.
- Passwords hashed by Better Auth (scrypt).
- Roles: `admin` and `agent`, a Postgres enum (`enum Role` in `schema.prisma`) stored in `user.role`, default `agent`.
  - Code uses Prisma's generated `Role` (`Role.admin`, `Role.agent` from `src/generated/prisma/enums.ts`), never
    string literals. Better Auth's `role` additional field takes its values from it, with `input: false` so no API
    request can set it; only server code does.
  - `bunx auth generate` writes `role String`: keep the enum when regenerating the schema. Only admins can create, edit or deactivate agents.
- **First admin**: a seed script creates the admin from environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`) on the
  first deploy, if no admin exists yet.

## AI
- **Claude API** via the official TypeScript SDK (`@anthropic-ai/sdk`), model `claude-opus-5-5`.
- **One call per incoming ticket**, using structured outputs so the response is typed JSON, e.g.
  `{ category, canAnswerFromKb, reply, summary, kbSection }`.
  - `category`: general question, technical question, or refund request.
  - `canAnswerFromKb`: if true, the reply is sent automatically; if false, the ticket stays open for a human and the
    reply is shown as a suggested reply.
- **Knowledge base**: the Google Doc is fetched as plain text, stored in a database table, and included in full in the
  system prompt with prompt caching. It's a single document, so no vector database is needed. Refreshed by an admin
  button (optionally also on a schedule).
- Customer email text goes in the user message, clearly separated from instructions. The model only produces text;
  it can't take any other actions.

## Email
Both SendGrid and Mailgun can receive email through an inbound webhook and send replies. **Decision still open.**

| | SendGrid | Mailgun |
|---|---|---|
| Inbound | Inbound Parse: POSTs `multipart/form-data` to your URL | Routes: forward matching emails to your URL as a POST |
| Parsed reply text | Full body; you strip quoted history yourself | Provides `stripped-text` (reply without quoted history) |
| Outbound | Mail Send API | Messages API |
| Setup | MX records on a domain or subdomain you control, plus SPF/DKIM for sending | Same |

Points to check before deciding:
- Which one the tutorial uses (the simplest choice is to follow it).
- Current free tier / trial limits for each.
- Webhook signature verification, so only the provider can post to the inbound endpoint.
- Threading: replies must set `In-Reply-To` and `References` headers so customer responses attach to the same ticket.

**Development without email**: a `POST /api/dev/inbound` endpoint (disabled in production) accepts the same payload
shape as the chosen provider's webhook, so the AI flow can be built and tested before email is set up. Use ngrok to
test the real webhook locally.

## Background jobs
- **pg-boss** stores jobs in PostgreSQL, so no extra service (like Redis) is needed.
- The inbound webhook saves the ticket and responds right away, then enqueues a job for the AI step. This keeps the
  webhook fast (providers retry slow webhooks) and lets failed AI calls retry without losing the email.
- For the demo, the worker runs in the same Node process as the API.

## Testing
- **`bun test`** for unit and integration tests; integration tests run against PostgreSQL built from the migrations.
- **Playwright** for end-to-end tests of the main flows (login, ticket list, ticket detail, admin creates agent).
- The Claude API and email provider are mocked in automated tests.

## Deployment
- **Docker**: a multi-stage `Dockerfile` builds the frontend and backend and produces one image that runs Express
  (API and static frontend).
- **docker-compose** for local development: app + PostgreSQL.
- **Railway**: the Docker image as the app service, plus Railway Postgres.
  - Migrations run as a deploy step before the app starts: `prisma migrate deploy`, then the admin seed, then the app.
- Configuration through environment variables: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ANTHROPIC_API_KEY`, email
  provider keys, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `KB_GOOGLE_DOC_ID`.

## Suggested project layout
```
/client        React app (Vite)
/server        Express API, worker, Prisma schema and migrations
Dockerfile
docker-compose.yml
```
