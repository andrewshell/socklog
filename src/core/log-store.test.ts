import { describe, it, expect, vi } from 'vitest'
import { LogStore } from './log-store'
import type { LogEntry } from './types'

function entry(raw: string, id = raw): LogEntry {
  return { id, timestamp: new Date(), data: raw, raw }
}

describe('LogStore', () => {
  it('add() prepends entries (newest first)', () => {
    const store = new LogStore()
    store.add(entry('a'))
    store.add(entry('b'))
    store.add(entry('c'))
    expect(store.getAll().map((e) => e.raw)).toEqual(['c', 'b', 'a'])
    expect(store.count).toBe(3)
  })

  it('getAll() returns a copy, not the internal array', () => {
    const store = new LogStore()
    store.add(entry('a'))
    const snapshot = store.getAll()
    snapshot.push(entry('mutated'))
    expect(store.count).toBe(1)
  })

  it('paused = true blocks add()', () => {
    const store = new LogStore()
    store.paused = true
    store.add(entry('a'))
    expect(store.count).toBe(0)

    store.paused = false
    store.add(entry('b'))
    expect(store.count).toBe(1)
  })

  it('drops the oldest when over maxLogs (FIFO cap)', () => {
    const store = new LogStore(3)
    store.add(entry('1'))
    store.add(entry('2'))
    store.add(entry('3'))
    store.add(entry('4'))
    expect(store.getAll().map((e) => e.raw)).toEqual(['4', '3', '2'])
    expect(store.count).toBe(3)
  })

  it('clear() empties and emits logscleared', () => {
    const store = new LogStore()
    const listener = vi.fn()
    store.addEventListener('logscleared', listener)
    store.add(entry('a'))
    store.clear()
    expect(store.count).toBe(0)
    expect(listener).toHaveBeenCalledOnce()
  })

  it('getFiltered() does case-insensitive substring matching on raw', () => {
    const store = new LogStore()
    store.add(entry('Hello World'))
    store.add(entry('goodbye'))
    store.add(entry('HELLO again'))

    store.filter = { search: 'hello' }
    expect(store.getFiltered().map((e) => e.raw)).toEqual(['HELLO again', 'Hello World'])
  })

  it('getFiltered() returns all entries when no filter', () => {
    const store = new LogStore()
    store.add(entry('a'))
    store.add(entry('b'))
    expect(store.getFiltered()).toHaveLength(2)
  })

  it('emits logadded with the entry as detail', () => {
    const store = new LogStore()
    const listener = vi.fn()
    store.addEventListener('logadded', listener as EventListener)
    const e = entry('a')
    store.add(e)
    expect(listener).toHaveBeenCalledOnce()
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe(e)
  })

  it('emits filterchange when filter is set', () => {
    const store = new LogStore()
    const listener = vi.fn()
    store.addEventListener('filterchange', listener as EventListener)
    store.filter = { search: 'foo' }
    expect(listener).toHaveBeenCalledOnce()
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ search: 'foo' })
  })

  it('emits pausechange when paused is set', () => {
    const store = new LogStore()
    const listener = vi.fn()
    store.addEventListener('pausechange', listener as EventListener)
    store.paused = true
    store.paused = false
    expect(listener).toHaveBeenCalledTimes(2)
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toBe(true)
    expect((listener.mock.calls[1][0] as CustomEvent).detail).toBe(false)
  })
})
