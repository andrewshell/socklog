import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { LogEntry, ConnectionStatus } from '../core/types'
import { WebSocketClient } from '../core/websocket-client'
import { LogStore } from '../core/log-store'

@customElement('socklog-viewer')
export class SocklogViewer extends LitElement {
  static styles = css`
    :host {
      display: block;
      font-family: var(--socklog-font-family, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
      font-size: var(--socklog-font-size, 13px);
      background: var(--socklog-bg, inherit);
      color: var(--socklog-color, inherit);
      border-radius: var(--socklog-border-radius, 0);
    }

    .log-container {
      padding: var(--socklog-padding, 8px);
    }

    .log-entry {
      padding: 4px 0;
      border-bottom: 1px solid var(--socklog-border-color, #e0e0e0);
    }

    .timestamp {
      color: var(--socklog-timestamp-color, #666);
      font-size: 11px;
      margin-bottom: 2px;
    }

    .json {
      white-space: pre-wrap;
      word-break: break-word;
    }

    .empty-state {
      padding: var(--socklog-padding, 8px);
      color: var(--socklog-muted-color, #999);
    }
  `

  @property({ type: String })
  url = ''

  @property({ type: Number })
  maxLogs = 1000

  @state()
  private logs: LogEntry[] = []

  @state()
  private status: ConnectionStatus = 'disconnected'

  private client: WebSocketClient | null = null
  private store: LogStore | null = null

  connectedCallback() {
    super.connectedCallback()
    this.initializeStore()
    if (this.url) {
      this.connect()
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.client?.disconnect()
  }

  private initializeStore() {
    this.store = new LogStore(this.maxLogs)

    this.store.addEventListener('logadded', () => {
      this.logs = this.store?.getFiltered() ?? []
    })

    this.store.addEventListener('filterchange', () => {
      this.logs = this.store?.getFiltered() ?? []
    })

    this.store.addEventListener('logscleared', () => {
      this.logs = []
    })
  }

  connect() {
    if (!this.url) return

    this.client = new WebSocketClient({ url: this.url })

    this.client.addEventListener('statuschange', ((e: CustomEvent<ConnectionStatus>) => {
      this.status = e.detail
    }) as EventListener)

    this.client.addEventListener('log', ((e: CustomEvent<LogEntry>) => {
      this.store?.add(e.detail)
    }) as EventListener)

    this.client.connect()
  }

  clear() {
    this.store?.clear()
  }

  getStore(): LogStore | null {
    return this.store
  }

  private formatTimestamp(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  private formatJson(data: unknown): string {
    if (typeof data === 'string') {
      return data
    }
    return JSON.stringify(data, null, 2)
  }

  render() {
    if (this.logs.length === 0) {
      return html`
        <div class="log-container">
          <div class="empty-state">
            ${this.status === 'connecting'
              ? 'Connecting...'
              : this.status === 'connected'
                ? 'Waiting for messages...'
                : 'No messages to display'}
          </div>
        </div>
      `
    }

    return html`
      <div class="log-container">
        ${this.logs.map(
          (entry) => html`
            <div class="log-entry">
              <div class="timestamp">${this.formatTimestamp(entry.timestamp)}</div>
              <div class="json">${this.formatJson(entry.data)}</div>
            </div>
          `
        )}
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'socklog-viewer': SocklogViewer
  }
}
