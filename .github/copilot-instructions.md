# xh-motorparts.com 協作指引

## 專案現況（請先理解）
- 專案已進入 **v1.5 增量遷移**：目前為「雙軌」狀態，網域確定為 `xh-motorparts.com`。
- 舊版可用站：`index.html`、`products.html`、`styles.css`、`js/`（原生 JS）。
- 新版骨架：`src/app/`（Next.js 15 + TypeScript + App Router）。
- 原則：先保留舊版可運作，再逐步把功能搬到 Next.js。

## v1.5 已落地的基礎項目（M1 部分）
- Next.js 專案基礎：`package.json`、`tsconfig.json`、`next.config.ts`、`src/app/`。
- 多語路由骨架：`src/app/[locale]/layout.tsx`、`src/app/[locale]/page.tsx`、`src/app/[locale]/products/page.tsx`。
- 分類與產品路由：`src/app/[locale]/products/[category]/page.tsx`、`src/app/[locale]/products/[category]/[modelNumber]/page.tsx`。
- SEO 基礎：`src/app/robots.ts`、`src/app/sitemap.ts`。
- Breadcrumb：`src/components/products/Breadcrumb.tsx`（含 Schema.org `BreadcrumbList`）。
- Product Schema / Inquiry：`src/components/products/ProductSchema.tsx`、`src/components/products/InquiryForm.tsx`。
- 視覺元件：`src/components/products/ProductCard.tsx`、`src/components/products/CategorySidebar.tsx`、`src/components/layout/Footer.tsx`。
- 健康檢查：`src/app/api/health/route.ts`（供 UptimeRobot）。
- 詢價 API：`src/app/api/inquiry/route.ts`（含 Turnstile + Rate Limiting 骨架）。
- 產品資料抽離：`src/data/products.ts`（由舊版 `js/products.js` 遷移）。
- 舊站圖片 bridge：`src/app/legacy-assets/[...path]/route.ts`，讓 Next.js 可直接讀取既有 `images/`。
- i18n 已接入：`next-intl`（`middleware.ts`、`src/i18n/*`）+ `messages/zh-TW.json`、`messages/zh-CN.json`、`messages/en.json`。
- 商業信任頁骨架：`src/app/[locale]/about/page.tsx`、`src/app/[locale]/contact/page.tsx`、`src/app/[locale]/legal/privacy/page.tsx`。
- Supabase scaffold：`src/lib/supabase/*`、`src/lib/catalog-service.ts`（無 env 時 fallback 到本地資料）。
- Admin 骨架：`src/app/[locale]/admin/login/page.tsx`、`src/app/[locale]/admin/dashboard/page.tsx`。
- Cookie Banner：`src/components/layout/CookieBanner.tsx`。
- Analytics script 骨架：`src/components/layout/AnalyticsScripts.tsx`（GA4 / Clarity 依 env 啟用）。
- Security Headers：已於 `next.config.ts` 實作（CSP/HSTS/X-Frame-Options 等）。
- Dev/Build 指令：`npm run dev`、`npm run build`、`npm run start`、`npm run lint`。

## 舊站關鍵一致性規則（仍需維持）
- 分類 key（如 `cylinder`、`oil-seal`）必須在以下位置**完全一致**：
  - `products.html` 的 `data-category`
  - `js/products.js` 的 `products` 物件 key
  - `js/languages.js` 的 `categoryNames` / `categoryDescriptions`
  - `images/products/<category>/` 目錄名稱
- 產品圖片命名格式：`images/products/<category>/<category>-NNN.<ext>`。
- 新增產品名稱時，需同步補齊三語 `productNames` 對照，否則會顯示原文或混語。

## 開發流程（雙軌）
- 舊站預覽：`python3 -m http.server 8000`。
- 新站開發：`npm run dev`。
- 交付前至少執行：`npm run build`。
- 圖片改名工具：`python3 rename_images.py`。
- CI 檔案：`.github/workflows/ci.yml`、`.github/workflows/db-backup.yml`。

## 修改原則（給 AI/自動化代理）
- 優先小範圍修改，避免無關重構與大幅格式化。
- 文案以繁體中文為準，再同步到 `zh-CN`、`en`。
- 舊站未模組化前，不要調整腳本載入順序：`languages.js` → `translator.js` → `products.js`。
- 涉及 `products`/分類/翻譯屬於跨檔案修改，必須同步修正。
- Next.js 新增頁面時，先對齊 v1.5 路由結構：`/[locale]`、`/[locale]/products`，再往 `admin`、`api` 擴充。
- 若外部服務 env 未提供，維持「可編譯 fallback」：Supabase 走本地資料、Turnstile/Upstash/Resend 走骨架模式。
- 不可破壞既有 URL 與資產路徑（舊站仍為可用版本）。
- 若新版頁面需要顯示舊站圖片，優先走 `legacy-assets` bridge，不要直接假設 `images/` 可被 Next.js 公開存取。

## 實作追蹤
- 進度文件：`doc/IMPLEMENTATION_STATUS.md`。
- 計畫來源：`doc/摩托車零件網站現代化重構計畫_v1.5.md`。
