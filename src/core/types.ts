export interface LogEntry {
  id: string
  timestamp: Date
  data: unknown
  raw: string
}

export interface WebSocketConfig {
  url: string
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export interface LogFilter {
  search?: string
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
