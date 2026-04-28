import { describe, expect, it } from 'vitest'
import './socklog-controls'
import { SocklogControls } from './socklog-controls'
import { LogStore } from '../core/log-store'
import { mountElement } from '../test/helpers'

async function mountControls(store: LogStore) {
  return mountElement<SocklogControls>('socklog-controls', { store })
}

function shadow(el: SocklogControls) {
  if (!el.shadowRoot) throw new Error('shadowRoot missing')
  return el.shadowRoot
}

describe('<socklog-controls>', () => {
  it('search input updates store.filter', async () => {
    const store = new LogStore()
    const { el, cleanup } = await mountControls(store)

    const input = shadow(el).querySelector('input[type="text"]') as HTMLInputElement
    input.value = 'oops'
    input.dispatchEvent(new Event('input'))

    expect(store.filter).toEqual({ search: 'oops' })
    cleanup()
  })

  it('clearing the search field resets filter to {}', async () => {
    const store = new LogStore()
    store.filter = { search: 'foo' }
    const { el, cleanup } = await mountControls(store)

    const input = shadow(el).querySelector('input[type="text"]') as HTMLInputElement
    input.value = ''
    input.dispatchEvent(new Event('input'))

    expect(store.filter).toEqual({})
    cleanup()
  })

  it('pause button toggles store.paused', async () => {
    const store = new LogStore()
    const { el, cleanup } = await mountControls(store)

    const pauseBtn = shadow(el).querySelector('button.pause') as HTMLButtonElement
    pauseBtn.click()
    expect(store.paused).toBe(true)

    await el.updateComplete
    pauseBtn.click()
    expect(store.paused).toBe(false)

    cleanup()
  })

  it('clear button empties the store', async () => {
    const store = new LogStore()
    store.add({ id: '1', timestamp: new Date(), data: 'x', raw: 'x' })
    expect(store.count).toBe(1)

    const { el, cleanup } = await mountControls(store)
    const clearBtn = Array.from(shadow(el).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Clear'
    ) as HTMLButtonElement
    clearBtn.click()
    expect(store.count).toBe(0)

    cleanup()
  })

  it('reflects external pausechange in the button label', async () => {
    const store = new LogStore()
    const { el, cleanup } = await mountControls(store)

    store.paused = true
    await el.updateComplete

    const pauseBtn = shadow(el).querySelector('button.pause') as HTMLButtonElement
    expect(pauseBtn.textContent?.trim()).toBe('Resume')
    expect(pauseBtn.classList.contains('active')).toBe(true)

    cleanup()
  })
})
