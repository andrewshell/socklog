# Socklog

WebSocket-based logging web components built with [Lit](https://lit.dev/).

## Installation

### npm

```bash
npm install @andrewshell/socklog
```

### CDN

**esm.sh:**

```html
<script type="module">
  import 'https://esm.sh/@andrewshell/socklog'
</script>

<socklog-viewer url="ws://localhost:8080/logs"></socklog-viewer>
```

**unpkg:**

```html
<script src="https://unpkg.com/@andrewshell/socklog"></script>

<socklog-viewer url="ws://localhost:8080/logs"></socklog-viewer>
```

**jsdelivr:**

```html
<script src="https://cdn.jsdelivr.net/npm/@andrewshell/socklog"></script>

<socklog-viewer url="ws://localhost:8080/logs"></socklog-viewer>
```

## Usage

### Basic Example

```html
<socklog-viewer url="ws://localhost:8080/logs"></socklog-viewer>
```

### With Controls

```html
<script type="module">
  import 'https://esm.sh/@andrewshell/socklog'

  const viewer = document.getElementById('viewer')
  const controls = document.getElementById('controls')

  // Connect controls to viewer's log store
  controls.store = viewer.getStore()
</script>

<div style="display: flex; flex-direction: column; height: 400px;">
  <socklog-controls id="controls"></socklog-controls>
  <socklog-viewer id="viewer" url="ws://localhost:8080/logs"></socklog-viewer>
</div>
```

### With Sender (Two-Way Messaging)

The `<socklog-sender>` component shares the viewer's WebSocket connection so messages
can be sent without opening a second socket.

```html
<script type="module">
  import 'https://esm.sh/@andrewshell/socklog'

  const viewer = document.getElementById('viewer')
  const controls = document.getElementById('controls')
  const sender = document.getElementById('sender')

  controls.store = viewer.getStore()
  // Reuse the viewer's WebSocket connection
  sender.client = viewer.getClient()
</script>

<div style="display: flex; flex-direction: column; height: 400px;">
  <socklog-sender id="sender"></socklog-sender>
  <socklog-controls id="controls"></socklog-controls>
  <socklog-viewer id="viewer" url="ws://localhost:8080/logs"></socklog-viewer>
</div>
```

## Components

### `<socklog-viewer>`

Main log display component with WebSocket connection and virtualized scrolling.

**Attributes:**

| Attribute  | Type     | Default | Description                      |
| ---------- | -------- | ------- | -------------------------------- |
| `url`      | `string` | `''`    | WebSocket URL to connect to      |
| `max-logs` | `number` | `1000`  | Maximum number of logs to retain |

**Methods:**

| Method        | Returns           | Description                         |
| ------------- | ----------------- | ----------------------------------- |
| `connect()`   | `void`            | Connect to the WebSocket            |
| `clear()`     | `void`            | Clear all logs                      |
| `getStore()`  | `LogStore`        | Get the underlying log store        |
| `getClient()` | `WebSocketClient` | Get the underlying WebSocket client |

### `<socklog-controls>`

Filter, search, and pause controls for the log viewer.

**Properties:**

| Property | Type       | Description                   |
| -------- | ---------- | ----------------------------- |
| `store`  | `LogStore` | Log store instance to control |

### `<socklog-sender>`

Textarea + Send button that publishes messages over the viewer's existing WebSocket
connection. Send via the button or `Cmd`/`Ctrl`+`Enter`. The button is disabled when
the connection is not open or the textarea is empty.

**Properties:**

| Property | Type              | Description                                     |
| -------- | ----------------- | ----------------------------------------------- |
| `client` | `WebSocketClient` | WebSocket client instance to send messages over |

## Styling

Components use CSS custom properties for theming:

```css
socklog-viewer {
  /* Typography */
  --socklog-font-family: 'Monaco', 'Menlo', monospace;
  --socklog-font-size: 13px;

  /* Colors */
  --socklog-bg: #1e1e1e;
  --socklog-color: #d4d4d4;
  --socklog-border-color: #333;
  --socklog-timestamp-color: #888;
  --socklog-muted-color: #666;

  /* Layout */
  --socklog-padding: 8px;
  --socklog-border-radius: 4px;
}

socklog-controls {
  /* Controls */
  --socklog-controls-bg: #252526;
  --socklog-input-bg: #3c3c3c;
  --socklog-input-border: #555;
  --socklog-input-color: #d4d4d4;
  --socklog-focus-color: #007acc;
  --socklog-hover-bg: #404040;

  /* Pause state */
  --socklog-pause-bg: #fff3cd;
  --socklog-pause-color: #856404;
}
```

## Core Modules

For advanced usage, you can import the core modules directly:

```typescript
import { WebSocketClient, LogStore } from '@andrewshell/socklog'

const client = new WebSocketClient({
  url: 'ws://localhost:8080/logs',
  reconnect: true,
  reconnectInterval: 3000,
  maxReconnectAttempts: 10
})

const store = new LogStore(1000)

client.addEventListener('log', (e) => {
  store.add(e.detail)
})

client.connect()

// Send a message over the same connection
client.send('hello server')
```

## Types

```typescript
interface LogEntry {
  id: string
  timestamp: Date
  data: unknown
  raw: string
}

interface WebSocketConfig {
  url: string
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

interface LogFilter {
  search?: string
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'
```

## License

MIT
