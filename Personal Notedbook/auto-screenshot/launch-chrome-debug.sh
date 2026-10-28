#!/usr/bin/env bash
# Opens a Chrome profile with a debugging port so a screenshot run can attach to it.
#
# Chrome has blocked --remote-debugging-port on its *default* data directory since
# version 136, so this cannot be pointed at ~/.config/google-chrome. Use a dedicated
# directory (the default below) and sign in to Shopify inside it once.
set -euo pipefail

PORT="${CHROME_DEBUG_PORT:-9222}"
PROFILE="${CHROME_PROFILE_DIRECTORY:-Default}"
USER_DATA_DIR="${CHROME_USER_DATA_DIR:-$(cd "$(dirname "$0")" && pwd)/auth/chrome-profile}"
BINARY="${CHROME_BINARY:-google-chrome-stable}"

if curl -s --max-time 2 "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1; then
  echo "Chrome is already listening on port ${PORT} — nothing to do."
  exit 0
fi

case "$(readlink -f "$USER_DATA_DIR")" in
  "$(readlink -f "$HOME/.config/google-chrome")" | "$(readlink -f "$HOME/.config/chromium")")
    echo "Chrome refuses remote debugging on its default data directory."
    echo "Point CHROME_USER_DATA_DIR at a dedicated folder instead, for example:"
    echo "  CHROME_USER_DATA_DIR=$(cd "$(dirname "$0")" && pwd)/auth/chrome-profile $0"
    exit 1
    ;;
esac

# Chrome symlinks SingletonLock to "<host>-<pid>" while it owns the profile.
LOCK="${USER_DATA_DIR}/SingletonLock"
if [ -L "$LOCK" ]; then
  TARGET="$(readlink "$LOCK")"
  OWNER_PID="${TARGET##*-}"
  if [ -n "$OWNER_PID" ] && kill -0 "$OWNER_PID" 2>/dev/null; then
    echo "Chrome (pid ${OWNER_PID}) already owns ${USER_DATA_DIR} without a debugging port."
    echo "Quit it fully, then run this script again:"
    echo "  kill ${OWNER_PID}"
    exit 1
  fi
fi

mkdir -p "$USER_DATA_DIR"

echo "Starting ${BINARY}"
echo "  data dir : ${USER_DATA_DIR}"
echo "  profile  : ${PROFILE}"
echo "  port     : ${PORT}"

"${BINARY}" \
  --remote-debugging-port="${PORT}" \
  --user-data-dir="${USER_DATA_DIR}" \
  --profile-directory="${PROFILE}" \
  --no-first-run \
  --no-default-browser-check \
  --disable-blink-features=AutomationControlled \
  >/dev/null 2>&1 &

for _ in $(seq 1 30); do
  sleep 1
  if curl -s --max-time 2 "http://127.0.0.1:${PORT}/json/version" >/dev/null 2>&1; then
    echo
    echo "Ready. If this profile is not signed in to Shopify yet, sign in in the window that just opened."
    echo "Then run: npm run capture"
    exit 0
  fi
done

echo "Chrome did not open its debugging port in time."
exit 1
