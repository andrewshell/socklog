import type { WebSocketConfig, ConnectionStatus, LogEntry } from './types'

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
        id: crypto.randomUUID(),
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
