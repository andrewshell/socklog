import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Server, WebSocket as MockWebSocket } from 'mock-socket'
import './socklog-sender'
import { SocklogSender } from './socklog-sender'
import { WebSocketClient } from '../core/websocket-client'
import { mountElement } from '../test/helpers'

const URL = 'ws://localhost:1235'

const originalWebSocket = globalThis.WebSocket

beforeEach(() => {
  globalThis.WebSocket = MockWebSocket as unknown as typeof globalThis.WebSocket
})

afterEach(() => {
  globalThis.WebSocket = originalWebSocket
  vi.restoreAllMocks()
})

function shadow(el: SocklogSender) {
  if (!el.shadowRoot) throw new Error('shadowRoot missing')
  return el.shadowRoot
}

async function waitForConnected(client: WebSocketClient) {
  return new Promise<void>((resolve) => {
    if (client.status === 'connected') return resolve()
    const handler = (e: Event) => {
      if ((e as CustomEvent).detail === 'connected') {
        client.removeEventListener('statuschange', handler)
        resolve()
      }
    }
    client.addEventListener('statuschange', handler)
  })
}

describe('<socklog-sender>', () => {
  it('Send button is disabled when client is not connected', async () => {
    const client = new WebSocketClient({ url: URL, reconnect: false })
    const { el, cleanup } = await mountElement<SocklogSender>('socklog-sender', { client })

    const sendBtn = shadow(el).querySelector('button.send-btn') as HTMLButtonElement
    expect(sendBtn.disabled).toBe(true)

    cleanup()
  })

  it('Send button stays disabled while connected but textarea is empty', async () => {
    const server = new Server(URL)
    const client = new WebSocketClient({ url: URL, reconnect: false })
    client.connect()
    await waitForConnected(client)

    const { el, cleanup } = await mountElement<SocklogSender>('socklog-sender', { client })
    await el.updateComplete

    const sendBtn = shadow(el).querySelector('button.send-btn') as HTMLButtonElement
    expect(sendBtn.disabled).toBe(true)

    cleanup()
    server.stop()
  })

  it('clicking Send sends the textarea value and clears it', async () => {
    const server = new Server(URL)
    const received = new Promise<string>((resolve) => {
      server.on('connection', (socket) => {
        socket.on('message', (data) => resolve(String(data)))
      })
    })

    const client = new WebSocketClient({ url: URL, reconnect: false })
    client.connect()
    await waitForConnected(client)

    const { el, cleanup } = await mountElement<SocklogSender>('socklog-sender', { client })
    await el.updateComplete

    const textarea = shadow(el).querySelector('textarea') as HTMLTextAreaElement
    textarea.value = 'hello'
    textarea.dispatchEvent(new Event('input'))
    await el.updateComplete

    const sendBtn = shadow(el).querySelector('button.send-btn') as HTMLButtonElement
    expect(sendBtn.disabled).toBe(false)
    sendBtn.click()

    expect(await received).toBe('hello')

    await el.updateComplete
    expect(textarea.value).toBe('')

    cleanup()
    server.stop()
  })

  it('Cmd/Ctrl+Enter sends the message', async () => {
    const server = new Server(URL)
    const received = new Promise<string>((resolve) => {
      server.on('connection', (socket) => {
        socket.on('message', (data) => resolve(String(data)))
      })
    })

    const client = new WebSocketClient({ url: URL, reconnect: false })
    client.connect()
    await waitForConnected(client)

    const { el, cleanup } = await mountElement<SocklogSender>('socklog-sender', { client })
    await el.updateComplete

    const textarea = shadow(el).querySelector('textarea') as HTMLTextAreaElement
    textarea.value = 'shortcut'
    textarea.dispatchEvent(new Event('input'))
    await el.updateComplete

    textarea.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true })
    )

    expect(await received).toBe('shortcut')

    cleanup()
    server.stop()
  })
})
