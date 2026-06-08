# 實作進度追蹤（依重構計畫 v1.5 功能項目）

- 文件版本：v1.6（大分類動態化與智能批量匯入完成版）
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
- **2026-06-08 大升級**：
  1. **大分類動態化**：大分類管理不再使用靜態 `categoryKeys`，全面由 Supabase `categories` 資料庫驅動，並支援後台大分類 CRUD（新增/修改/刪除/排序）以及動態 sitemap、動態 SEO `generateMetadata`。
  2. **智能批量匯入**：提供 Excel/CSV 檔案解析，並整合雙軌圖片上傳機制（ZIP 壓縮檔解壓 / 瀏覽器多圖選取），在客戶端自動比對圖片檔名，缺失的大分類和子目錄會在匯入時於資料庫中自動建立，支援一鍵批量 Upsert 產品。

## 功能追蹤（對齊 v1.5）

| v1.5 功能項目 | 狀態 | 實際落地內容 | 主要缺口（下一步） |
| :--- | :---: | :--- | :--- |
| 功能一：權限驗證與 Admin Portal | ✅ 已可用 | Supabase Auth 登入已可用；後台 Dashboard 含產品 CRUD（新增/編輯/刪除/圖片上傳）、大分類 CRUD、子分類 CRUD 及**智能批量匯入（Excel/CSV + ZIP/多圖匹配）**。 | 拖曳排序、RLS 安全策略精細化。 |
| 功能二：訪客產品目錄與高效搜尋 | ✅ 已可用（部分） | 三層目錄架構已上線：動態大分類頁 → 子目錄卡片 → 產品列表 → 產品詳細頁。Breadcrumb 四層導覽完整，左側邊欄為 Accordion 展開式，動態顯示當前大分類下的子目錄。 | 「即時搜尋/多維篩選」尚未完成。 |
| 功能三：SEO 與效能優化 | ✅ 已可用 | 已有 `robots.ts`、`sitemap.ts`（動態撈取類別和產品）、大分類及子目錄與產品頁 `generateMetadata`、Product Schema。全站網址 canonical 處理。 | 全站 hreflang 補齊。 |
| 功能四：詢價流程優化 | 🟡 骨架 | 已有詢價 API 與前端表單（產品內頁可直接詢價）。 | RFQ 詢價車、Resend 正式寄信與客戶自動回覆未完成。 |
| 功能五：CAPTCHA + Rate Limiting | 🟡 骨架 | API 已含 Turnstile 驗證邏輯與 Upstash 限流邏輯。 | 需配置正式金鑰並驗證生產環境策略。 |
| 功能六：HTTP Security Headers | ✅ 已可用 | CSP/HSTS/X-Frame-Options 已在 `next.config.ts` 設定。 | 需部署後進行外部掃描評分驗證。 |
| 功能七：Permalink + Breadcrumb | ✅ 已可用 | 產品永久連結為三層路由 `/products/[category]/[subCategory]/[model]`。Breadcrumb 支援四層導覽。 | 可補強分享與追蹤分析事件。 |
| 功能八：商業信任頁（About/Contact/Privacy） | ✅ 已可用 | 路由與基礎內容已建立（三語版文案已上線，含首頁 Hero、品牌信念區、公司資訊區）。 | 需補齊正式商業文案細節、法務文本審核。 |
| 功能九：Cookie Consent Banner | ✅ 已可用（基礎） | Cookie 同意橫幅與 GA consent update 已接上。 | 需法務審核文案與 consent log 策略（若需）。 |

## 里程碑追蹤（M1-M6）

| 里程碑 | 目前狀態 | 說明 |
| :--- | :---: | :--- |
| M1 基礎架構 | ✅ 完成 | Next.js 基礎、i18n、CI、Security Headers、健康檢查已落地。Supabase 資料庫（含 sub_categories 表）已建立。 |
| M2 前台完成 | ✅ 主要完成 | 前台三層目錄架構已上線，產品目錄、子目錄、產品詳細頁皆可運作。大分類與子目錄 SEO 元數據全部動態化。搜尋篩選細節仍待補。 |
| M3 後台完成 | ✅ 完成 | Admin Portal 具備完整的後台管理與營運能力：產品管理、子目錄管理、大分類管理，並提供強大的 Excel/CSV 與多圖關聯之智能批量匯入。 |
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
| Resend 正式寄信設定 | 功能四 | 配置 API key 與寄件網域，使詢價表單能寄信通知管理者 |
| CAPTCHA + Rate Limiting 正式啟用 | 功能五 | 配置 Turnstile 與 Upstash 正式金鑰以防範機器人惡意詢價 |

### 🟡 中優先（近期規劃）

| 項目 | 對應 v1.5 功能 | 說明 |
| :--- | :--- | :--- |
| 拖曳排序 | 功能一 | 子目錄後台與大分類後台管理拖曳排序 |
| RFQ 詢價購物車 + CRM | 功能四 / 8B | 整合詢價車與後台 CRM 管理 |

### 🟢 低優先（依需求排程）

| 項目 | 對應 v1.5 功能 | 說明 |
| :--- | :--- | :--- |
| 國家別流量分析 Dashboard | 8C | Supabase SQL + 圖表元件 |

## 驗收與同步規則

1. 每次更新本文件時，需同步調整「更新日期」與「文件版本」。
2. 功能狀態以「是否可在目前程式碼中運作」為準，不以規劃文字為準。
3. 標記為 `✅ 已可用` 的項目，需可對應到實際路由、元件或 API。
4. 標記為 `🟡 骨架` 的項目，需清楚寫出尚未完成的缺口。

## 本次調整紀錄（2026-06-08）

- **大分類管理完全動態化**：全面從 Supabase `categories` 讀寫，並移除前端、路由、sitemap 的硬編碼 `categoryKeys`。
- **實作智能批量匯入功能**：支援 Excel/CSV 與 ZIP/多圖匹配的批量 Upsert，並支援分類與子目錄的自動新建。
- **SEO 改進**：大分類頁面與子分類頁面均加入 dynamic `generateMetadata` 進行動態 SEO 支援。
- 更新文件版本為 v1.6，標記里程碑 M3 為 `✅ 完成`，功能一為 `✅ 已可用`。
