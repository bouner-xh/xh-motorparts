#!/usr/bin/env bash
# 執行全部測試：單元測試 + 各種環境情境下的 E2E 測試
# 需求：Node 22 以上、已執行 npm install、全域安裝 playwright（見 tests/README.md）
# 用法：bash tests/run-all.sh
set -u
cd "$(dirname "$0")/.."
export NODE_PATH="$(npm root -g)"
PORT=3100
FAIL=0
SERVER=""
MOCK=""
LOG=/tmp/xh-e2e-server.log

start_server() {
  setsid "$@" > "$LOG" 2>&1 &
  SERVER=$!
  for _ in $(seq 1 90); do
    curl -s -o /dev/null "http://localhost:$PORT/zh-TW" && return 0
    sleep 2
  done
  echo "❌ 網站啟動失敗，請看 $LOG"
  FAIL=1
  return 1
}

stop_server() {
  [ -n "$SERVER" ] && kill -- -"$SERVER" 2>/dev/null
  wait "$SERVER" 2>/dev/null
  SERVER=""
  sleep 1
}

start_mock() {
  setsid node tests/e2e/mock-supabase.cjs > /tmp/xh-e2e-mock.log 2>&1 &
  MOCK=$!
  sleep 1
}

stop_mock() {
  [ -n "$MOCK" ] && kill -- -"$MOCK" 2>/dev/null
  wait "$MOCK" 2>/dev/null
  MOCK=""
}

e2e() {
  for t in "$@"; do
    node "tests/e2e/$t.e2e.cjs" > "/tmp/xh-e2e-$t.log" 2>&1
    local code=$?
    grep -E '^(✅|❌)' "/tmp/xh-e2e-$t.log"
    if [ $code -ne 0 ]; then
      FAIL=1
      grep -E '斷言失敗|Error' "/tmp/xh-e2e-$t.log" | head -3
    fi
  done
}

trap 'stop_server; stop_mock' EXIT

MOCK_ENV=(NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=anon SUPABASE_SERVICE_ROLE_KEY=service)
# 後台寄信（A6 ④）改寄到模擬伺服器，不會真的寄出
MAIL_ENV=(RESEND_API_KEY=test-key RESEND_API_URL=http://127.0.0.1:54321 RESEND_FROM_EMAIL=noreply@xh-motorparts.com)
ANALYTICS_ENV=(NEXT_PUBLIC_GA4_MEASUREMENT_ID=G-TEST123 NEXT_PUBLIC_CLARITY_PROJECT_ID=testclarity)
PROTECTION_ENV=(NEXT_PUBLIC_TURNSTILE_SITE_KEY=dummy TURNSTILE_SECRET_KEY=dummy UPSTASH_REDIS_REST_URL=https://dummy.upstash.io UPSTASH_REDIS_REST_TOKEN=dummy)

echo "== 1. 單元測試"
node --experimental-strip-types --test 'tests/security/*.test.mts' 'tests/admin/*.test.mts' 2>&1 | grep -E '^# (pass|fail)'
[ "${PIPESTATUS[0]}" -eq 0 ] || FAIL=1

echo "== 2. 開發模式（無資料庫）"
start_server npx next dev -p $PORT && e2e inquiry-flow admin-login admin-upload site-smoke canonical-url home-hero-responsive no-nested-interactive text-contrast contact-email home-section-order mobile-menu home-hero-cta no-emoji-icons inquiry-mobile-cards
stop_server

echo "== 3. 開發模式 + 模擬 Supabase（管理員名單：admin@example.com）"
start_mock
start_server env "${MOCK_ENV[@]}" "${MAIL_ENV[@]}" ADMIN_EMAILS=admin@example.com npx next dev -p $PORT && e2e admin-access product-card-inquiry language-switch locale-text page-h1 hreflang admin-product-form admin-product-category admin-product-import admin-delete admin-inquiries admin-product-list admin-api-errors admin-dashboard-tabs product-detail-cta admin-inquiry-export admin-customers admin-inquiry-events admin-inquiry-reply inquiry-limits inquiry-confirmation-email admin-image-resize admin-product-input product-availability
stop_server

echo "== 4. 開發模式 + 模擬 Supabase（未設定管理員名單）+ 模擬 Upstash 與每日排程"
start_server env "${MOCK_ENV[@]}" CRON_SECRET=e2e-cron-secret UPSTASH_REDIS_REST_URL=http://127.0.0.1:54321/upstash UPSTASH_REDIS_REST_TOKEN=upstash-token npx next dev -p $PORT && e2e admin-access-no-list cron-keepalive
stop_server

echo "== 4b. 開發模式 + 模擬 Supabase + 流量限制服務（Upstash）連不上"
start_server env "${MOCK_ENV[@]}" "${MAIL_ENV[@]}" CRON_SECRET=e2e-cron-secret UPSTASH_REDIS_REST_URL=http://127.0.0.1:9 UPSTASH_REDIS_REST_TOKEN=dummy npx next dev -p $PORT && { e2e inquiry-ratelimit-down; E2E_EXPECT=upstash-down e2e cron-keepalive; }
stop_server
stop_mock

echo "== 5. 開發模式 + 資料庫故障"
start_server env NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9 NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy SUPABASE_SERVICE_ROLE_KEY=dummy npx next dev -p $PORT && e2e inquiry-save-failure
stop_server

echo "== 6. 開發模式 + 分析服務"
start_server env "${ANALYTICS_ENV[@]}" npx next dev -p $PORT && e2e cookie-consent
stop_server

echo "== 7. 正式環境建置（缺少詢價防護設定）"
if env "${ANALYTICS_ENV[@]}" npx next build > /tmp/xh-e2e-build.log 2>&1; then
  start_server env "${ANALYTICS_ENV[@]}" npx next start -p $PORT && { export E2E_EXPECT=blocked; e2e inquiry-protection csp-analytics site-smoke; }
  stop_server
  echo "== 8. 正式環境（詢價防護設定齊全）"
  start_server env "${ANALYTICS_ENV[@]}" "${PROTECTION_ENV[@]}" npx next start -p $PORT && { export E2E_EXPECT=allowed; e2e inquiry-protection; }
  stop_server
else
  echo "❌ 正式環境建置失敗，請看 /tmp/xh-e2e-build.log"
  FAIL=1
fi

echo
[ $FAIL -eq 0 ] && echo "✅ 全部測試通過" || echo "❌ 有測試失敗"
exit $FAIL
