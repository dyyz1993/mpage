#!/bin/bash
set -euo pipefail

CDP_PORT="${1:-9221}"
SESSION="seo-github"
SITE_URL="${2:-https://mactool.app}"
BIO="${3:-Full-stack developer | Building tools for productivity}"

echo "=== GitHub Profile SEO ==="
echo "CDP: $CDP_PORT | Site: $SITE_URL"

mpage --cdp "$CDP_PORT" --session "$SESSION" "goto https://github.com/settings/profile && wait domcontentloaded"
mpage --session "$SESSION" "fill --selector '#user_profile_bio' --value '$BIO'"
mpage --session "$SESSION" "fill --selector '#user_profile_blog' --value '$SITE_URL'"
mpage --session "$SESSION" "click --selector 'button.Button--primary'"
sleep 2

echo ""
echo "=== 验证 ==="
mpage --session "$SESSION" "goto https://github.com/dyyz1993"
mpage --session "$SESSION" "find '$SITE_URL'" | head -5
echo ""
echo "=== 完成 ==="
mpage --session "$SESSION" close
