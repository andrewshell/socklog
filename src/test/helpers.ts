import type { LitElement } from 'lit'

export async function mountElement<T extends LitElement>(
  tag: string,
  props: Partial<T> = {}
): Promise<{ el: T; cleanup: () => void }> {
  const el = document.createElement(tag) as T
  Object.assign(el, props)
  document.body.appendChild(el)
  await el.updateComplete
  return {
    el,
    cleanup: () => el.remove()
  }
}

export function nextEvent<T = unknown>(
  target: EventTarget,
  name: string,
  timeoutMs = 1000
): Promise<CustomEvent<T>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      target.removeEventListener(name, handler as EventListener)
      reject(new Error(`Timed out waiting for "${name}" event`))
    }, timeoutMs)
    const handler = (e: Event) => {
      clearTimeout(timer)
      target.removeEventListener(name, handler as EventListener)
      resolve(e as CustomEvent<T>)
    }
    target.addEventListener(name, handler as EventListener)
  })
}
