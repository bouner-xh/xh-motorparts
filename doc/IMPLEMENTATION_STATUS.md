# 實作進度追蹤（依 v1.5 計畫）

更新日期：2026-06-06

## 已完成（本次）
- [x] 建立 AI 協作規範文件（已改為中文內容）：`.github/copilot-instructions.md`
- [x] 建立環境變數範本：`.env.example`
- [x] 建立 PR 品質守門工作流：`.github/workflows/ci.yml`
- [x] 建立資料庫備份工作流：`.github/workflows/db-backup.yml`
- [x] 建立可持續追蹤的實作清單：本文件
- [x] 初始化 Next.js 15 + TypeScript + App Router 專案骨架（保留舊版靜態頁）
- [x] 建立 `src/app/[locale]` 三語路由與基礎 layout
- [x] 建立 `robots.ts` / `sitemap.ts` 基礎版本
- [x] 設定 `next.config.ts` Security Headers
- [x] 建立基礎首頁/產品列表頁骨架（從現有靜態版遷移）
- [x] 完成 `npm run build` 編譯驗證（Next.js build 成功）
- [x] 建立 `src/app/[locale]/products/[category]/[modelNumber]/page.tsx` 產品永久連結頁（Permalink）
- [x] 建立 Breadcrumb 元件與 Schema.org `BreadcrumbList`
- [x] 建立 `src/app/api/health/route.ts` 健康檢查端點（供 UptimeRobot）
- [x] 建立 `messages/zh-TW.json`、`messages/zh-CN.json`、`messages/en.json`（i18n 資源抽離）
- [x] 將 `js/products.js` 產品資料抽取為可重用 TS 資料來源：`src/data/products.ts`
- [x] 整合 `next-intl`（`middleware.ts`、`src/i18n/*`、`next.config.ts` plugin）
- [x] 建立 `/[locale]/about`、`/[locale]/contact`、`/[locale]/legal/privacy` 商業信任頁骨架
- [x] 完成二次 `npm run build` 驗證（含 next-intl 與新增路由）
- [x] 在產品詳細頁加入 JSON-LD Product Schema 與 Open Graph metadata
- [x] 串接 Supabase 基礎查詢骨架（無 env 時自動 fallback 至本地資料）
- [x] 實作 Cookie Consent Banner（GA 同意模式骨架）
- [x] 導入 Turnstile + Rate Limiting 詢價防護骨架（`/api/inquiry`）
- [x] 建立基本 Admin 路由骨架（`/[locale]/admin/login`、`/[locale]/admin/dashboard`）
- [x] 完成三次 `npm run build` 驗證（含 inquiry API / admin / Supabase scaffold）
- [x] 補齊 GA4 / Clarity script 與 Cookie 同意聯動骨架
- [x] 升級新版首頁 / 產品頁 / 詳細頁 / About / Contact / Privacy 視覺版型
- [x] 建立 `legacy-assets` 路由，讓 Next.js 可直接預覽舊站 `images/` 資產
- [x] 導入可重用元件：`ProductCard`、`CategorySidebar`、`Footer`

## 進行中（下一批）
- [ ] 以真實 Supabase schema／資料表完成資料來源切換
- [ ] 以真實 Turnstile / Upstash / Resend 金鑰啟用正式詢價流程
- [ ] 以真實 Supabase Auth 完成 admin 登入保護與 dashboard 權限控管
- [ ] 將舊站資產與圖片正式遷移至 `public/` 或 R2 URL

## 已知前置條件（需要你提供）
- [ ] Vercel / Supabase / Cloudflare / Resend 帳號與權限
- [x] 正式網域名稱定案為 `xh-motorparts.com`
- [ ] GitHub Secrets：`DATABASE_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 驗收方式
1. 檢查 GitHub Actions 是否出現 `CI Quality Gate` 與 `Supabase Database Backup`。
2. 檢查 repo 根目錄是否有 `.env.example`。
3. 檢查 AI 指南是否符合目前「雙軌架構（舊站 + Next.js）」與 v1.5 規劃。
4. 執行 `npm run build`，確認 Next.js 專案可編譯。
5. 驗證下列路由可開啟：`/[locale]/products/[category]`、`/[locale]/products/[category]/[modelNumber]`、`/api/health`。
6. 驗證下列新增路由可開啟：`/[locale]/about`、`/[locale]/contact`、`/[locale]/legal/privacy`、`/[locale]/admin/login`、`/[locale]/admin/dashboard`、`/api/inquiry`。

## 補充文件
- 外部服務接線清單與驗收指引：`doc/EXTERNAL_SETUP_CHECKLIST.md`
- 本地預覽說明：見 `doc/EXTERNAL_SETUP_CHECKLIST.md` 的「0. 本地預覽方式」
