import type { LogEntry, LogFilter } from './types'

export class LogStore extends EventTarget {
  private logs: LogEntry[] = []
  private maxLogs: number
  private _filter: LogFilter = {}
  private _paused = false

  constructor(maxLogs = 1000) {
    super()
    this.maxLogs = maxLogs
  }

  get filter(): LogFilter {
    return this._filter
  }

  set filter(value: LogFilter) {
    this._filter = value
    this.dispatchEvent(new CustomEvent('filterchange', { detail: this._filter }))
  }

  get paused(): boolean {
    return this._paused
  }

  set paused(value: boolean) {
    this._paused = value
    this.dispatchEvent(new CustomEvent('pausechange', { detail: this._paused }))
  }

  add(entry: LogEntry): void {
    if (this._paused) return

    // Add to beginning (newest first)
    this.logs.unshift(entry)

    // Remove oldest if over limit
    if (this.logs.length > this.maxLogs) {
      this.logs.pop()
    }

    this.dispatchEvent(new CustomEvent('logadded', { detail: entry }))
  }

  clear(): void {
    this.logs = []
    this.dispatchEvent(new CustomEvent('logscleared'))
  }

  getAll(): LogEntry[] {
    return [...this.logs]
  }

  getFiltered(): LogEntry[] {
    return this.logs.filter((entry) => this.matchesFilter(entry))
  }

  private matchesFilter(entry: LogEntry): boolean {
    const { search } = this._filter

    if (search) {
      const searchLower = search.toLowerCase()
      return entry.raw.toLowerCase().includes(searchLower)
    }

    return true
  }

  get count(): number {
    return this.logs.length
  }
}
