#!/bin/bash
# OBS Bible Stream Verses - Release PR Script
# Usage: ./scripts/release-pr.sh [patch|minor|major]
# Default: patch
#
# Requires: GITHUB_TOKEN env variable (or stored in .env)
#   export GITHUB_TOKEN=ghp_xxxxxxxxxxxx

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Load token ───────────────────────────────────────────────────────────────

if [ -f ".env" ]; then
  export $(grep -v '^#' .env | grep GITHUB_TOKEN | xargs)
fi

if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "${RED}❌ GITHUB_TOKEN no encontrado.${NC}"
  echo -e "${YELLOW}   Crea un token en https://github.com/settings/tokens (scope: repo)${NC}"
  echo -e "${YELLOW}   Luego: export GITHUB_TOKEN=ghp_xxxx  o añádelo a .env${NC}"
  exit 1
fi

# ── Checks ───────────────────────────────────────────────────────────────────

if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}❌ Hay cambios sin commitear. Commitea o haz stash primero.${NC}"
  git status --short
  exit 1
fi

BUMP=${1:-patch}
if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}❌ Tipo de versión inválido: '$BUMP'. Usa patch, minor o major.${NC}"
  exit 1
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "main" ]; then
  echo -e "${RED}❌ Ejecuta el script desde una rama de feature, no desde main.${NC}"
  exit 1
fi

# Obtener repo desde remote (ej: boraita/OBS-BrowserSource-Bridge)
REMOTE_URL=$(git remote get-url origin)
REPO=$(echo "$REMOTE_URL" | sed 's/.*github.com[:/]\(.*\)\.git/\1/' | sed 's/.*github.com[:/]\(.*\)/\1/')

# ── Bump version ─────────────────────────────────────────────────────────────

echo -e "${BLUE}[1/5] Bumping version ($BUMP)...${NC}"
OLD_VERSION=$(node -p "require('./package.json').version")
npm version "$BUMP" --no-git-tag-version --no-commit-hooks > /dev/null
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}✓ $OLD_VERSION → $NEW_VERSION${NC}"

# ── Build + Package ──────────────────────────────────────────────────────────

echo -e "${BLUE}[2/5] Building and packaging...${NC}"
pnpm build
./scripts/package-release.sh
echo -e "${GREEN}✓ Build y release ZIP generados${NC}"

ZIP_FILE="releases/obs-bible-stream-verses-v${NEW_VERSION}.zip"
ZIP_SIZE=$(du -h "$ZIP_FILE" 2>/dev/null | cut -f1 || echo "?")
echo -e "  ${BLUE}ZIP:${NC} $ZIP_FILE ($ZIP_SIZE)"

# ── Commit ───────────────────────────────────────────────────────────────────

echo -e "${BLUE}[3/5] Committing version bump...${NC}"
git add package.json
git commit -m "chore: bump version to v${NEW_VERSION}"
echo -e "${GREEN}✓ Committed${NC}"

# ── Push branch ──────────────────────────────────────────────────────────────

echo -e "${BLUE}[4/5] Pushing branch '$BRANCH'...${NC}"
git push -u origin "$BRANCH"
echo -e "${GREEN}✓ Pushed${NC}"

# ── Create PR via GitHub API ─────────────────────────────────────────────────

echo -e "${BLUE}[5/5] Creando PR via GitHub API...${NC}"

COMMITS=$(git log main..HEAD --oneline)

BODY=$(cat <<EOF
## v${NEW_VERSION}

### Commits incluidos
\`\`\`
${COMMITS}
\`\`\`

### Checklist
- [ ] \`pnpm typecheck\` sin errores
- [ ] Verificado en OBS (panel + browser source)
- [ ] Versión en \`package.json\` actualizada a v${NEW_VERSION}
- [ ] ZIP generado en \`releases/obs-bible-stream-verses-v${NEW_VERSION}.zip\`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)

# Escapar el body para JSON
BODY_JSON=$(echo "$BODY" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")

RESPONSE=$(curl -s -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  "https://api.github.com/repos/${REPO}/pulls" \
  -d "{
    \"title\": \"release: v${NEW_VERSION}\",
    \"head\": \"${BRANCH}\",
    \"base\": \"main\",
    \"body\": ${BODY_JSON}
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY_RESP=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "201" ]; then
  PR_URL=$(echo "$BODY_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['html_url'])")
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}✓ PR creado y listo para mergear        ${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo -e "  ${BLUE}URL:${NC} $PR_URL"
else
  echo -e "${RED}❌ Error al crear el PR (HTTP $HTTP_CODE)${NC}"
  echo "$BODY_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))"
  exit 1
fi
