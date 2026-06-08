# 實作進度追蹤（依重構計畫 v1.5 功能項目）

- 文件版本：v1.3（三層目錄架構完成版）
- 更新日期：2026-06-08
- 計畫來源：`doc/摩托車零件網站現代化重構計畫_v1.5.md`

## 狀態定義

- `✅ 已可用`：功能已在現行程式碼中可運作（即使外部服務未配置，仍有可編譯 fallback）
- `🟡 骨架`：UI 或 API 骨架已在，但未完成正式上線流程
- `⚪ 未完成`：尚未落地

## 架構現況（單軌 Next.js）

- 本專案已改為單軌策略，Next.js（`src/app/`）為唯一主線。
- 舊版靜態檔案不再作為功能維運目標，後續功能皆以 Next.js 路由與元件為準。
- 功能狀態判定以現行 Next.js 程式碼與可驗證路由/API 為依據。
- **2026-06-08 新增**：產品目錄已從兩層架構（Category → Product）升級為三層架構（Category → Sub-Category → Product），資料庫、API、前後台介面皆已對應調整。

## 功能追蹤（對齊 v1.5）

| v1.5 功能項目 | 狀態 | 實際落地內容 | 主要缺口（下一步） |
| :--- | :---: | :--- | :--- |
| 功能一：權限驗證與 Admin Portal | ✅ 已可用 | Supabase Auth 登入已可用；後台 Dashboard 含產品 CRUD（新增/編輯/刪除/圖片上傳）與子目錄 CRUD 管理。 | 批次匯入（CSV/Excel）、拖曳排序、RLS 安全策略精細化。 |
| 功能二：訪客產品目錄與高效搜尋 | ✅ 已可用（部分） | 三層目錄架構已上線：大分類頁 → 子目錄卡片 → 產品列表 → 產品詳細頁。Breadcrumb 四層導覽完整。 | 「即時搜尋/多維篩選」尚未完成；左側邊欄僅顯示大分類，未展開子目錄。 |
| 功能三：SEO 與效能優化 | ✅ 已可用（部分） | 已有 `robots.ts`、`sitemap.ts`、產品頁 metadata、Product Schema。 | 子目錄頁面缺少 `generateMetadata`；Sitemap 未納入子目錄層級 URL；全站 hreflang/canonical 可再補齊。 |
| 功能四：詢價流程優化 | 🟡 骨架 | 已有詢價 API 與前端表單（產品內頁可直接詢價）。 | RFQ 詢價車、Resend 正式寄信與客戶自動回覆未完成。 |
| 功能五：CAPTCHA + Rate Limiting | 🟡 骨架 | API 已含 Turnstile 驗證邏輯與 Upstash 限流邏輯。 | 需配置正式金鑰並驗證生產環境策略。 |
| 功能六：HTTP Security Headers | ✅ 已可用 | 已在 `next.config.ts` 設定 CSP/HSTS/X-Frame-Options 等。 | 需部署後進行外部掃描評分驗證。 |
| 功能七：Permalink + Breadcrumb | ✅ 已可用 | 產品永久連結已升級為三層路由 `/products/[category]/[subCategory]/[model]`。Breadcrumb 支援四層導覽。 | 可補強分享與追蹤分析事件。 |
| 功能八：商業信任頁（About/Contact/Privacy） | ✅ 已可用 | 路由與基礎內容已建立（三語版文案已上線，含首頁 Hero、品牌信念區、公司資訊區）。 | 需補齊正式商業文案細節、法務文本審核。 |
| 功能九：Cookie Consent Banner | ✅ 已可用（基礎） | Cookie 同意橫幅與 GA consent update 已接上。 | 需補法務審核文案與 consent log 策略（若需）。 |

## 里程碑追蹤（M1-M6）

| 里程碑 | 目前狀態 | 說明 |
| :--- | :---: | :--- |
| M1 基礎架構 | ✅ 完成 | Next.js 基礎、i18n、CI、Security Headers、健康檢查已落地。Supabase 資料庫（含 sub_categories 表）已建立。 |
| M2 前台完成 | ✅ 主要完成 | 前台三層目錄架構已上線，產品目錄、子目錄、產品詳細頁皆可運作。搜尋篩選與 SEO 細節仍待補。 |
| M3 後台完成 | ✅ 主要完成 | Admin Portal 已具備可營運 CRUD 能力：產品管理（新增/編輯/刪除/圖片上傳）+ 子目錄管理（新增/編輯/刪除）。缺 CSV 批量匯入。 |
| M4 詢價系統 | 🟡 進行中 | 詢價表單已可用，但詢價購物車、CRM 後台管理、自動回覆信件尚未完成。 |
| M5 正式上線 | 🟡 進行中 | Vercel 已部署上線。GA4、Cookie Banner 已接上。Sentry、UptimeRobot 尚未正式配置。 |
| M6 商業完整度 | 🟡 進行中 | About Us / 聯絡頁 / 隱私政策已建立三語版。國家別分析 Dashboard 尚未實作。 |

## 資料庫 Schema 現況

| 資料表 | 狀態 | 說明 |
| :--- | :---: | :--- |
| `categories` | ✅ 已建立 | 9 大產品分類，含 `slug`, `name_i18n`, `description_i18n`, `sort_order` |
| `sub_categories` | ✅ 已建立 | 子目錄表，含 `category_id`(FK), `slug`(unique), `name_i18n`(JSONB), `sort_order` |
| `products` | ✅ 已建立 | 含 `sub_category_id`(FK) NOT NULL，產品必須歸屬於子目錄 |
| `product_images` | ✅ 已建立 | 產品圖片，含 `product_id`(FK), `storage_path`, `sort_order` |
| `customers` | ⚪ 未建立 | v1.4 規劃的客戶資料表 |
| `inquiry_requests` | ⚪ 未建立 | v1.4 規劃的詢價請求表 |
| `inquiry_replies` | ⚪ 未建立 | v1.4 規劃的詢價回覆追蹤表 |

## 前置條件（外部服務）

- [x] Supabase 專案與正式 schema 建置（含 sub_categories 表）
- [x] Vercel 部署上線
- [x] GitHub 專案遷移至正式帳號 (bouner-xh/xh-motorparts)
- [ ] Cloudflare Turnstile 正式 key
- [ ] Upstash Redis 正式連線資訊
- [ ] Resend API key 與寄件網域驗證
- [ ] Sentry 專案建立與 DSN 配置
- [ ] UptimeRobot 監控設定
- [ ] Cloudflare R2 儲存桶設定（目前圖片使用 Supabase Storage）

## 下一步優先項目

### 🔴 高優先（建議立即處理）

| 項目 | 對應 v1.5 功能 | 說明 |
| :--- | :--- | :--- |
| 左側邊欄樹狀目錄 | 功能二 | 升級為 Accordion 展開式，顯示大分類 > 子目錄 |
| 子目錄頁面 SEO | 功能三 | 加入 `generateMetadata`（OG / Title / Description） |
| Sitemap 更新 | 功能三 | 新的三層 URL 結構需納入 sitemap.xml |
| 正式產品資料匯入 | 功能一 | 資料庫已清空，需重新建立正式產品資料 |

### 🟡 中優先（近期規劃）

| 項目 | 對應 v1.5 功能 | 說明 |
| :--- | :--- | :--- |
| 子目錄卡片樣式美化 | 功能二 | 加入封面圖片或圖示 |
| 後台產品列表增加子目錄欄位 | 功能一 | 快速辨識產品歸屬 |
| Resend 正式寄信設定 | 功能四 | 配置 API key 與寄件網域 |
| CAPTCHA + Rate Limiting 正式啟用 | 功能五 | 配置 Turnstile 與 Upstash 正式金鑰 |

### 🟢 低優先（依需求排程）

| 項目 | 對應 v1.5 功能 | 說明 |
| :--- | :--- | :--- |
| 空分類提示文字多語系 | 功能二 | 納入 i18n 翻譯檔 |
| 批量操作 / CSV 匯入 | 功能一 | 批量移動產品、Excel 匯入 |
| 拖曳排序 | 功能一 | 子目錄後台管理拖曳排序 |
| RFQ 詢價購物車 + CRM | 功能四 / 8B | 整合詢價車與後台 CRM 管理 |
| 國家別流量分析 Dashboard | 8C | Supabase SQL + 圖表元件 |

## 驗收與同步規則

1. 每次更新本文件時，需同步調整「更新日期」與「文件版本」。
2. 功能狀態以「是否可在目前程式碼中運作」為準，不以規劃文字為準。
3. 標記為 `✅ 已可用` 的項目，需可對應到實際路由、元件或 API。
4. 標記為 `🟡 骨架` 的項目，需清楚寫出尚未完成的缺口。

## 本次調整紀錄（2026-06-08）

- **功能一（Admin Portal）** 狀態從 `🟡 骨架` 升級為 `✅ 已可用`：後台已具備完整的產品 CRUD + 子目錄 CRUD + 圖片上傳能力。
- **功能七（Permalink + Breadcrumb）** 更新：路由結構已從兩層升級為三層，Breadcrumb 支援四層導覽。
- **M2、M3 里程碑** 狀態更新為 `✅ 主要完成`。
- **新增「資料庫 Schema 現況」區塊**：追蹤所有資料表的建立狀態。
- **新增「下一步優先項目」區塊**：依 v1.5 功能對齊並分優先級排列。
- 新增三層目錄架構說明（Category → Sub-Category → Product）。
- 修正 Bug 紀錄：子目錄 slug URL 編碼/解碼問題、ESLint 編譯錯誤、TypeScript 型別推導錯誤。
