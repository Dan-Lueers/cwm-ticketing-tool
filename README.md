# Ticketing Tool

AI-powered support ticketing system. See [project-scope.md](project-scope.md), [tech-stack.md](tech-stack.md) and
[implementation-plan.md](implementation-plan.md).

## Requirements
- [Bun](https://bun.sh) 1.4+

## Getting started
```sh
bun install
bun run dev
```
- Client (Vite + React): http://localhost:5173
- Server (Express): http://localhost:3000. In development, the client forwards `/api/*` requests to it.

## Scripts (run from the repo root)
| Command | What it does |
|---|---|
| `bun run dev` | Starts the client and the server together, both reloading on changes |
| `bun run test` | Runs the server tests (`bun test`) |
| `bun run typecheck` | Type-checks the server and builds the client (which type-checks it too) |
| `bun run lint` | Lints the client (oxlint) |
| `bun run build` | Builds the client into `client/dist` |

## Layout
```
client/   React + TypeScript (Vite)
server/   Express + TypeScript (Bun)
```
