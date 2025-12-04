import { LitElement, html, css } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import type { LogFilter } from '../core/types'
import type { LogStore } from '../core/log-store'

@customElement('socklog-controls')
export class SocklogControls extends LitElement {
  static styles = css`
    :host {
      display: block;
      width: 100%;
      flex-shrink: 0;
      box-sizing: border-box;
    }

    .controls-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: var(--socklog-controls-bg, inherit);
      border-bottom: 1px solid var(--socklog-border-color, #e0e0e0);
      font-family: var(--socklog-ui-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
      font-size: 13px;
      color: var(--socklog-color, inherit);
      box-sizing: border-box;
    }

    .search-container {
      flex: 1;
      min-width: 0;
    }

    input[type='text'] {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid var(--socklog-input-border, #ccc);
      border-radius: 4px;
      background: var(--socklog-input-bg, #fff);
      color: var(--socklog-input-color, inherit);
      font-size: 13px;
      box-sizing: border-box;
    }

    input[type='text']:focus {
      outline: none;
      border-color: var(--socklog-focus-color, #007bff);
    }

    input[type='text']::placeholder {
      color: var(--socklog-muted-color, #999);
    }

    .actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
      margin-left: auto;
    }

    .action-btn {
      padding: 6px 12px;
      border: 1px solid var(--socklog-input-border, #ccc);
      border-radius: 4px;
      background: var(--socklog-input-bg, #fff);
      color: var(--socklog-color, inherit);
      cursor: pointer;
      font-size: 12px;
      transition: all 0.15s ease;
    }

    .action-btn:hover {
      background: var(--socklog-hover-bg, #f5f5f5);
    }

    .action-btn.pause.active {
      background: var(--socklog-pause-bg, #fff3cd);
      border-color: var(--socklog-pause-bg, #fff3cd);
      color: var(--socklog-pause-color, #856404);
    }
  `

  @property({ attribute: false })
  store: LogStore | null = null

  @state()
  private searchValue = ''

  @state()
  private paused = false

  connectedCallback() {
    super.connectedCallback()
    this.setupStoreListeners()
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('store')) {
      this.setupStoreListeners()
    }
  }

  private setupStoreListeners() {
    if (!this.store) return

    this.store.addEventListener('pausechange', ((e: CustomEvent<boolean>) => {
      this.paused = e.detail
    }) as EventListener)
  }

  private handleSearch(e: Event) {
    const target = e.target as HTMLInputElement
    this.searchValue = target.value
    this.updateFilter()
  }

  private updateFilter() {
    if (!this.store) return

    const filter: LogFilter = {}

    if (this.searchValue) {
      filter.search = this.searchValue
    }

    this.store.filter = filter
  }

  private togglePause() {
    if (!this.store) return
    this.store.paused = !this.store.paused
  }

  private clear() {
    this.store?.clear()
  }

  render() {
    return html`
      <div class="controls-inner">
        <div class="search-container">
          <input
            type="text"
            placeholder="Search..."
            .value=${this.searchValue}
            @input=${this.handleSearch}
          />
        </div>

        <div class="actions">
          <button class="action-btn pause ${this.paused ? 'active' : ''}" @click=${this.togglePause}>
            ${this.paused ? 'Resume' : 'Pause'}
          </button>
          <button class="action-btn" @click=${this.clear}>Clear</button>
        </div>
      </div>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'socklog-controls': SocklogControls
  }
}
