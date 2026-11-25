import express, { type ErrorRequestHandler } from 'express'

export function createApp() {
  const app = express()

  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
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
