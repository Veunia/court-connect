#!/usr/bin/env bash
# Lance l'app en mode développement (hot-reload) sur http://localhost:8080
#
#   ./scripts/dev.sh
#
# Bun est cherché dans le PATH puis dans ~/.bun/bin (emplacement de
# l'installeur officiel). Ouvre ensuite http://localhost:8080 dans ton
# navigateur.
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v bun >/dev/null 2>&1; then
  if [ -x "$HOME/.bun/bin/bun" ]; then
    export PATH="$HOME/.bun/bin:$PATH"
  else
    echo "bun introuvable. Installe-le : curl -fsSL https://bun.sh/install | bash" >&2
    exit 1
  fi
fi

[ -d node_modules ] || bun install
[ -f .env ] || echo "Attention : pas de fichier .env (Supabase / Maps non configurés)." >&2

PORT="${PORT:-8080}"
# Libère le port si un serveur tourne déjà.
lsof -ti "tcp:${PORT}" -sTCP:LISTEN 2>/dev/null | xargs -r kill 2>/dev/null || true

echo "→ http://localhost:${PORT}"
exec bun run dev
