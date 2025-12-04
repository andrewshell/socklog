import { WebSocketServer } from 'ws'

const PORT = 8080
const INTERVAL_MS = 1000

const sampleMessages = [
  { type: 'user.created', userId: 12345, email: 'user@example.com' },
  { type: 'order.placed', orderId: 'ORD-789', total: 99.99, items: 3 },
  { type: 'payment.processed', transactionId: 'TXN-456', status: 'success' },
  { type: 'notification.sent', channel: 'email', recipient: 'admin@example.com' },
  { type: 'webhook.received', source: 'stripe', event: 'invoice.paid' },
  { type: 'cache.invalidated', keys: ['user:123', 'session:abc'] },
  { type: 'job.completed', jobId: 'JOB-001', duration: 1234 },
  { type: 'error.logged', code: 'E_TIMEOUT', service: 'api-gateway' }
]

function generateMessage() {
  const template = sampleMessages[Math.floor(Math.random() * sampleMessages.length)]
  return {
    ...template,
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID().slice(0, 8)
  }
}

const wss = new WebSocketServer({ port: PORT })

console.log(`WebSocket server running on ws://localhost:${PORT}`)

wss.on('connection', (ws) => {
  console.log('Client connected')

  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      const message = generateMessage()
      ws.send(JSON.stringify(message))
    }
  }, INTERVAL_MS)

  ws.on('close', () => {
    console.log('Client disconnected')
    clearInterval(interval)
  })

  ws.on('error', (err) => {
    console.error('WebSocket error:', err)
    clearInterval(interval)
  })
})
