import path from 'path'
import dotenv from 'dotenv'

// Load environment variables manually
dotenv.config({ path: path.join(__dirname, '../.env.local') })
dotenv.config({ path: path.join(__dirname, '../.env') })

import { syncAllAccounts } from '../src/services/monitor/worker'


const INTERVAL_MINUTES = parseInt(process.env.SYNC_INTERVAL_MINUTES || '30', 10)
const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000

let isRunning = false

async function runWorker() {
  if (isRunning) return
  isRunning = true

  console.log(`[${new Date().toISOString()}] Starting scheduled accounts sync...`)
  try {
    const start = Date.now()
    const result = await syncAllAccounts()
    const duration = ((Date.now() - start) / 1000).toFixed(1)
    console.log(
      `[${new Date().toISOString()}] Sync complete! Succeeded: ${result.succeeded}, Failed: ${result.failed} (took ${duration}s)`
    )
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Worker error during sync:`, error)
  } finally {
    isRunning = false
  }
}

function start() {
  console.log(`========================================`)
  console.log(`Dashboard-X Monitor Worker Started`)
  console.log(`Interval: ${INTERVAL_MINUTES} minutes`)
  console.log(`========================================`)

  // Run immediately on startup
  runWorker()

  // Set interval
  const timer = setInterval(runWorker, INTERVAL_MS)

  // Handle graceful shutdown
  const shutdown = () => {
    console.log('Shutting down worker...')
    clearInterval(timer)
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

start()
