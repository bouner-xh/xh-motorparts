# 實作進度追蹤（依重構計畫 v1.5 功能項目）

- 文件版本：v1.2（功能追蹤版）
- 更新日期：2026-06-07
- 計畫來源：`doc/摩托車零件網站現代化重構計畫_v1.5.md`

## 狀態定義

- `✅ 已可用`：功能已在現行程式碼中可運作（即使外部服務未配置，仍有可編譯 fallback）
- `🟡 骨架`：UI 或 API 骨架已在，但未完成正式上線流程
- `⚪ 未完成`：尚未落地

## 架構現況（單軌 Next.js）

- 本專案已改為單軌策略，Next.js（`src/app/`）為唯一主線。
- 舊版靜態檔案不再作為功能維運目標，後續功能皆以 Next.js 路由與元件為準。
- 功能狀態判定以現行 Next.js 程式碼與可驗證路由/API 為依據。

## 功能追蹤（對齊 v1.5）

| v1.5 功能項目 | 狀態 | 實際落地內容 | 主要缺口（下一步） |
| :--- | :---: | :--- | :--- |
| 功能一：權限驗證與 Admin Portal | 🟡 骨架 | 已有 `admin/login`、`admin/dashboard` 頁面骨架。 | 尚未接 Supabase Auth、路由守衛、產品 CRUD、批次匯入。 |
| 功能二：訪客產品目錄與高效搜尋 | ✅ 已可用（部分） | 分類頁、產品列表、產品詳細頁與詢價入口已可用。 | 「即時搜尋/多維篩選」尚未完成。 |
| 功能三：SEO 與效能優化 | ✅ 已可用（部分） | 已有 `robots.ts`、`sitemap.ts`、產品頁 metadata、Product Schema。 | 全站 hreflang/canonical 細節仍可再補齊與一致化。 |
| 功能四：詢價流程優化 | 🟡 骨架 | 已有詢價 API 與前端表單。 | RFQ 詢價車、Resend 正式寄信與客戶自動回覆未完成。 |
| 功能五：CAPTCHA + Rate Limiting | 🟡 骨架 | API 已含 Turnstile 驗證邏輯與 Upstash 限流邏輯。 | 需配置正式金鑰並驗證生產環境策略。 |
| 功能六：HTTP Security Headers | ✅ 已可用 | 已在 `next.config.ts` 設定 CSP/HSTS/X-Frame-Options 等。 | 需部署後進行外部掃描評分驗證。 |
| 功能七：Permalink + Breadcrumb | ✅ 已可用 | 已有產品永久連結路由與 Breadcrumb Schema。 | 可補強分享與追蹤分析事件。 |
| 功能八：商業信任頁（About/Contact/Privacy） | ✅ 已可用（骨架內容） | 路由與基礎內容已建立。 | 需補齊正式商業文案、法務文本與多語一致性。 |
| 功能九：Cookie Consent Banner | ✅ 已可用（基礎） | Cookie 同意橫幅與 GA consent update 已接上。 | 需補法務審核文案與 consent log 策略（若需）。 |

## 里程碑追蹤（M1-M4）

| 里程碑 | 目前狀態 | 說明 |
| :--- | :---: | :--- |
| M1 基礎架構 | ✅ 主要完成 | Next.js 基礎、i18n、CI、Security Headers、健康檢查已落地。 |
| M2 前台完成 | 🟡 進行中 | 前台主體可用，搜尋篩選與 SEO 細節仍待補。 |
| M3 後台完成 | ⚪ 未完成 | Admin 僅骨架，尚未具備可營運 CRUD 能力。 |
| M4 詢價系統 | ⚪ 未完成 | 詢價流程仍是骨架，CRM 與自動回覆未落地。 |

## 前置條件（外部服務）

- [ ] Supabase 專案與正式 schema 建置
- [ ] Cloudflare Turnstile 正式 key
- [ ] Upstash Redis 正式連線資訊
- [ ] Resend API key 與寄件網域驗證
- [ ] GitHub Secrets 完整配置（`DATABASE_URL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY` 等）

## 驗收與同步規則

1. 每次更新本文件時，需同步調整「更新日期」與「文件版本」。
2. 功能狀態以「是否可在目前程式碼中運作」為準，不以規劃文字為準。
3. 標記為 `✅ 已可用` 的項目，需可對應到實際路由、元件或 API。
4. 標記為 `🟡 骨架` 的項目，需清楚寫出尚未完成的缺口。

## 本次調整紀錄（2026-06-07）

- 將原本「工作清單式」改為「v1.5 功能項目追蹤式」。
- 更新為單軌 Next.js 架構說明與里程碑狀態（M1-M4）。
- 新增「狀態定義」與「驗收與同步規則」，避免進度與實作脫鉤。
