#!/usr/bin/env bash
# Runs every automated check against a FRESH copy of the demo data, one suite at a time.
#   cd back-end && npm run build && bash scripts/run-all-checks.sh
# Needs: node, python3. The UI flow tests also run if vitest is installed in ../frontend-react
#   (cd ../frontend-react && npm i --no-save vitest jsdom @testing-library/react @testing-library/dom).
# The suites use port 3000 and DELETE data/db first, so stop your own backend before running this.
set -u
cd "$(dirname "$0")/.."
PORT=3000; export API="http://localhost:$PORT"; FAILED=0
PIDFILE=$(mktemp)

start_server() {
  node scripts/reset-data.js >/dev/null
  (PORT=$PORT node dist/main > /tmp/ch-check-server.log 2>&1 & echo $! > "$PIDFILE")
  for _ in $(seq 1 40); do curl -s -m 2 -o /dev/null "$API/health" && return 0; sleep 1; done
  echo "server did not start (see /tmp/ch-check-server.log)"; return 1
}
stop_server() { kill "$(cat "$PIDFILE")" 2>/dev/null; sleep 1; }
run() { # name, command...
  local name="$1"; shift
  start_server || { FAILED=1; return; }
  if "$@" > /tmp/ch-check-out.txt 2>&1; then echo "PASS  $name"; else echo "FAIL  $name"; sed 's/^/      /' /tmp/ch-check-out.txt | tail -15; FAILED=1; fi
  stop_server
}

echo "== API suites =="
run "step 1  platform admin, plans, clients, security" python3 step1-smoke-test.py
run "step 2  marketplace"                              python3 step2-smoke-test.py
run "step 3  client signup"                            python3 step3-signup-test.py
run "step 4  milestones and progress"                  python3 step4-smoke-test.py
run "step 5  procurement and stock"                    python3 step5-smoke-test.py
run "step 6  expenses, payments, dashboards"           python3 step6-smoke-test.py
run "step 7  full project lifecycle"                   python3 step7-e2e-lifecycle.py
run "route audit (public routes, roles)"               node scripts/audit-routes.js

echo; echo "== backend unit tests =="
if npm test --silent > /tmp/ch-check-out.txt 2>&1; then echo "PASS  jest"; else echo "FAIL  jest"; tail -15 /tmp/ch-check-out.txt; FAILED=1; fi

echo; echo "== UI flow tests =="
if [ -x ../frontend-react/node_modules/.bin/vitest ]; then
  start_server && (cd ../frontend-react && npx vitest run 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "✓ tests|× |Test Files|Tests |FAIL") ; stop_server
else
  echo "skipped (vitest is not installed in frontend-react)"
fi

node scripts/reset-data.js >/dev/null
rm -f "$PIDFILE"
[ "$FAILED" -eq 0 ] && echo -e "\nALL CHECKS PASSED" || { echo -e "\nSOME CHECKS FAILED"; exit 1; }
