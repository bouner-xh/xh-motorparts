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
| `NEXT_PUBLIC_BASE_URL`（2026-09-27 已刪除，不需設定） | 正式網址（canonical、sitemap） | 使用程式預設值 `https://www.xh-motorparts.com`；若要設定，類型不可選 Secret | C4 |
| `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` | 資料庫與登入 | 產品改用內建資料、後台無法使用 | — |
| `RESEND_API_KEY`、`RESEND_FROM_EMAIL`、`RESEND_ADMIN_EMAIL` | 詢價通知信 | 不寄信；資料庫也失敗時詢價回報失敗 | S1、S5 |

修改環境變數後需要到 Vercel → Deployments → 最新部署 → **Redeploy** 才會生效。

---

## 2026-09-27（第九批）：Next.js 安全性升級

PR：[#14](https://github.com/bouner-xh/xh-motorparts/pull/14)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| S11 | next 15.5.19 → 15.5.26（同系列修正版），修補已公告的 2 個嚴重、4 個高與數個中等級漏洞；`npm audit fix`（不含破壞性升級）一併更新 sharp、nanoid | `package.json`、`package-lock.json` | `bd62b3a` | `bash tests/run-all.sh` 全部通過（含正式環境建置）；`npm ci` 正常 |

**剩下的 `npm audit` 警告**：postcss（Next.js 內建，只在建置時處理本站自己的 CSS，沒有外部輸入），要升級到 Next 16 才能消除，暫不處理。

**之後修改時要注意**
- **不要用 `npm audit fix --omit=dev`**：會把開發用套件從 `node_modules` 移除，之後 `next build` 會自動補裝不同版本並改寫 `package.json`（這次實際發生過）。要檢查請用 `npm audit --omit=dev`，修正用 `npm audit fix`。
- 建議每季執行一次 `npm audit --omit=dev` 檢查。

## 2026-09-27（第八批）：後台分類刪除、詢價管理、產品列表與 API 錯誤處理

PR：[#12](https://github.com/bouner-xh/xh-motorparts/pull/12)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| A5 | 分類列表顯示子分類數與產品數；有產品時不能刪除並說明原因（API 回 409）；刪除大分類提示子分類會一併刪除；刪除產品、換圖、匯入覆蓋圖片後清除沒人用的圖檔 | `AdminCategoryManager.tsx`、`AdminSubCategoryManager.tsx`、`api/admin/categories`、`api/admin/sub-categories`、`src/lib/product-image-cleanup.ts`（新）、`src/lib/storage-path.ts`（新） | `ac8f6d8` | `admin-delete.e2e.cjs`、`tests/admin/storage-path.test.mts` |
| A6 第一階段 | 詢價依狀態篩選（含筆數）、「N 筆待處理」、搜尋（公司／聯絡人／Email／國家／電話／型號）、每頁 20 筆、建立與最後更新時間、Esc 關閉、錯誤不取代整個面板、修正排版 | `AdminInquiryManager.tsx`、`api/admin/inquiries/route.ts` | `81d2fac` | `admin-inquiries.e2e.cjs` |
| A7 | 產品列表搜尋、分類與上架篩選、分頁、縮圖、子分類；編輯時捲到表單並顯示「正在編輯」與取消；「複製」產品；未存檔的上傳圖片自動刪除 | `AdminProductManager.tsx`、`api/admin/upload-image`（新增 DELETE）、`src/lib/product-image-url.ts`（新） | `528d38b` | `admin-product-list.e2e.cjs` |
| A9 | 後台 API 錯誤改為中文說明（原始訊息只記在伺服器 log）、ID 格式與欄位長度檢查、產品 API 不再自動建立沒有名稱的分類 | `src/lib/admin-api-errors.ts`（新）、`src/app/api/admin/**` | `01918dc` | `admin-api-errors.e2e.cjs`、`tests/admin/admin-api-errors.test.mts` |

**之後修改時要注意**
- 後台 API 回傳錯誤請用 `src/lib/admin-api-errors.ts` 的 `dbErrorResponse`／`invalidInputResponse`，不要直接回傳 `error.message`。
- 會刪除或更換產品圖片的地方，請在資料庫更新後呼叫 `removeUnreferencedImages`，避免圖檔累積。
- 後台元件之間用瀏覽器事件同步：`products-updated`、`categories-updated`、`subcategories-updated`。
- A6 第二階段（匯出 CSV、客戶列表、後台直接寄回覆信）尚未進行，需另外討論；「修改人」紀錄需要新增資料表欄位，也需確認。

## 2026-09-27（第七批）：後台產品管理與批量匯入

PR：[#11](https://github.com/bouner-xh/xh-motorparts/pull/11)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| A2 | 產品表單不再預填 TEST 測試資料，「上架」預設不勾選；移除偵錯面板、Build 標記與測試按鈕，並清除舊版存在瀏覽器的偵錯紀錄 | `src/components/admin/AdminProductManager.tsx` | `4c7eb22` | `admin-product-form.e2e.cjs` |
| A3 | 新增後保留分類與子分類（可連續新增）；切換大分類時清空子分類；API 檢查子分類屬於所選大分類 | `AdminProductManager.tsx`、`src/app/api/admin/products/route.ts` | `b4beace` | `admin-product-category.e2e.cjs` |
| A1 | Excel／ZIP 匯入改用隨網站打包的套件（`read-excel-file`、`jszip`），不再從外部網站載入（原本被 CSP 擋下）；不支援舊版 .xls | `AdminProductImporter.tsx`、`package.json` | `3d605b0` | `admin-product-import.e2e.cjs` |
| A4 | 正式 CSV 解析、FALSE／0／否 判讀為不上架、錯誤列號清單、每 50 筆分批、既有產品只更新有填的語言名稱（規格與庫存沒填保留原值）、範例檔下載 | `src/lib/product-import.ts`（新）、`AdminProductImporter.tsx`、`src/app/api/admin/products/batch/route.ts` | `3d605b0` | `tests/admin/product-import.test.mts`、`admin-product-import.e2e.cjs` |

**新增套件**（老闆 2026-09-27 同意）：`read-excel-file@9.3.10`、`jszip@3.10.2`（皆 MIT 授權；安裝後 `npm audit` 沒有新增警告）。安裝時 `package-lock.json` 一併同步，**`npm ci` 已恢復正常**。

**測試環境**：模擬 Supabase（`tests/e2e/mock-supabase.cjs`）改為可寫入，支援關聯查詢、外鍵限制與 Storage，範例資料 ID 改為 UUID。

**之後修改時要注意**
- 匯入欄位的解析規則都在 `src/lib/product-import.ts`，改規則時請一併更新單元測試。
- 後台不要再加入從外部網站載入的程式；需要的套件請安裝進專案。
- 設定程式以外的變更（2026-09-27）：老闆刪除 Vercel 的 `NEXT_PUBLIC_BASE_URL`（改用程式預設的 www）並重新部署，正式網站 canonical 已為 www（C4 完全生效）。

## 2026-09-27（第六批）：Cookie 撤回與多語 SEO

PR：[#10](https://github.com/bouner-xh/xh-motorparts/pull/10)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| S6 | 頁尾「隱私政策」旁新增「Cookie 設定」（三語）：清除同意紀錄與 GA／Clarity Cookie 後重新載入，橫幅重新出現；手機版公司名稱與連結分兩行 | `src/components/layout/CookieSettingsButton.tsx`（新）、`Footer.tsx`、`globals.css` | `353e6bd` | `cookie-consent.e2e.cjs`（新增撤回情境） |
| D14 | 所有公開頁面設定自己的 canonical 與 zh-TW／zh-CN／en／x-default hreflang。**另修正**：關於、聯絡、產品目錄、隱私政策、詢價頁原本的 canonical 指向首頁 | `src/lib/site.ts`（`localeAlternates`）、`src/app/[locale]/**/page.tsx`、`inquiry/layout.tsx`（新） | `8a51c2b` | `hreflang.e2e.cjs`（新）、`canonical-url.e2e.cjs` |

**之後修改時要注意**
- 新增公開頁面時，一定要在 `generateMetadata` 設定 `alternates: localeAlternates(locale, '/路徑')`。Next.js 不會合併 `alternates`：沒設定會沿用首頁的 canonical，只設 canonical 會少了 hreflang。
- 設定程式以外的變更（2026-09-27）：C3 Cloudflare 兩筆 DNS 紀錄改為 DNS only（已確認沒有自訂 Security 規則；正式網站回應已無 `cf-ray`）。

## 2026-09-27（第五批）：首頁與手機版體驗

PR：[#9](https://github.com/bouner-xh/xh-motorparts/pull/9)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| D3 | 首頁順序改為 Hero → 產品分類 → 詢價步驟 → 選擇理由 → 品牌故事（名言與品牌理念合併）；第一個產品分類位置桌機 1972 → 930px、手機 2379 → 1233px | `src/app/[locale]/page.tsx` | `3ac23ed` | `home-section-order.e2e.cjs` |
| D4 | 768px 以下標頭收合為 ☰ 選單（標頭高度約 310 → 68px），換頁自動收合；桌機不變 | `src/components/layout/SiteHeader.tsx`、`layout.tsx`、`globals.css` | `10d95f2` | `mobile-menu.e2e.cjs`、桌機截圖逐像素相同 |
| D2 | 依示意圖：主按鈕放大加粗、「公司資訊」改外框按鈕、聯絡資訊縮為按鈕下方一行（三語「或直接聯絡業務」） | `src/app/[locale]/page.tsx`、`globals.css` | `123a817` | `home-hero-cta.e2e.cjs` |
| D9 | emoji 改為自繪線條圖示（選擇理由、頁尾、詢價清單按鈕、空清單頁） | `src/components/ui/Icon.tsx`、`src/lib/site-content.ts`、`Footer.tsx`、`CartIndicator.tsx` | `791dc9c` | `no-emoji-icons.e2e.cjs` |
| D12 | 640px 以下詢價清單改為直式卡片（不需左右捲動、按鈕 44px、料號一行）；桌機不變 | `src/app/[locale]/inquiry/page.tsx`、`globals.css` | `ff055a3` | `inquiry-mobile-cards.e2e.cjs`、桌機截圖逐像素相同 |

**之後修改時要注意**
- 新增圖示請在 `src/components/ui/Icon.tsx` 加一個名稱，不要再使用 emoji。
- 標頭改由 `SiteHeader` 元件組成；新增導覽連結請在 `src/app/[locale]/layout.tsx` 的 `links` 裡加入，桌機與手機選單會同時出現。

## 2026-09-27：對外聯絡信箱改為公司信箱

PR：[#8](https://github.com/bouner-xh/xh-motorparts/pull/8)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| S9 | 首頁、頁尾、聯絡我們、隱私權政策（三語）的聯絡信箱由個人 Gmail 改為 `sales@xh-motorparts.com` | `src/components/layout/Footer.tsx`、`src/app/[locale]/page.tsx`、`src/lib/privacy-content.ts`、`messages/*.json`（`contact.email`） | `bde143f` | `contact-email.e2e.cjs` |

**之後修改時要注意**
- `sales@` 是 Cloudflare Email Routing 的轉寄地址，**只能收信**；要更換收信人請到 Cloudflare → Email Routing → Routing rules 修改，不需要改程式。
- 詢價通知信寄到哪裡由 Vercel 的 `RESEND_ADMIN_EMAIL` 決定，與網站顯示的信箱無關。

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
| 2026-09-27 | Cloudflare | `sales@xh-motorparts.com` 轉寄規則實測成功（外部信箱寄出，負責人信箱收到）（C2 完成） | 老闆 |
