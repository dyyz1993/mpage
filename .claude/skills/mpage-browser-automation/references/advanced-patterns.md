# mpage Advanced Patterns

## Handling Vue/React Apps

mpage's `fill` command automatically dispatches `input` and `change` events after setting values, ensuring Vue `v-model` and React state updates fire correctly.

If `fill` doesn't trigger the expected behavior, use `evaluate`:

```bash
mpage --session s "evaluate 'document.querySelector(\"textarea\").value = \"text\"; document.querySelector(\"textarea\").dispatchEvent(new Event(\"input\", {bubbles: true}))'"
```

## Working with iframes

```bash
mpage --session s "evaluate 'document.querySelector(\"iframe\").contentDocument.title'"
```

## Multi-step Form with Verification

```bash
SESSION="multi-step"
mpage --session $SESSION "goto https://example.com/wizard && wait networkidle"

# Step 1
mpage --session $SESSION "fill --selector '#step1-input' --value 'data'"
mpage --session $SESSION "click --selector '#next-btn'"
mpage --session $SESSION "wait networkidle"

# Step 2 - verify we moved forward
mpage --session $SESSION "url"
mpage --session $SESSION "find 'Step 2'"

mpage --session $SESSION close
```

## Handling Dynamic Content

```bash
# Wait for specific element to appear
mpage --session s "evaluate 'await new Promise(r => { const check = () => document.querySelector(\".result\") ? r() : setTimeout(check, 500); check(); })'"
```

## Batch Testing Script

```bash
#!/bin/bash
set -e

SESSION="batch-$(date +%s)"
URL="http://localhost:5173"

echo "=== Test 1: Page Load ==="
mpage --session $SESSION "goto $URL && wait networkidle"
mpage --session $SESSION "title"

echo "=== Test 2: Navigation ==="
mpage --session $SESSION "snapshot" | head -20

echo "=== Test 3: Find Element ==="
mpage --session $SESSION "find 'Dashboard'"

echo "=== Test 4: Form Fill ==="
mpage --session $SESSION "fill --selector 'textarea' --value 'test message'"
mpage --session $SESSION "press Enter"

echo "=== Cleanup ==="
mpage --session $SESSION close
echo "All tests passed!"
```
