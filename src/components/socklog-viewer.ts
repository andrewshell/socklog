import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { unsafeHTML } from 'lit/directives/unsafe-html.js'
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

    .log-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 2px;
    }

    .log-header {
      cursor: pointer;
    }

    .log-header:hover .expand-toggle {
      color: var(--socklog-toggle-hover-color, #333);
    }

    .expand-toggle {
      user-select: none;
      color: var(--socklog-toggle-color, #666);
      font-size: 10px;
    }

    .timestamp {
      color: var(--socklog-timestamp-color, #666);
      font-size: 11px;
    }

    .json {
      white-space: pre-wrap;
      word-break: break-word;
    }

    .empty-state {
      padding: var(--socklog-padding, 8px);
      color: var(--socklog-muted-color, #999);
    }

    .json-key {
      color: var(--socklog-key-color, #5c7cba);
    }

    .search-highlight {
      background-color: var(--socklog-highlight-bg, #fff3cd);
    }
  `

  @property({ type: String })
  url = ''

  @property({ type: Number })
  maxLogs = 1000

  @property({ type: Number })
  indent = 4

  @state()
  private logs: LogEntry[] = []

  @state()
  private status: ConnectionStatus = 'disconnected'

  @state()
  private searchTerm = ''

  @state()
  private expandedIds = new Set<string>()

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
      this.searchTerm = this.store?.filter.search ?? ''
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

  private toggleExpanded(id: string) {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id)
    } else {
      this.expandedIds.add(id)
    }
    this.expandedIds = new Set(this.expandedIds)
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

  private formatJson(data: unknown, expanded = false) {
    let jsonStr: string
    if (typeof data === 'string') {
      jsonStr = data
    } else {
      jsonStr = expanded ? JSON.stringify(data, null, this.indent) : JSON.stringify(data)
    }

    // Escape HTML entities first
    const escaped = jsonStr
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

    // Color JSON keys: match "key": pattern
    const withKeys = escaped.replace(
      /(&quot;|")([^"\\]|\\.)*?\1(?=\s*:)/g,
      '<span class="json-key">$&</span>'
    )

    // Highlight search terms if present
    if (!this.searchTerm) {
      return unsafeHTML(withKeys)
    }

    // Escape regex special characters in search term
    const escapedSearch = this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const searchRegex = new RegExp(`(${escapedSearch})`, 'gi')

    // Apply search highlighting, being careful not to match inside HTML tags
    const withHighlight = withKeys.replace(
      /(<[^>]*>)|([^<]+)/g,
      (match, tag, text) => {
        if (tag) return tag // Don't modify HTML tags
        return text.replace(searchRegex, '<span class="search-highlight">$1</span>')
      }
    )

    return unsafeHTML(withHighlight)
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
              <div class="log-header"
                   @click=${() => this.toggleExpanded(entry.id)}>
                <span class="expand-toggle">
                  ${this.expandedIds.has(entry.id) ? '⏷' : '⏵'}
                </span>
                <span class="timestamp">${this.formatTimestamp(entry.timestamp)}</span>
              </div>
              <div class="json">${this.formatJson(entry.data, this.expandedIds.has(entry.id))}</div>
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
