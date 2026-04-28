import { describe, expect, it } from 'vitest'
import './socklog-viewer'
import { SocklogViewer } from './socklog-viewer'
import { LogStore } from '../core/log-store'
import { mountElement } from '../test/helpers'

describe('<socklog-viewer>', () => {
  it('initializes its own LogStore on connect', async () => {
    const { el, cleanup } = await mountElement<SocklogViewer>('socklog-viewer')
    expect(el.getStore()).toBeInstanceOf(LogStore)
    expect(el.getClient()).toBeNull() // no url provided
    cleanup()
  })

  it('clear() empties the internal store', async () => {
    const { el, cleanup } = await mountElement<SocklogViewer>('socklog-viewer')
    const store = el.getStore()!
    store.add({ id: '1', timestamp: new Date(), data: 'a', raw: 'a' })
    expect(store.count).toBe(1)

    el.clear()
    expect(store.count).toBe(0)
    cleanup()
  })

  it('renders empty state when there are no logs', async () => {
    const { el, cleanup } = await mountElement<SocklogViewer>('socklog-viewer')
    const empty = el.shadowRoot?.querySelector('.empty-state')
    expect(empty).toBeTruthy()
    cleanup()
  })

  it('renders an entry after a log is added to the store', async () => {
    const { el, cleanup } = await mountElement<SocklogViewer>('socklog-viewer')
    const store = el.getStore()!
    store.add({ id: '1', timestamp: new Date(), data: { hello: 'world' }, raw: '{"hello":"world"}' })
    await el.updateComplete

    const entries = el.shadowRoot?.querySelectorAll('.log-entry')
    expect(entries?.length).toBe(1)
    cleanup()
  })
})
