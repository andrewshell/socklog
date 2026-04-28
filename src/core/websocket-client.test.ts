import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Server, WebSocket as MockWebSocket } from 'mock-socket'
import { WebSocketClient } from './websocket-client'
import type { ConnectionStatus, LogEntry } from './types'

const URL = 'ws://localhost:1234'

const originalWebSocket = globalThis.WebSocket

beforeEach(() => {
  globalThis.WebSocket = MockWebSocket as unknown as typeof globalThis.WebSocket
})

afterEach(() => {
  globalThis.WebSocket = originalWebSocket
  vi.restoreAllMocks()
})

function recordStatuses(client: WebSocketClient): ConnectionStatus[] {
  const statuses: ConnectionStatus[] = []
  client.addEventListener('statuschange', ((e: CustomEvent<ConnectionStatus>) => {
    statuses.push(e.detail)
  }) as EventListener)
  return statuses
}

function waitForStatus(client: WebSocketClient, target: ConnectionStatus): Promise<void> {
  return new Promise((resolve) => {
    if (client.status === target) {
      resolve()
      return
    }
    const handler = (e: Event) => {
      if ((e as CustomEvent<ConnectionStatus>).detail === target) {
        client.removeEventListener('statuschange', handler)
        resolve()
      }
    }
    client.addEventListener('statuschange', handler)
  })
}

describe('WebSocketClient', () => {
  it('emits connecting → connected when connect() succeeds', async () => {
    const server = new Server(URL)
    const client = new WebSocketClient({ url: URL, reconnect: false })
    const statuses = recordStatuses(client)

    client.connect()
    await waitForStatus(client, 'connected')

    expect(statuses).toEqual(['connecting', 'connected'])
    expect(client.status).toBe('connected')

    server.stop()
  })

  it('connect() is a no-op when already OPEN', async () => {
    const server = new Server(URL)
    const client = new WebSocketClient({ url: URL, reconnect: false })
    client.connect()
    await waitForStatus(client, 'connected')

    const statuses = recordStatuses(client)
    client.connect()
    expect(statuses).toEqual([])

    server.stop()
  })

  it('parses inbound JSON into log.detail.data while preserving raw', async () => {
    const server = new Server(URL)
    const client = new WebSocketClient({ url: URL, reconnect: false })

    server.on('connection', (socket) => {
      socket.send(JSON.stringify({ event: 'foo', n: 1 }))
    })

    const log = await new Promise<LogEntry>((resolve) => {
      client.addEventListener('log', ((e: CustomEvent<LogEntry>) => resolve(e.detail)) as EventListener)
      client.connect()
    })

    expect(log.data).toEqual({ event: 'foo', n: 1 })
    expect(log.raw).toBe('{"event":"foo","n":1}')
    expect(log.id).toBeTruthy()
    expect(log.timestamp).toBeInstanceOf(Date)

    server.stop()
  })

  it('treats non-JSON inbound message as a string (raw === data)', async () => {
    const server = new Server(URL)
    const client = new WebSocketClient({ url: URL, reconnect: false })

    server.on('connection', (socket) => {
      socket.send('plain text not json')
    })

    const log = await new Promise<LogEntry>((resolve) => {
      client.addEventListener('log', ((e: CustomEvent<LogEntry>) => resolve(e.detail)) as EventListener)
      client.connect()
    })

    expect(log.data).toBe('plain text not json')
    expect(log.raw).toBe('plain text not json')

    server.stop()
  })

  it('send() forwards data to the server when connected', async () => {
    const server = new Server(URL)
    const client = new WebSocketClient({ url: URL, reconnect: false })

    const received = new Promise<string>((resolve) => {
      server.on('connection', (socket) => {
        socket.on('message', (data) => resolve(String(data)))
      })
    })

    client.connect()
    await waitForStatus(client, 'connected')
    client.send('hello server')

    expect(await received).toBe('hello server')

    server.stop()
  })

  it('send() is a no-op when not connected', () => {
    const client = new WebSocketClient({ url: URL, reconnect: false })
    expect(() => client.send('whatever')).not.toThrow()
  })

  it('disconnect() suppresses further reconnect attempts', async () => {
    const server = new Server(URL)
    const client = new WebSocketClient({
      url: URL,
      reconnect: true,
      reconnectInterval: 5,
      maxReconnectAttempts: 3
    })
    const statuses = recordStatuses(client)

    client.connect()
    await waitForStatus(client, 'connected')

    client.disconnect()
    server.stop()
    await waitForStatus(client, 'disconnected')

    // Give the reconnect timer a generous window — it must NOT fire.
    await new Promise((r) => setTimeout(r, 50))
    expect(statuses.filter((s) => s === 'connecting').length).toBe(1)
  })

  it('schedules a reconnect attempt after an unexpected close', async () => {
    const server = new Server(URL)
    const client = new WebSocketClient({
      url: URL,
      reconnect: true,
      reconnectInterval: 5,
      maxReconnectAttempts: 5
    })
    const statuses = recordStatuses(client)

    client.connect()
    await waitForStatus(client, 'connected')

    // Close just this client's socket from the server side; keep the server up
    // so the reconnect attempt has somewhere to land.
    for (const socket of server.clients()) socket.close()
    await waitForStatus(client, 'disconnected')

    // Reconnect interval is 5ms; wait a bit for the timer to fire.
    await waitForStatus(client, 'connected')
    expect(statuses.filter((s) => s === 'connecting').length).toBeGreaterThanOrEqual(2)

    server.stop()
  })

  it('does not reconnect when reconnect: false', async () => {
    const server = new Server(URL)
    const client = new WebSocketClient({ url: URL, reconnect: false, reconnectInterval: 5 })
    const statuses = recordStatuses(client)

    client.connect()
    await waitForStatus(client, 'connected')

    for (const socket of server.clients()) socket.close()
    await waitForStatus(client, 'disconnected')
    await new Promise((r) => setTimeout(r, 50))

    expect(statuses.filter((s) => s === 'connecting').length).toBe(1)

    server.stop()
  })

  it('warns when connecting ws:// from an https page (mixed content)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const originalLocation = globalThis.location
    Object.defineProperty(globalThis, 'location', {
      value: { ...originalLocation, protocol: 'https:' },
      configurable: true
    })

    try {
      // No server — connection will fail; we only care about the warning.
      const client = new WebSocketClient({ url: 'ws://example.test/socket', reconnect: false })
      client.connect()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('mixed content'))
    } finally {
      Object.defineProperty(globalThis, 'location', {
        value: originalLocation,
        configurable: true
      })
    }
  })
})
