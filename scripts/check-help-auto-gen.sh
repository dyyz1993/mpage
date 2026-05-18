#!/usr/bin/env bash
# Check that CLI projects use auto-generated help from HelpGenerator
# instead of hand-written help files. This ensures --help output is always
# derived from Zod schemas registered via registerCommand().

set -e

ERRORS=0

# 1. Check for hand-written help files (src/cli/help.ts, src/help.ts, etc.)
for dir in packages/*/src .; do
  [ -d "$dir" ] || continue
  
  for helpfile in "$dir"/cli/help.ts "$dir"/help.ts "$dir"/cli/help.js; do
    if [ -f "$helpfile" ]; then
      # Allow if the file imports and uses HelpGenerator from the framework
      if ! grep -q "helpGenerator\|HelpGenerator" "$helpfile" 2>/dev/null; then
        echo "❌ Found hand-written help file: $helpfile"
        echo "   Use 'helpGenerator' from '@dyyz1993/xcli-core' instead."
        echo "   Core.run() already handles <command> --help automatically."
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done
done

# 2. Check that Core.run() command-level --help uses HelpGenerator
CORE_FILE="packages/core/src/core.ts"
if [ -f "$CORE_FILE" ]; then
  if ! grep -q "helpGenerator.generate" "$CORE_FILE"; then
    echo "❌ Core.run() must use helpGenerator.generate() for command-level --help"
    ERRORS=$((ERRORS + 1))
  fi
fi

# 3. Check that command registrations have Zod parameters (not bare handlers)
for cmdfile in packages/core/src/commands/*.ts; do
  [ -f "$cmdfile" ] || continue
  # Skip index.ts and registry
  basename=$(basename "$cmdfile")
  [ "$basename" = "index.ts" ] && continue
  [ "$basename" = "command-registry.ts" ] && continue
  
  # Every registerCommand should have parameters schema
  if grep -q "registerCommand" "$cmdfile"; then
    if ! grep -q "parameters:" "$cmdfile"; then
      echo "⚠️  $cmdfile: registerCommand() missing 'parameters' — --help will be empty"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "❌ $ERRORS help-related issue(s) found."
  echo "   Framework rule: --help must be auto-generated from Zod schemas."
  echo "   Do NOT create hand-written help files."
  exit 1
fi

echo "✅ Help generation check passed (all --help derived from Zod schemas)"
exit 0
