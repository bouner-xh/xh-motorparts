# 實作進度追蹤（依重構計畫 v1.6 功能項目）

- 文件版本：v1.7（RFQ 詢價車與 CRM 後台管理完成版）
- 更新日期：2026-06-09
- 計畫來源：`doc/摩托車零件網站現代化重構計畫_v1.6.md`

## 狀態定義

- `✅ 已可用`：功能已在現行程式碼中可運作（即使外部服務未配置，仍有可編譯 fallback）
- `🟡 骨架`：UI 或 API 骨架已在，但未完成正式上線流程
- `⚪ 未完成`：尚未落地

## 架構現況（單軌 Next.js）

- 本專案已改為單軌策略，Next.js（`src/app/`）為唯一主線。
- 舊版靜態檔案不再作為功能維運目標，後續功能皆以 Next.js 路由與元件為準。
- 功能狀態判定以現行 Next.js 程式碼與可驗證路由/API 為依據。
- **2026-06-09 大升級**：
  1. **後台拖曳排序功能**：已完成大分類與子目錄管理之拖曳排序（HTML5 drag and drop API），調整順序後一鍵儲存回 Supabase 資料庫，前台產品選單與分類列表皆會根據新排序即時呈現。
  2. **B2B RFQ 詢價購物車**：新增前端 `CartContext` 與 Header `CartIndicator`，買家可在產品內頁調整需求數量並加入清單，並於 `/[locale]/inquiry` 提供編輯清單與填寫 company/國家等 B2B 表單。
  3. **CRM 詢價管理與郵件通知**：客戶提交詢價後自動寫入 Supabase CRM，並透過 Resend API 雙向寄發無表情符號的專業商務確認信（寄給客戶與管理員 `bounerchang@gmail.com`）。管理後台新增 CRM 調度面板，可查看明細、更改狀態（Pending / Processing / Replied / Archived）與填寫跟進註記。

## 功能追蹤（對齊 v1.6）

| v1.6 功能項目 | 狀態 | 實際落地內容 | 主要缺口（下一步） |
| :--- | :---: | :--- | :--- |
| 功能一：權限驗證與 Admin Portal | ✅ 已可用 | Supabase Auth 登入已可用；後台 Dashboard 含產品 CRUD 、大分類 CRUD、子分類 CRUD、**智能批量匯入**與**拖曳排序功能**。 | RLS 安全策略精細化。 |
| 功能二：訪客產品目錄與高效搜尋 | ✅ 已可用（部分） | 三層目錄架構已上線：動態大分類頁 → 子目錄卡片 → 產品列表 → 產品詳細頁。Breadcrumb 四層導覽完整，左側邊欄為 Accordion 展開式，動態顯示當前大分類下的子目錄。 | 「即時搜尋/多維篩選」尚未完成。 |
| 功能三：SEO 與效能優化 | ✅ 已可用 | 已有 `robots.ts`、`sitemap.ts`（動態撈取類別和產品）、大分類及子目錄與產品頁 `generateMetadata`、Product Schema。全站網址 canonical 處理。 | 全站 hreflang 補齊。 |
| 功能四：詢價流程優化 | ✅ 已可用 | B2B 詢價購物車已上線。提交詢價會寫入 Supabase，並發送 Resend 電子郵件通知。管理後台設有詢價管理 (CRM) 面板。 | Resend 需在生產環境設定寄件網域 (Domain DKIM)。 |
| 功能五：CAPTCHA + Rate Limiting | 🟡 骨架 | API 已含 Turnstile 驗證與 Upstash 限流邏輯。 | 需配置正式金鑰並驗證生產環境策略。 |
| 功能六：HTTP Security Headers | ✅ 已可用 | CSP/HSTS/X-Frame-Options 已在 `next.config.ts` 設定。 | 需部署後進行外部掃描評分驗證。 |
| 功能七：Permalink + Breadcrumb | ✅ 已可用 | 產品永久連結為三層路由 `/products/[category]/[subCategory]/[model]`。Breadcrumb 支援四層導覽。 | 可補強分享與追蹤分析事件。 |
| 功能八：商業信任頁（About/Contact/Privacy） | ✅ 已可用 | 路由與基礎內容已建立（含隱私政策三語版專業排版、About 頁面與 Contact 聯絡頁面）。 | 需補齊正式商業文案細節、法務文本審核。 |
| 功能九：Cookie Consent Banner | ✅ 已可用（基礎） | Cookie 同意橫幅與 GA consent update 已接上。 | 需法務審核文案與 consent log 策略（若需）。 |

## 里程碑追蹤（M1-M6）

| 里程碑 | 目前狀態 | 說明 |
| :--- | :---: | :--- |
| M1 基礎架構 | ✅ 完成 | Next.js 基礎、i18n、CI、Security Headers、健康檢查已落地。Supabase 資料庫已建立。 |
| M2 前台完成 | ✅ 主要完成 | 前台三層目錄架構已上線，產品目錄、子目錄、產品詳細頁皆可運作。大分類與子目錄 SEO 元數據全部動態化。搜尋篩選細節仍待補。 |
| M3 後台完成 | ✅ 完成 | Admin Portal 具備完整的後台管理與營運能力：產品管理、子目錄管理（含拖曳排序）、大分類管理（含拖曳排序）、以及智能批量匯入。 |
| M4 詢價系統 | ✅ 完成 | RFQ 詢價購物車、CRM 後台詢價狀態追蹤與跟進備忘錄、Resend 雙向郵件自動通知均已全數實作。 |
| M5 正式上線 | 🟡 進行中 | Vercel 已部署上線。GA4、Cookie Banner 已接上。Sentry、UptimeRobot 尚未正式配置。 |
| M6 商業完整度 | 🟡 進行中 | About Us / 聯絡頁 / 隱私政策已建立三語版。國家別分析 Dashboard 尚未實作。 |

## 資料庫 Schema 現況

| 資料表 | 狀態 | 說明 |
| :--- | :---: | :--- |
| `categories` | ✅ 已建立 | 9 大產品分類，含 `slug`, `name_i18n`, `description_i18n`, `sort_order` |
| `sub_categories` | ✅ 已建立 | 子目錄表，含 `category_id`(FK), `slug`(unique), `name_i18n`(JSONB), `sort_order` |
| `products` | ✅ 已建立 | 含 `sub_category_id`(FK) NOT NULL，產品必須歸屬於子目錄 |
| `product_images` | ✅ 已建立 | 產品圖片，含 `product_id`(FK), `storage_path`, `sort_order` |
| `customers` | ✅ 已建立 | B2B 客戶資料表，自動過濾並 Upsert 最新聯絡姓名/公司/國家/電話 |
| `inquiry_requests` | ✅ 已建立 | RFQ 詢價單主表，以 JSONB 儲存詢價當下型號與品名快照，防止產品刪改影響歷史紀錄 |
| `inquiry_replies` | 🟡 骨架 | 整合入 `inquiry_requests` 表中的 `reply_notes` (處理備忘錄) 與 `status` (跟進狀態) 欄位中，簡化管理與提升效能 |

## 前置條件（外部服務）

- [x] Supabase 專案與正式 schema 建置（含 sub_categories / customers / inquiry_requests 表）
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

| 項目 | 對應 v1.6 功能 | 說明 |
| :--- | :--- | :--- |
| Resend 正式寄信設定 | 功能四 | 配置生產環境之 Resend API key 與寄件網域，驗證信件雙向發送 |
| CAPTCHA + Rate Limiting 正式啟用 | 功能五 | 配置 Turnstile 與 Upstash 正式金鑰以防範機器人惡意詢價 |

### 🟡 中優先（近期規劃）

| 項目 | 對應 v1.6 功能 | 說明 |
| :--- | :--- | :--- |
| 國家別流量分析 Dashboard | 8C | 整合 Supabase SQL 國家別來源統計 + 後台 Recharts 圖表 |
| 即時搜尋與多維篩選 | 功能二 | 產品目錄頁面整合即時搜尋與多項規格動態篩選 |

## 驗收與同步規則

1. 每次更新本文件時，需同步調整「更新日期」與「文件版本」。
2. 功能狀態以「是否可在目前程式碼中運作」為準，不以規劃文字為準。
3. 標記為 `✅ 已可用` 的項目，需可對應到實際路由、元件或 API。
4. 標記為 `🟡 骨架` 的項目，需清楚寫出尚未完成的缺口。

## 本次調整紀錄（2026-06-09）

- **實作 B2B RFQ 詢價購物車**：新增前台產品數量調整與 Context Cart 狀態，並在 `/[locale]/inquiry` 開闢完整清單與 B2B 資料表單頁。
- **後台 CRM 詢價管理**：在 dashboard 新增詢價管理元件，支援詳情 Modal 檢視、跟進狀態編輯與跟進備忘錄（內部註記）。
- **Resend 雙向郵件通知**：整合 Resend API，在顧客提交 RFQ 後自動雙向寄送專業商務確認信（無表情符號）。
- **修飾隱私政策三語排版**：移動隱私權政策至 footer 版權旁，並排版優化。
- 更新文件版本為 v1.7，標記里程碑 M4 為 `✅ 完成`，資料表 `customers` / `inquiry_requests` 為 `✅ 已建立`。
