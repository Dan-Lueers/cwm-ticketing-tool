import express, { type ErrorRequestHandler } from 'express'

export type AppDependencies = {
  /** Resolves if the database is reachable, rejects otherwise. */
  checkDatabase: () => Promise<void>
}

export function createApp({ checkDatabase }: AppDependencies) {
  const app = express()

  app.use(express.json())

  app.get('/api/health', async (_req, res) => {
    try {
      await checkDatabase()
      res.json({ status: 'ok', database: 'ok' })
    } catch (err) {
      console.error('Database health check failed:', err)
      res.status(503).json({ status: 'error', database: 'unreachable' })
    }
  })

  // Unknown API routes return JSON instead of Express's default HTML page.
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Express 5 forwards errors from async handlers here automatically.
  const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    console.error(err)
    res.status(500).json({ error: 'Internal server error' })
  }
  app.use(errorHandler)

  return app
}
