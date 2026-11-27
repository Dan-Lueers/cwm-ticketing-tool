# Implementation plan

Based on [project-scope.md](project-scope.md) and [tech-stack.md](tech-stack.md).

Each phase ends with something that runs and can be demoed. Real email comes late on purpose: until then, a dev-only
endpoint simulates incoming emails and outgoing emails are logged, so the whole AI flow can be built and tested first.

## Decisions needed before certain phases

| Decision | Needed before |
|---|---|
| Difference between "resolved" and "closed", and who sets each | Phase 4 |
| Can the AI auto-answer refund requests? | Phase 7 |
| SendGrid or Mailgun | Phase 8 |

---

## Phase 0 — Project setup
- [x] 0.1 Create the folder layout: `/client`, `/server`, root `package.json` with Bun workspaces
- [x] 0.2 Server: Express + TypeScript, `bun --watch` for dev, `GET /api/health` endpoint
- [x] 0.3 Client: Vite + React + TypeScript
- [x] 0.4 Vite dev proxy from `/api` to the Express server
- [ ] 0.5 ESLint + Prettier for both packages (client has oxlint from the Vite template; server has no linter yet)
- [ ] 0.6 `docker-compose.yml` with PostgreSQL for local development (currently using local Homebrew PostgreSQL)
- [ ] 0.7 Environment config: `.env.example`, validated on startup with Zod (the server refuses to start on missing vars)
      (`server/.env.example` exists; Zod validation not done yet)
- [x] 0.8 `bun test` set up in the server, passing tests for `/api/health`
- [x] 0.9 Root scripts: `dev` (client + server together), `build`, `test`, `lint`

**Done when:** `bun run dev` shows the React page, which calls `/api/health` successfully. ✅

## Phase 1 — Database and migrations
- [x] 1.1 Add Prisma, point it at the local PostgreSQL
- [x] 1.2 First migration: Better Auth tables (`user`, `session`, `account`, `verification`), generated with
      `bunx auth generate` into `schema.prisma`, applied with Prisma Migrate
- [x] 1.3 Migration: add `role` to `user` as a `Role` enum (`admin`/`agent`, default `agent`; Better Auth
      `additionalFields`, `input: false`)
- [ ] 1.3b Migration: add `active` to `user`
- [ ] 1.4 `migrate` script runs `prisma migrate deploy`; the server's start script runs it before listening
- [ ] 1.5 Test database: test setup builds a fresh database from the migrations (no hand-written tables)
- [x] 1.6 Seed script (`bun run db:seed`): creates the user from `ADMIN_EMAIL` / `ADMIN_PASSWORD` if it doesn't exist
      (idempotent)
- [x] 1.7 Seed makes that user an admin (creates it with `role: admin`, or promotes an existing user)

**Done when:** an empty database is built from migrations alone, and the seed creates the admin exactly once.

## Phase 2 — Authentication
- [x] 2.1 Better Auth (`server/src/auth/auth.ts`): email/password, Prisma adapter, database sessions, public sign-up
      disabled
- [x] 2.2 Mount the handler at `/api/auth/*splat` (before `express.json()`): `POST /api/auth/sign-in/email`,
      `POST /api/auth/sign-out`, `GET /api/auth/get-session`
- [x] 2.3 Middleware: `requireAuth` (sets `req.user` / `req.session`, typed in `src/types/express.d.ts`)
- [x] 2.3b `GET /api/me`: the signed-in user, 401 without a session
- [ ] 2.4 Middleware: `requireAdmin` (403 unless `req.user.role` is `admin`)
- [ ] 2.4b Deactivated users can't sign in and lose their sessions (after 1.3b)
- [ ] 2.5 Login rate limiting: check Better Auth's built-in limit (on in production) fits, set `rateLimit` if not
- [x] 2.6 Integration tests: sign-in success/failure, sign-out, protected route without session → 401, sign-up disabled
- [ ] 2.6b Integration test: deactivated user can't sign in (after 2.4b)
- [x] 2.7 Client: login page, auth context (Better Auth React client's `useSession`, `client/src/lib/auth-client.ts`),
      sign-out button in the nav bar
- [ ] 2.8 Client: protected routes redirect to login; admin-only routes hidden from agents
      (redirect done via `RequireAuth` layout route; admin-only hiding still open)

**Done when:** the seeded admin can log in, reload the page and stay logged in, and log out.

## Phase 3 — User management (admin only)
- [ ] 3.1 `GET /api/users`, `POST /api/users` (create agent), `PATCH /api/users/:id` (edit name, deactivate)
- [ ] 3.2 Validation: unique email, password rules; admins can't deactivate themselves
- [ ] 3.3 Integration tests, including agents getting 403
- [ ] 3.4 Client: users page with list and "create agent" form

**Done when:** the admin creates an agent, and that agent can log in but can't see the users page.

## Phase 4 — Tickets (core, no AI yet)
- [ ] 4.1 Migration: `tickets` (subject, customer email/name, status enum, category enum (nullable), summary,
      assigned agent (nullable), timestamps)
- [ ] 4.2 Migration: `messages` (ticket id, direction inbound/outbound, author type customer/ai/agent, author agent id,
      body, email `Message-ID`, timestamps)
- [ ] 4.3 Dev seed: a handful of sample tickets and messages
- [ ] 4.4 `GET /api/tickets` with filtering (status, category, search) and sorting, paginated
- [ ] 4.5 `GET /api/tickets/:id` with its messages
- [ ] 4.6 `PATCH /api/tickets/:id` (status, category, assignee)
- [ ] 4.7 `POST /api/tickets/:id/replies` — agent reply, stored as an outbound message (sending comes in phase 8)
- [ ] 4.8 Integration tests for the ticket endpoints
- [ ] 4.9 Client: ticket list with filters and sorting (TanStack Table optional)
- [ ] 4.10 Client: ticket detail with message thread, status/category controls, reply box

**Done when:** an agent can browse sample tickets, filter them, open one, change its status and write a reply.

## Phase 5 — Incoming email (simulated)
- [ ] 5.1 Define an internal `InboundEmail` type (from, subject, text, Message-ID, In-Reply-To, References)
- [ ] 5.2 `POST /api/dev/inbound` (only when not in production) accepts an `InboundEmail`
- [ ] 5.3 Ingest service: new email → new ticket + inbound message; reply to an existing thread → message on the same
      ticket (matched via In-Reply-To/References), and reopens it if resolved
- [ ] 5.4 Ignore duplicates (same Message-ID)
- [ ] 5.5 Skip auto-replies and bounces (`Auto-Submitted`, `Precedence: bulk`, mailer-daemon senders), so no reply loops
- [ ] 5.6 Unit tests for threading, duplicates and auto-reply detection
- [ ] 5.7 Client (dev only): a "simulate incoming email" form

**Done when:** a simulated email creates a ticket, and a simulated reply lands on the same ticket.

## Phase 6 — Knowledge base
- [ ] 6.1 Migration: `knowledge_base` table (content, source doc id, fetched at)
- [ ] 6.2 Fetch the Google Doc as plain text (export URL for a link-shared doc, or the Google Docs API)
- [ ] 6.3 `POST /api/kb/refresh` (admin) and `GET /api/kb` (show content and last refresh time)
- [ ] 6.4 Client: knowledge base page with "refresh" button
- [ ] 6.5 Tests with the Google fetch mocked

**Done when:** the admin refreshes the knowledge base and sees the doc's text in the app.

## Phase 7 — AI processing
- [ ] 7.1 Add pg-boss. Create its tables via a migration (its schema SQL) rather than letting it create them at
      runtime, if the library supports that; check the pg-boss docs
- [ ] 7.2 Ingest enqueues a `process-ticket` job after saving the email; the worker runs in the same process
- [ ] 7.3 Claude client (`@anthropic-ai/sdk`, `claude-opus-5-5`), API key from env
- [ ] 7.4 Prompt: knowledge base in the system prompt (prompt caching), customer email in the user message
- [ ] 7.5 Structured output schema: `{ category, canAnswerFromKb, reply, summary, kbSection }` validated with Zod
- [ ] 7.6 Job handler: save category and summary; if `canAnswerFromKb`, store the reply as an AI outbound message,
      "send" it and mark the ticket resolved; otherwise keep it open and save the reply as a suggested reply
- [ ] 7.7 Outbound sending behind an `EmailSender` interface; for now a `LogEmailSender` that just logs
- [ ] 7.8 Error handling: retries for transient API errors; after the final failure the ticket stays open for a human
- [ ] 7.9 Tests with the Claude client mocked: auto-answer path, escalation path, invalid output, API failure
- [ ] 7.10 Client: show summary, category, "answered by AI" badge, and the suggested reply (editable) on the detail view
- [ ] 7.11 Manual check with the real API: a few emails the KB covers and a few it doesn't

**Done when:** a simulated email gets categorised and summarised, and is either answered automatically or left open
with a suggested reply.

## Phase 8 — Real email (SendGrid or Mailgun)
- [ ] 8.1 Decide on the provider; create the account; set up the domain (MX for inbound, SPF/DKIM for sending)
- [ ] 8.2 Provider `EmailSender` implementation; sets `Message-ID`, `In-Reply-To`, `References` for threading
- [ ] 8.3 Inbound webhook endpoint: parse the provider's payload into `InboundEmail`, then reuse the phase 5 ingest
- [ ] 8.4 Verify webhook signatures; reject unsigned requests
- [ ] 8.5 Strip quoted history from replies (Mailgun `stripped-text`, or a parser for SendGrid)
- [ ] 8.6 Agent replies from phase 4 now send through the provider
- [ ] 8.7 Tests with recorded sample webhook payloads
- [ ] 8.8 End-to-end check locally with ngrok: send a real email, receive the AI reply, reply again, confirm threading

**Done when:** a real email to the support address gets a real reply, and the customer's answer lands on the same ticket.

## Phase 9 — Dashboard
- [ ] 9.1 `GET /api/stats`: tickets by status and category, AI-resolved share, tickets waiting for a human
- [ ] 9.2 Client: dashboard page with the stats and a "needs attention" list (open tickets, oldest first)

**Done when:** the dashboard shows correct numbers for the sample data.

## Phase 10 — Deployment (Docker + Railway)
- [ ] 10.1 Multi-stage `Dockerfile`: build the client and server, run Express serving API and static client
- [ ] 10.2 Express serves the client build and falls back to `index.html` for React Router routes
- [ ] 10.3 Container start: `prisma migrate deploy` → admin seed → start server
- [ ] 10.4 Build and run the image locally against docker-compose PostgreSQL
- [ ] 10.5 Railway project: app service from the Dockerfile + Railway Postgres
- [ ] 10.6 Set environment variables on Railway; point the email provider's webhook at the Railway URL
- [ ] 10.7 Smoke test on Railway: log in as admin, create an agent, send an email, see the AI reply

**Done when:** the full flow works on the Railway URL.

## Phase 11 — End-to-end tests and polish
- [ ] 11.1 Playwright: login, admin creates agent, ticket list filtering, ticket detail reply, simulated email → AI answer (mocked)
- [ ] 11.2 Loading, empty and error states on every page
- [ ] 11.3 README: local setup, environment variables, how to run tests, how to deploy
