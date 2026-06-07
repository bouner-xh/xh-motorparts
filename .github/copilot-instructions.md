# xh-motorparts.com 協作指引

## 專案現況（請先理解）
- 專案採用 **v1.5 單軌策略**：以 Next.js 架構為唯一主線，網域確定為 `xh-motorparts.com`。
- 主要開發目標：`src/app/`（Next.js 15 + TypeScript + App Router）。
- 原則：所有新功能與修正都優先落在 Next.js 架構，不再以舊版靜態站為維護基準。

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
- 圖片資產沿用既有 `images/` 來源，並由 Next.js 路由/工具統一存取。
- i18n 已接入：`next-intl`（`middleware.ts`、`src/i18n/*`）+ `messages/zh-TW.json`、`messages/zh-CN.json`、`messages/en.json`。
- 商業信任頁骨架：`src/app/[locale]/about/page.tsx`、`src/app/[locale]/contact/page.tsx`、`src/app/[locale]/legal/privacy/page.tsx`。
- Supabase scaffold：`src/lib/supabase/*`、`src/lib/catalog-service.ts`（無 env 時 fallback 到本地資料）。
- Admin 骨架：`src/app/[locale]/admin/login/page.tsx`、`src/app/[locale]/admin/dashboard/page.tsx`。
- Cookie Banner：`src/components/layout/CookieBanner.tsx`。
- Analytics script 骨架：`src/components/layout/AnalyticsScripts.tsx`（GA4 / Clarity 依 env 啟用）。
- Security Headers：已於 `next.config.ts` 實作（CSP/HSTS/X-Frame-Options 等）。
- Dev/Build 指令：`npm run dev`、`npm run build`、`npm run start`、`npm run lint`。

## 資料與資產一致性規則（Next.js 主線）
- 分類 key（如 `cylinder`、`oil-seal`）必須在以下位置**完全一致**：
  - `src/lib/catalog.ts` 的分類定義
  - `src/data/products.ts` 的 `products` key
  - `messages/*.json` 的多語分類文字
  - `images/products/<category>/` 目錄名稱
- 產品圖片命名格式：`images/products/<category>/<category>-NNN.<ext>`。
- 新增產品時，需同步補齊多語內容（至少 `zh-TW`、`zh-CN`、`en`）。

## 開發流程（單軌）
- 開發與預覽：`npm run dev`。
- 交付前至少執行：`npm run build`。
- 圖片改名工具：`python3 rename_images.py`。
- CI 檔案：`.github/workflows/ci.yml`、`.github/workflows/db-backup.yml`。

## 修改原則（給 AI/自動化代理）
- 優先小範圍修改，避免無關重構與大幅格式化。
- 文案以繁體中文為準，再同步到 `zh-CN`、`en`。
- 涉及 `products`/分類/翻譯屬於跨檔案修改，必須同步修正。
- Next.js 新增頁面時，先對齊 v1.5 路由結構：`/[locale]`、`/[locale]/products`，再往 `admin`、`api` 擴充。
- 若外部服務 env 未提供，維持「可編譯 fallback」：Supabase 走本地資料、Turnstile/Upstash/Resend 走骨架模式。
- 不可破壞既有前台 URL 與 API 路徑。
- 圖片與靜態資產由 Next.js 端統一管理與引用，避免新增平行舊站依賴。

## 文件維護規則（新增）
- 文件修改時必須同步更新「版本號」與「更新日期」。
- 文件中需保留「本次調整紀錄」段落，至少包含：修改目的、修改範圍、受影響文件。
- 進度文件（`doc/IMPLEMENTATION_STATUS.md`）以「實際可用功能」為準，不得僅依規劃文字勾選完成。
- 任何狀態標記為完成的項目，需能對應到程式碼路由、元件或 API；若僅有骨架，必須明確標示「骨架」與缺口。
- 涉及流程、資安、外部服務的文件更新，需附「風險評估」：
  - 風險等級（高/中/低）
  - 影響範圍（功能、SEO、營運、資安）
  - 緩解措施（回滾、驗證、監控）
- 重大文件更新後，需同步檢查是否連動更新：
  - `doc/IMPLEMENTATION_STATUS.md`
  - `doc/摩托車零件網站現代化重構計畫_v1.5.md`
  - `.env.example`（若涉及環境變數）
- 文件若涉及已上線流程，需補一段「驗收方式」或「驗證步驟」。

## 實作追蹤
- 進度文件：`doc/IMPLEMENTATION_STATUS.md`。
- 計畫來源：`doc/摩托車零件網站現代化重構計畫_v1.5.md`。
