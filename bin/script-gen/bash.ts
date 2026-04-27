import type { Recording, RecordingEvent } from '../types.js';

export function generateBashScript(recording: Recording): string {
  const events = recording.events || [];
  let script = `#!/bin/bash
# Auto-generated replay script from mpage
# Start URL: ${recording.startUrl}

CDP_URL="http://localhost:9221"

# Navigate to start URL
echo "Navigating to ${recording.startUrl}..."
curl -s "$CDP_URL/json/new?${recording.startUrl}" > /dev/null
sleep 2

`;

  for (const event of events) {
    script += generateBashEvent(event);
  }

  script += `
echo "Replay completed!"
`;

  return script;
}

export function generateBashEvent(event: RecordingEvent): string {
  switch (event.type) {
    case 'click':
      return `# Click: ${event.selector}
curl -s "$CDP_URL/json/execute" -d '{
  "method": "Runtime.evaluate",
  "params": {
    "expression": "document.querySelector('${event.selector}').click()"
  }
}' > /dev/null
sleep 0.1
`;

    case 'input':
      return `# Input: ${event.selector}
curl -s "$CDP_URL/json/execute" -d '{
  "method": "Runtime.evaluate",
  "params": {
    "expression": "document.querySelector('${event.selector}').value = '${event.data?.value || ''}'"
  }
}' > /dev/null
sleep 0.1
`;

    default:
      return '';
  }
}
