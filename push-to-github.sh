#!/usr/bin/env bash
# ============================================================
# Blockfarm — push-to-github.sh
# One-command helper to create the "Blockfarm" repo on GitHub
# and push this project.
#
# Usage options:
#
#   A) With GitHub CLI (easiest):
#        ./push-to-github.sh
#      (requires `gh auth login` first)
#
#   B) With a Personal Access Token (repo scope):
#        GITHUB_USER=yourname GITHUB_TOKEN=ghp_xxx ./push-to-github.sh
#
#   ⚠️  Never commit or share your token. Revoke it after use
#      if you pasted it anywhere outside your own terminal.
# ============================================================
set -euo pipefail
cd "$(dirname "$0")"

REPO="Blockfarm"

if command -v gh >/dev/null 2>&1; then
  echo "▶ Using GitHub CLI…"
  gh repo create "$REPO" --public --source=. --remote=origin --push \
    --description "🌾 Open-source DeFi yield farming toolkit — live pool explorer, compound APY simulator & impermanent loss calculator. Zero dependencies."
  echo "✅ Done. Repo: $(gh repo view "$REPO" --json url -q .url 2>/dev/null || echo "github.com/<you>/$REPO")"
  exit 0
fi

if [[ -z "${GITHUB_USER:-}" || -z "${GITHUB_TOKEN:-}" ]]; then
  cat <<'EOF'
GitHub CLI (gh) not found and no GITHUB_USER/GITHUB_TOKEN env vars set.

Option 1 — install gh, then re-run:
  https://cli.github.com  →  gh auth login  →  ./push-to-github.sh

Option 2 — token flow:
  GITHUB_USER=yourname GITHUB_TOKEN=ghp_xxx ./push-to-github.sh

Option 3 — fully manual:
  1. Create an empty repo named "Blockfarm" at https://github.com/new
  2. git remote add origin https://github.com/<yourname>/Blockfarm.git
  3. git push -u origin main
EOF
  exit 1
fi

echo "▶ Creating repo $GITHUB_USER/$REPO via GitHub API…"
code=$(curl -s -o /tmp/gh_resp.json -w "%{http_code}" \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO\",\"private\":false,\"description\":\"Open-source DeFi yield farming toolkit — live pool explorer, compound APY simulator & impermanent loss calculator\"}")

if [[ "$code" != "201" ]]; then
  msg=$(grep -o '"message": *"[^"]*"' /tmp/gh_resp.json | head -1 || true)
  if grep -q "name already exists" /tmp/gh_resp.json 2>/dev/null; then
    echo "ℹ️  Repo already exists, pushing to it anyway."
  else
    echo "❌ GitHub API error ($code): $msg"; exit 1
  fi
fi

git remote remove origin 2>/dev/null || true
git remote add origin "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/${GITHUB_USER}/${REPO}.git"
git push -u origin main

# scrub token from remote config afterwards
git remote set-url origin "https://github.com/${GITHUB_USER}/${REPO}.git"
echo "✅ Pushed! https://github.com/${GITHUB_USER}/${REPO}"
