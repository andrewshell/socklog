import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { ConnectionStatus } from '../core/types'
import type { WebSocketClient } from '../core/websocket-client'

@customElement('socklog-sender')
export class SocklogSender extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .sender-inner {
      display: flex;
      align-items: stretch;
      gap: 12px;
      padding: 8px 12px;
      background: var(--socklog-controls-bg, inherit);
      border-bottom: 1px solid var(--socklog-border-color, #e0e0e0);
      font-family: var(
        --socklog-ui-font-family,
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        sans-serif
      );
      font-size: 13px;
      color: var(--socklog-color, inherit);
      box-sizing: border-box;
    }

    .input-container {
      flex: 1;
      min-width: 0;
    }

    textarea {
      width: 100%;
      min-height: 60px;
      padding: 6px 10px;
      border: 1px solid var(--socklog-input-border, #ccc);
      border-radius: 4px;
      background: var(--socklog-input-bg, #fff);
      color: var(--socklog-input-color, inherit);
      font-family: var(--socklog-font-family, 'Monaco', 'Menlo', 'Ubuntu Mono', monospace);
      font-size: 13px;
      box-sizing: border-box;
      resize: vertical;
    }

    textarea:focus {
      outline: none;
      border-color: var(--socklog-focus-color, #007bff);
    }

    textarea::placeholder {
      color: var(--socklog-muted-color, #999);
    }

    .actions {
      display: flex;
      align-items: flex-end;
      flex-shrink: 0;
    }

    .send-btn {
      padding: 6px 16px;
      border: 1px solid var(--socklog-focus-color, #007bff);
      border-radius: 4px;
      background: var(--socklog-focus-color, #007bff);
      color: #fff;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s ease;
    }

    .send-btn:hover:not(:disabled) {
      filter: brightness(1.1);
    }

    .send-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `

  @property({ attribute: false })
  client: WebSocketClient | null = null

  @state()
  private value = ''

  @state()
  private status: ConnectionStatus = 'disconnected'

  private statusListener: ((e: Event) => void) | null = null
  private listeningClient: WebSocketClient | null = null

  connectedCallback() {
    super.connectedCallback()
    this.setupClientListeners()
  }

  disconnectedCallback() {
    super.disconnectedCallback()
    this.teardownClientListeners()
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('client')) {
      this.teardownClientListeners()
      this.setupClientListeners()
    }
  }

  private setupClientListeners() {
    if (!this.client) return

    this.status = this.client.status
    this.statusListener = ((e: CustomEvent<ConnectionStatus>) => {
      this.status = e.detail
    }) as EventListener
    this.client.addEventListener('statuschange', this.statusListener)
    this.listeningClient = this.client
  }

  private teardownClientListeners() {
    if (this.listeningClient && this.statusListener) {
      this.listeningClient.removeEventListener('statuschange', this.statusListener)
    }
    this.listeningClient = null
    this.statusListener = null
  }

  private handleInput(e: Event) {
    const target = e.target as HTMLTextAreaElement
    this.value = target.value
  }

  private handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      this.send()
    }
  }

  private send() {
    if (!this.canSend()) return
    this.client!.send(this.value)
    this.value = ''
  }

  private canSend(): boolean {
    return !!this.client && this.status === 'connected' && this.value.length > 0
  }

  render() {
    const disabled = !this.canSend()
    return html`
      <div class="sender-inner">
        <div class="input-container">
          <textarea
            placeholder="Type a message and press Send (or Cmd/Ctrl+Enter)..."
            .value=${this.value}
            @input=${this.handleInput}
            @keydown=${this.handleKeyDown}
          ></textarea>
        </div>

        <div class="actions">
          <button class="send-btn" ?disabled=${disabled} @click=${this.send}>Send</button>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'socklog-sender': SocklogSender
  }
}
