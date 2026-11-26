import { toNodeHandler } from 'better-auth/node'
import { createApp } from './app.ts'
import { auth } from './auth/auth.ts'
import { checkDatabase, prisma } from './db/prisma.ts'

const port = Number(process.env.PORT ?? 3000)

const server = createApp({
  checkDatabase,
  authHandler: toNodeHandler(auth),
  getSession: (headers) => auth.api.getSession({ headers }),
}).listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})

// Close the HTTP server and database connections cleanly (e.g. when Railway stops the container).
async function shutdown() {
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
