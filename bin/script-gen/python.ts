import type { Recording, RecordingEvent } from '../types.js';

export function generatePythonScript(recording: Recording): string {
  const events = recording.events || [];
  let script = `#!/usr/bin/env python3
# Auto-generated replay script from mpage
# Start URL: ${recording.startUrl}

import asyncio
import websockets
import json
import time

CDP_URL = "ws://localhost:9221/devtools/browser/xxx"

async def send_cdp(ws, method, params=None):
    msg = {"id": 1, "method": method}
    if params:
        msg["params"] = params
    await ws.send(json.dumps(msg))
    return json.loads(await ws.recv())

async def main():
    async with websockets.connect(CDP_URL) as ws:
        print("Connected to CDP")
        
        # Get page target
        result = await send_cdp(ws, "Target.getTargets")
        page = next((t for t in result["result"]["targetInfos"] if t["type"] == "page"), None)
        
        if page:
            print(f"Found page: {page['url']}")
            
            # Connect to page
            async with websockets.connect(page["webSocketDebuggerUrl"]) as page_ws:
                # Navigate to start URL
                await send_cdp(page_ws, "Page.navigate", {"url": "${recording.startUrl}"})
                await asyncio.sleep(2)
                
                # Replay events
`;

  for (const event of events) {
    script += generatePythonEvent(event);
  }

  script += `
                print("Replay completed!")

if __name__ == "__main__":
    asyncio.run(main())
`;

  return script;
}

export function generatePythonEvent(event: RecordingEvent): string {
  switch (event.type) {
    case 'click':
      return `                # Click: ${event.selector}
                await send_cdp(page_ws, "Runtime.evaluate", {
                    "expression": '''
                        const el = document.querySelector('${event.selector}');
                        if (el) { el.click(); }
                    '''
                })
                await asyncio.sleep(0.1)
`;

    case 'input':
      return `                # Input: ${event.selector}
                await send_cdp(page_ws, "Runtime.evaluate", {
                    "expression": '''
                        const el = document.querySelector('${event.selector}');
                        if (el) { el.value = '${event.data?.value || ''}'; el.dispatchEvent(new Event('input', { bubbles: true })); }
                    '''
                })
                await asyncio.sleep(0.1)
`;

    case 'keydown':
      if (event.data?.key === 'Enter') {
        return `                # Press Enter: ${event.selector}
                await send_cdp(page_ws, "Runtime.evaluate", {
                    "expression": '''
                        const el = document.querySelector('${event.selector}');
                        if (el) { el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); }
                    '''
                })
                await asyncio.sleep(0.1)
`;
      }
      return '';

    case 'mousemove':
      return `                # Mouse move: (${event.data?.x}, ${event.data?.y})
                await send_cdp(page_ws, "Input.dispatchMouseEvent", {
                    "type": "mouseMoved",
                    "x": ${event.data?.x},
                    "y": ${event.data?.y}
                })
                await asyncio.sleep(0.016)
`;

    default:
      return '';
  }
}
