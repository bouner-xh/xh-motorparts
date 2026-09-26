# 變更紀錄（CHANGELOG）

記錄每一次修改：改了什麼、改了哪些檔案、依賴哪些設定、怎麼確認正常、出問題時怎麼還原。
**網站出現異常時，先從這裡找最近的相關修改。** 目前進度與待辦事項請看 `docs/PROGRESS.md`。

- 編號對照 2026-09-25 網站健檢報告：S = 資安、C = 網站設定與營運、D = 使用者體驗
- 還原方式：在 GitHub 找到對應 PR → 按 **Revert** 開一個還原 PR → 合併後 Vercel 會自動重新部署
- 驗證方式：`bash tests/run-all.sh`（見 `tests/README.md`）

---

## 目前必要的環境設定（Vercel 正式專案 `xh-motorparts-uhan`）

| 變數 | 用途 | 缺少時會怎樣 | 相關修改 |
|---|---|---|---|
| `ADMIN_EMAILS` | 後台管理員名單（逗號分隔） | **所有人都無法進後台** | S2 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET_KEY` | 詢價表單機器人驗證 | **正式環境停止收詢價單（503）** | S4 |
| `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN` | 詢價表單流量限制 | **正式環境停止收詢價單（503）** | S4 |
| `NEXT_PUBLIC_BASE_URL` | 正式網址（canonical、sitemap） | 使用程式預設值 `https://www.xh-motorparts.com` | C4 |
| `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` | 資料庫與登入 | 產品改用內建資料、後台無法使用 | — |
| `RESEND_API_KEY`、`RESEND_FROM_EMAIL`、`RESEND_ADMIN_EMAIL` | 詢價通知信 | 不寄信；資料庫也失敗時詢價回報失敗 | S1、S5 |

修改環境變數後需要到 Vercel → Deployments → 最新部署 → **Redeploy** 才會生效。

---

## 2026-09-26（第三批）：產品卡片加入詢價與前台體驗修正

PR：[#4](https://github.com/bouner-xh/xh-motorparts/pull/4)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| D1 | 產品列表卡片「加入詢價清單」按鈕，加入後變成「✓ 已加入，點此移除」，預設數量 100 | `src/components/products/ProductCardInquiryButton.tsx`、`ProductCard.tsx`、`messages/*.json`（`inquiry.addedToCart`）、`globals.css` | `5752c3a` | `product-card-inquiry.e2e.cjs`（桌機／手機） |
| D13 | 補上不存在的產品預設圖，沒有照片的產品不再破圖 | `images/no-image.jpg` | `19c5c4e` | 同上 |
| D5 | 首頁 Hero 內距以 `clamp()` 縮放（桌機不變） | `src/app/[locale]/page.tsx`、`globals.css`（`.hero__panel--home`） | `7d4d078` | `home-hero-responsive.e2e.cjs` |
| D6 | 切換語系保留目前頁面 | `src/components/layout/LanguageLinks.tsx`、`layout.tsx` | `41cf158` | `language-switch.e2e.cjs` |
| D7 | 文案改為三語，簡中無繁體字、英文無中文 | `src/lib/localized-text.ts`（`localized()`）與 11 個頁面／元件 | `bfd1246` | `locale-text.e2e.cjs` |
| D8 | 小字顏色 `#64748b` → `#94a3b8`（對比 3.73 → 6.92） | `globals.css`（`.footer-bottom`、`.footer-privacy-link`、`.privacy-last-updated`） | `fc04ce5` | `text-contrast.e2e.cjs` |
| D10 | 每頁 H1 為該頁主標題；標頭公司名稱改為 `.brand-name` | `layout.tsx`、各頁面、`globals.css` | `4812eb3` | `page-h1.e2e.cjs`、截圖比對 |
| D11 | 首頁主按鈕改為 `.button-primary` 連結（不再 `<a>` 包 `<button>`） | `src/app/[locale]/page.tsx`、`globals.css` | `9535fe9` | `no-nested-interactive.e2e.cjs`、截圖比對 |
| 測試 | 一次執行全部測試的腳本 | `tests/run-all.sh` | `273cfde` | — |

**之後修改時要注意**
- 新增前台文字時，請用 `localized(locale, { 'zh-TW': …, 'zh-CN': …, en: … })` 或 `messages/*.json`，不要再寫 `locale === 'en' ? 英 : 繁`，否則簡中頁會出現繁體字。
- 每頁只能有一個 `<h1>`（頁面主標題）；標頭公司名稱不是 H1。
- 按鈕外觀的連結請用 `className="button-primary"`，不要在 `<Link>` 裡放 `<button>`。

## 2026-09-26（第二批）：正式網址、防刷機制、清理舊檔

PR：[#3](https://github.com/bouner-xh/xh-motorparts/pull/3)（合併 `14e424d`）

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| C4 | 正式網址統一為 `https://www.xh-motorparts.com`，6 處改用 `getBaseUrl()` | `src/lib/site.ts`、`layout.tsx`、`robots.ts`、`sitemap.ts`、產品頁 | `f693dc0` | `canonical-url.e2e.cjs` |
| S4 | 正式環境（`VERCEL_ENV=production`）缺少 Turnstile／Upstash 任一設定即停止收單（503），伺服器 log 記錄缺少的變數；Preview 與開發環境不受影響 | `src/lib/inquiry-protection.ts`、`src/app/api/inquiry/route.ts` | `7408b6b` | `inquiry-protection.e2e.cjs`、單元測試 |
| 清理 | 移除舊版 GitHub Pages 靜態站（`index.html`、`products.html`、`404.html`、`styles.css`、`js/`）；`images/`、`messages/` 保留 | 根目錄 | `192047a` | `site-smoke.e2e.cjs` |

**之後修改時要注意**
- 詢價若突然全部失敗並回應 503，到 Vercel → Logs 搜尋 `Inquiry protection is not configured`，會列出缺少的變數。
- `images/` 仍被新網站使用（`/legacy-assets/*` 路由），不可刪除。

## 2026-09-26（第一批之二）：後台管理員名單

PR：[#2](https://github.com/bouner-xh/xh-motorparts/pull/2)（合併 `f998c10`）

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| S2 | 只有 `ADMIN_EMAILS` 名單內的帳號能使用後台頁面與 6 支後台 API（名單外 403、登入即登出、未設定名單一律拒絕） | `src/lib/admin-auth.ts`、`middleware.ts`、`src/app/api/admin/*`、後台頁面 | `9369ca1` | `admin-access*.e2e.cjs`、單元測試 |

**新增或移除管理員**：(1) Supabase → Authentication → Users 新增／刪除帳號；(2) 修改 Vercel 的 `ADMIN_EMAILS`；(3) Redeploy。

## 2026-09-25～26（第一批）：主要資安修正

PR：[#1](https://github.com/bouner-xh/xh-motorparts/pull/1)（合併 `6f8d849`，git 歷史改寫後的編號）

| 編號 | 修改 | 主要檔案 | Commit |
|---|---|---|---|
| S1 | 詢價信件所有欄位跳脫，防止 HTML 注入／釣魚信 | `src/lib/inquiry-email.ts`、`src/app/api/inquiry/route.ts` | `5521391` |
| S3 | CSP 放行 GA4、Clarity 收集網域 | `next.config.ts` | `36a3e72` |
| S5 | 詢價存檔失敗時寄管理員備援信（標題 `[NOT SAVED TO CRM]`），都失敗才回報錯誤 | `src/app/api/inquiry/route.ts` | `4955e6c` |
| S6 | Clarity 需同意 Cookie 才載入；回訪沿用同意狀態（「Cookie 設定」撤回連結尚未做） | `src/components/layout/AnalyticsScripts.tsx` | `5eaec0f` |
| S0 | 移除登入頁寫死帳密的「測試登入」後門 | `src/app/[locale]/admin/login/page.tsx` | `bca6f8b` |
| S7 | 登入後跳轉路徑於 server action 再次驗證 | 同上 | `85380bf` |
| S8 | 圖片上傳以檔案內容確認格式，錯誤訊息不外露 | `src/lib/image-signature.ts`、`src/app/api/admin/upload-image/route.ts` | `a03c520` |

---

## 程式以外的設定變更

| 日期 | 服務 | 變更 | 執行者 |
|---|---|---|---|
| 2026-09-26 | GitHub | git 歷史改寫：`master`、`test`、修正分支共 33 個 commit 中的外洩密碼替換為 `***REMOVED***`（所有 commit 編號因此改變） | Claude |
| 2026-09-26 | GitHub | Claude GitHub App 安裝到 `bouner-xh` | 老闆 |
| 2026-09-26 | Supabase | 更換外洩的管理員密碼、新增第二位管理員、關閉公開註冊、Site URL 改為正式網址 | 老闆 |
| 2026-09-26 | Vercel | 新增 `ADMIN_EMAILS`（兩個專案）；`xh-motorparts`（無正式網域的重複專案）中斷 Git 連結 | 老闆 |
| 2026-09-26 | Cloudflare | 刪除無效的 Porkbun SPF；啟用 Email Routing（MX／DKIM／SPF 已鎖定），轉寄目的地已驗證 | 老闆 |
