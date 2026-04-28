// Suppress Lit's dev-mode console warning during tests.
// Lit checks `globalThis.litIssuedWarnings` and skips warnings whose key is
// already present, so seeding it before Lit loads silences the message.
// (We're intentionally running the dev build here — it provides the runtime
// checks we want during tests.)
const issued = ((globalThis as unknown as { litIssuedWarnings?: Set<string> })
  .litIssuedWarnings ??= new Set<string>())
issued.add('dev-mode')
