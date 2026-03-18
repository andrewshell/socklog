import type { WebSocketConfig, ConnectionStatus, LogEntry } from './types'

function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = (Math.random() * 256) | 0
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export class WebSocketClient extends EventTarget {
  private ws: WebSocket | null = null
  private config: WebSocketConfig
  private reconnectAttempts = 0
  private _status: ConnectionStatus = 'disconnected'

  constructor(config: WebSocketConfig) {
    super()
    this.config = {
      reconnect: true,
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      ...config
    }
  }

  get status(): ConnectionStatus {
    return this._status
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    if (
      typeof location !== 'undefined' &&
      location.protocol === 'https:' &&
      this.config.url.startsWith('ws://')
    ) {
      console.warn(
        '[socklog] Connecting with ws:// from an HTTPS page will be blocked as mixed content. Use wss:// instead.'
      )
    }

    this._status = 'connecting'
    this.dispatchEvent(new CustomEvent('statuschange', { detail: this._status }))

    try {
      this.ws = new WebSocket(this.config.url)
      this.setupEventHandlers()
    } catch {
      this._status = 'error'
      this.dispatchEvent(new CustomEvent('statuschange', { detail: this._status }))
    }
  }

  disconnect(): void {
    this.reconnectAttempts = this.config.maxReconnectAttempts ?? 10
    this.ws?.close()
  }

  private setupEventHandlers(): void {
    if (!this.ws) return

    this.ws.onopen = () => {
      this._status = 'connected'
      this.reconnectAttempts = 0
      this.dispatchEvent(new CustomEvent('statuschange', { detail: this._status }))
    }

    this.ws.onclose = () => {
      this._status = 'disconnected'
      this.dispatchEvent(new CustomEvent('statuschange', { detail: this._status }))
      this.attemptReconnect()
    }

    this.ws.onerror = () => {
      this._status = 'error'
      this.dispatchEvent(new CustomEvent('statuschange', { detail: this._status }))
    }

    this.ws.onmessage = (event) => {
      const raw = event.data as string
      let data: unknown
      try {
        data = JSON.parse(raw)
      } catch {
        data = raw
      }
      const logEntry: LogEntry = {
        id: generateId(),
        timestamp: new Date(),
        data,
        raw
      }
      this.dispatchEvent(new CustomEvent('log', { detail: logEntry }))
    }
  }

  private attemptReconnect(): void {
    if (!this.config.reconnect) return
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts ?? 10)) return

    this.reconnectAttempts++
    setTimeout(() => this.connect(), this.config.reconnectInterval)
  }
}
