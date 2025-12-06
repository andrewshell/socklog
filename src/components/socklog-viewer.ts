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
    }

    .empty-state {
      padding: var(--socklog-padding, 8px);
      color: var(--socklog-muted-color, #999);
    }

    .json-key,
    .json-string,
    .json-value,
    .json-punct {
      display: inline;
      white-space: nowrap;
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

  private tokenizeJson(json: string): Array<{ type: string; value: string }> {
    const tokens: Array<{ type: string; value: string }> = []
    let i = 0

    while (i < json.length) {
      const char = json[i]

      // Whitespace
      if (/\s/.test(char)) {
        let value = ''
        while (i < json.length && /\s/.test(json[i])) {
          value += json[i]
          i++
        }
        tokens.push({ type: 'whitespace', value })
        continue
      }

      // Structural characters
      if (char === '{' || char === '}' || char === '[' || char === ']' || char === ':' || char === ',') {
        tokens.push({ type: 'punctuation', value: char })
        i++
        continue
      }

      // String
      if (char === '"') {
        let value = '"'
        i++
        while (i < json.length) {
          if (json[i] === '\\' && i + 1 < json.length) {
            value += json[i] + json[i + 1]
            i += 2
          } else if (json[i] === '"') {
            value += '"'
            i++
            break
          } else {
            value += json[i]
            i++
          }
        }
        tokens.push({ type: 'string', value })
        continue
      }

      // Number, boolean, null
      let value = ''
      while (i < json.length && !/[\s{}\[\]:,"]/.test(json[i])) {
        value += json[i]
        i++
      }
      if (value) {
        tokens.push({ type: 'value', value })
      }
    }

    return tokens
  }

  private formatJson(data: unknown, expanded = false) {
    let jsonStr: string
    if (typeof data === 'string') {
      jsonStr = data
    } else {
      jsonStr = expanded ? JSON.stringify(data, null, this.indent) : JSON.stringify(data)
    }

    const tokens = this.tokenizeJson(jsonStr)
    const parts: string[] = []

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]
      const nextToken = tokens[i + 1]

      // Escape HTML entities
      const escaped = token.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')

      // Check if this string is a key (followed by colon)
      const isKey = token.type === 'string' && nextToken?.value === ':'

      if (token.type === 'whitespace') {
        parts.push(escaped)
      } else if (token.type === 'punctuation') {
        parts.push(`<span class="json-punct">${escaped}</span>`)
      } else if (isKey) {
        parts.push(`<span class="json-key">${escaped}</span>`)
      } else if (token.type === 'string') {
        parts.push(`<span class="json-string">${escaped}</span>`)
      } else {
        parts.push(`<span class="json-value">${escaped}</span>`)
      }
    }

    // Join with word break opportunities between tokens
    let result = parts.join('<wbr>')

    // Highlight search terms if present
    if (this.searchTerm) {
      const escapedSearch = this.searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const searchRegex = new RegExp(`(${escapedSearch})`, 'gi')

      result = result.replace(
        /(<[^>]*>)|([^<]+)/g,
        (match, tag, text) => {
          if (tag) return tag
          return text.replace(searchRegex, '<span class="search-highlight">$1</span>')
        }
      )
    }

    return unsafeHTML(result)
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
