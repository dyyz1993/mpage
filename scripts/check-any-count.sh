#!/usr/bin/env bash
MAX_ANY=20

count=$(grep -rn ": any" --include="*.ts" \
  packages/core/src/ \
  packages/xcli-browser/src/ \
  src/ \
  .xcli/plugins/ \
  2>/dev/null | grep -v node_modules | grep -v dist | grep -v ".d.ts" | wc -l | tr -d ' ')

if [ "$count" -gt "$MAX_ANY" ]; then
  echo "❌ Found $count ': any' usages in production code (max allowed: $MAX_ANY)"
  echo "Please fix them before committing."
  exit 1
fi

echo "✅ Any count check passed ($count/$MAX_ANY)"
exit 0
