import type { Recording, RecordingEvent } from '../types.js';

export function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

export function generateJSScript(recording: Recording): string {
  const events = recording.events || [];

  const aggregatedEvents: RecordingEvent[] = [];
  let lastInputEvent: RecordingEvent | null = null;

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.type === 'input') {
      lastInputEvent = event;
    } else if (event.type === 'keydown') {
      // Skip keydown events
    } else {
      if (lastInputEvent) {
        aggregatedEvents.push(lastInputEvent);
        lastInputEvent = null;
      }
      aggregatedEvents.push(event);
    }
  }
  if (lastInputEvent) {
    aggregatedEvents.push(lastInputEvent);
  }

  let script = `#!/usr/bin/env node
// Auto-generated replay script from mpage
// Start URL: ${recording.startUrl}
// Original events: ${events.length}, Aggregated: ${aggregatedEvents.length}

import { WebSocket } from 'ws';

const CDP_URL = process.env.CDP_URL || 'ws://localhost:9221/devtools/browser/xxx';
const START_URL = '${recording.startUrl}';

async function main() {
  const ws = new WebSocket(CDP_URL);
  let msgId = 1;
  let targetId = null;
  
  ws.on('open', async () => {
    console.log('Connected to CDP');
    
    // Get page target
    ws.send(JSON.stringify({ 
      id: msgId++, 
      method: 'Target.getTargets' 
    }));
  });
  
  ws.on('message', async (data) => {
    const msg = JSON.parse(data.toString());
    
    if (msg.id === 2 && targetId) {
      // Attached to target, now replay
      console.log('Starting replay...');
      
      // Navigate to start URL first
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Page.navigate',
        params: { url: START_URL }
      }));
      
      // Wait for page load
      await sleep(5000);
      
      // Wait for page to be ready
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: 'document.readyState',
          awaitPromise: true
        }
      }));
      
      await sleep(1000);
`;

  for (const event of aggregatedEvents) {
    script += generateJSEvent(event);
  }

  script += `
      console.log('Replay completed!');
      ws.close();
    }
    
    if (msg.id === 1 && msg.result?.targetInfos) {
      // Find existing page or create new one
      const page = msg.result.targetInfos.find(t => t.type === 'page');
      if (page) {
        console.log('Found page:', page.url);
        targetId = page.targetId;
        // Attach to the page target
        ws.send(JSON.stringify({
          id: 2,
          method: 'Target.attachToTarget',
          params: { 
            targetId: page.targetId,
            flatten: true 
          }
        }));
      } else {
        console.log('No page found, creating new one...');
        ws.send(JSON.stringify({
          id: 2,
          method: 'Target.createTarget',
          params: { url: START_URL }
        }));
      }
    }
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(console.error);
`;

  return script;
}

export function generateJSEvent(event: RecordingEvent): string {
  switch (event.type) {
    case 'click':
      return `
      // Click: ${event.selector}
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: \`
            const el = document.querySelector('${event.selector}');
            if (el) {
              el.focus();
              el.click();
            }
          \`
        }
      }));
      await sleep(100);
`;

    case 'input':
      return `
      // Input: ${event.selector} - value: '${escapeString(event.data?.value || '')}'
      // First clear the input (Ctrl+A then Delete)
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: \`
            const el = document.querySelector('${event.selector}');
            if (el) { el.focus(); }
          \`
        }
      }));
      await sleep(50);
      // Select all and delete
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Input.dispatchKeyEvent',
        params: { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2 }
      }));
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Input.dispatchKeyEvent',
        params: { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2 }
      }));
      await sleep(50);
      // Insert the text
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Input.insertText',
        params: {
          text: '${escapeString(event.data?.value || '')}'
        }
      }));
      await sleep(100);
`;

    case 'keydown':
      if (event.data?.key === 'Enter') {
        return `
        // Press Enter: ${event.selector}
        ws.send(JSON.stringify({
          id: msgId++,
          method: 'Runtime.evaluate',
          params: {
            expression: \`
              const el = document.querySelector('${event.selector}');
              if (el) { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
            \`
          }
        }));
        await sleep(100);
`;
      }
      return '';

    case 'mousemove':
      return `
      // Mouse move: (${event.data?.x}, ${event.data?.y})
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Input.dispatchMouseEvent',
        params: {
          type: 'mouseMoved',
          x: ${event.data?.x},
          y: ${event.data?.y}
        }
      }));
      await sleep(16);
`;

    case 'hover_enter':
      return `
      // Hover: ${event.selector}
      ws.send(JSON.stringify({
        id: msgId++,
        method: 'Runtime.evaluate',
        params: {
          expression: \`
            const el = document.querySelector('${event.selector}');
            if (el) { el.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true })); }
          \`
        }
      }));
      await sleep(100);
`;

    default:
      return '';
  }
}
