# 實作進度追蹤（依重構計畫 v1.6 功能項目）

- 文件版本：v1.8（動態語系、Vercel 流量分析與 GSC 提交版）
- 更新日期：2026-06-10
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

## 本次調整紀錄（2026-06-10）

- **智慧型動態語系欄位解析**：重構並升級 Excel 批量產品匯入功能與後台 API。現在系統會自動偵測 Excel 中如 `name_ja` / `產品名稱_日文` 等任意自訂語系欄位，並動態寫入 Supabase 資料庫中的 `name_i18n` JSONB。未來要新增、移除任何語系，**Excel 格式與後台 API 程式碼完全不需要做任何修改**，達到真正的零代碼維護。
- **整合 Vercel Web Analytics**：安裝並整合官方 `@vercel/analytics` 元件至全站根目錄，自動統計乾淨、排除惡意爬蟲與掃描器干擾的 100% 真人訪客瀏覽量、熱門頁面與國家/地區分佈。
- **完成 Google Search Console 註冊與地圖提交**：協助老闆在 Cloudflare DNS 完成 TXT 網域所有權驗證，並成功提交 `sitemap.xml`，引導 Google 爬蟲自動索引全站商品 OEM 網頁。
- 更新文件版本至 v1.8，標記里程碑 M5 中 `Web Analytics` 部分為 `✅ 完成`。

---

## 視覺優化方案（首頁視覺動效與互動優化）

為了使網站具有如「漢明科技」等高階行銷型網站的質感，同時不犧牲 B2B 網站極致的加載速度（SEO 關鍵），我們提出以下 **輕量化視覺動效優化方案** 供老闆審查：

### 🎬 方案 A：區塊滾動順暢淡入效果 (Scroll Animate-In)
* **效果描述**：當使用者向下捲動網頁時，產品分類卡片、介紹區塊、實力指標文字等，會平滑地從下方「向上淡入升起 (Fade In Up)」或「向右滑入 (Fade In Right)」。
* **實作技術**：使用 Next.js 最合適的輕量 `framer-motion` 元件或原生 `Intersection Observer`（效能極佳，不影響網頁評分）。

### 🖼️ 方案 B：首頁 Hero 頂部主視覺輪播與肯斯波恩斯效果 (Ken Burns Effect)
* **效果描述**：將首頁頂部靜態的單色漸層，升級為可自動平滑切換的高解析度摩托車零件/工廠實景主視覺大圖。背景圖會以極緩慢的速度自動「微微放大」，營造生動且專業的高級氛圍。
* **實作技術**：採用 CSS 3D Transforms 動畫進行硬體加速，保證在手機和電腦上滑動時完全不卡頓。

### 🔢 方案 C：實力數據動態跑動效果 (Animated Stats Counter)
* **效果描述**：在首頁增設一個「協皇實力數據牆」（例如：`創立於 1990 年代`、`外銷 20+ 國家`、`500+ 款零件車型`）。當畫面滾動到該區域時，數字會從 0 快速流暢地跳動到目標數值，加深買家的專業信賴感。

### 🖱️ 方案 D：全站微動效與互動反饋 (Micro-interactions)
* **效果描述**：
  * **導覽列 (Navbar)**：滑鼠移到首頁、產品、關於我們等連結上時，下方會有一條質感底線從「中間向兩側平滑展開」。
  * **詢價購物車**：當客戶點擊「加入詢價車」時，右上角的購物車圖示會產生一個輕微的「彈跳縮放 (Scale Bounce)」動畫，給予客戶清晰的操作回饋。
  * **按鈕特效**：全站主按鈕（如「送出詢價」）在滑鼠移上去時，會有平滑的色澤流光（Shine）或微幅縮放特效。

