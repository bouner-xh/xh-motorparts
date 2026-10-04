# 測試說明

## 一次執行全部測試（建議）

```bash
bash tests/run-all.sh
```

會依序在 9 種環境情境下啟動網站並執行全部單元測試與 E2E 測試（約 5～8 分鐘），
最後顯示「✅ 全部測試通過」或列出失敗的項目。每次修改後、合併進 master 前都應執行一次。

## 部署後檢查正式網站（唯讀）

```bash
E2E_BASE_URL=https://www.xh-motorparts.com NODE_PATH=$(npm root -g) node tests/e2e/production-check.e2e.cjs
```

自動找出一個真實產品，檢查產品卡片加入詢價（只存在瀏覽器）、預設圖、語系切換、每頁 H1、簡中文字與 CSP。
**不送詢價、不登入後台，不會寫入任何資料。** 也可以用同樣方式對正式網站執行 `site-smoke`、`admin-login`、
`text-contrast`、`no-nested-interactive`、`home-hero-responsive`、`canonical-url`（這些都是唯讀）。

在 Claude 的雲端工作環境執行時，需要：(1) 環境的 Network access 允許 `xh-motorparts.com`、`www.xh-motorparts.com`；
(2) 讓測試瀏覽器信任工作環境的代理憑證：
`certutil -A -d sql:$HOME/.pki/nssdb -n ccr-agent-proxy -t "C,," -i /root/.ccr/agent-proxy-ca.crt`
（`certutil` 來自系統套件 `libnss3-tools`）。產品照片存放在 Supabase，若網路未允許該網域會無法載入，屬檢查環境限制。

## 單元測試（tests/security）

使用 Node 內建測試工具，不需要額外套件（Node 22 以上）：

```bash
node --experimental-strip-types --test 'tests/security/*.test.mts' 'tests/admin/*.test.mts'
```

## E2E 測試（tests/e2e）

使用 Playwright 模擬真實使用者操作。目前 Playwright 未加入專案依賴，使用全域安裝版本：

```bash
npm install -g playwright   # 若尚未安裝
npx playwright install chromium
```

先啟動網站（port 3100），再執行測試：

```bash
NODE_PATH=$(npm root -g) node tests/e2e/<檔名>.e2e.cjs
```

| 檔案 | 驗證內容 | 啟動網站的方式 |
|---|---|---|
| `inquiry-flow.e2e.cjs` | 詢價單可正常送出（S1） | `npx next dev -p 3100`（須為開發模式，見 S4） |
| `inquiry-protection.e2e.cjs` | 正式環境缺防護設定時停止收單（S4） | 需正式環境建置，見檔案開頭說明 |
| `canonical-url.e2e.cjs` | 正式網址統一為 www（C4） | `npx next dev -p 3100` |
| `site-smoke.e2e.cjs` | 主要頁面與本站資源皆能載入 | 開發或正式環境皆可 |
| `inquiry-save-failure.e2e.cjs` | 資料庫故障時不可顯示成功（S5） | 需模擬資料庫故障，見檔案開頭說明 |
| `inquiry-ratelimit-down.e2e.cjs` | 流量限制服務（Upstash）連不上時詢價照常送出 | 需模擬 Supabase 與無法連線的 Upstash 位址，見檔案開頭說明 |
| `inquiry-limits.e2e.cjs` | 詢價欄位上限、品項名稱以資料庫為準（R3） | 需模擬 Supabase 與模擬 Resend，見檔案開頭說明 |
| `inquiry-confirmation-email.e2e.cjs` | 客戶確認信不回顯需求說明，通知信保留全文 | 需模擬 Supabase 與模擬 Resend，見檔案開頭說明 |
| `cron-keepalive.e2e.cjs` | 每日排程保持 Upstash 與 Supabase 運作：密碼檢查、各服務讀寫、故障回報 | 需模擬 Supabase（內含模擬 Upstash）與 `CRON_SECRET`，見檔案開頭說明 |
| `csp-analytics.e2e.cjs` | GA4 / Clarity 未被 CSP 擋下（S3） | 需正式環境建置，見檔案開頭說明 |
| `cookie-consent.e2e.cjs` | Cookie 同意與 Clarity 載入、頁尾「Cookie 設定」撤回同意（S6） | 需設定測試用分析 ID，見檔案開頭說明 |
| `admin-login.e2e.cjs` | 登入頁無後門、跳轉路徑驗證（S0 / S7） | `npx next dev -p 3100` |
| `admin-upload.e2e.cjs` | 未登入無法上傳圖片（S8） | `npx next dev -p 3100` |
| `admin-access.e2e.cjs` | 只有名單內帳號能進後台（S2） | 需先啟動模擬 Supabase，見檔案開頭說明 |
| `admin-access-no-list.e2e.cjs` | 未設定名單時一律拒絕（S2） | 同上，但不設定 `ADMIN_EMAILS` |
| `product-card-inquiry.e2e.cjs` | 產品卡片直接加入詢價、預設圖（D1） | 模擬 Supabase |
| `home-hero-responsive.e2e.cjs` | 首頁 Hero 手機內距（D5） | `npx next dev -p 3100` |
| `language-switch.e2e.cjs` | 切換語系停留同一頁（D6） | 模擬 Supabase |
| `locale-text.e2e.cjs` | 簡中無繁體字、英文無中文（D7） | 模擬 Supabase |
| `text-contrast.e2e.cjs` | 小字對比 4.5:1（D8） | `npx next dev -p 3100` |
| `page-h1.e2e.cjs` | 每頁一個 H1 且為主標題（D10） | 模擬 Supabase |
| `no-nested-interactive.e2e.cjs` | 連結內不包按鈕（D11） | `npx next dev -p 3100` |
| `contact-email.e2e.cjs` | 對外聯絡信箱為 sales@（S9） | `npx next dev -p 3100`（唯讀，也可對正式網站執行） |
| `home-section-order.e2e.cjs` | 首頁區塊順序、產品分類提前、內容不減少（D3） | `npx next dev -p 3100` |
| `mobile-menu.e2e.cjs` | 手機 ☰ 選單、桌機導覽列不變（D4） | `npx next dev -p 3100` |
| `home-hero-cta.e2e.cjs` | 首頁主按鈕聚焦、聯絡資訊在按鈕下方（D2） | `npx next dev -p 3100`（唯讀，也可對正式網站執行） |
| `no-emoji-icons.e2e.cjs` | 畫面無 emoji、改用線條圖示（D9） | `npx next dev -p 3100`（唯讀，也可對正式網站執行） |
| `inquiry-mobile-cards.e2e.cjs` | 手機版詢價清單卡片、按鈕 44px、不需左右捲動（D12） | `npx next dev -p 3100` |
| `hreflang.e2e.cjs` | 每個公開頁面的 canonical 指向自己、有三語 hreflang 與 x-default（D14） | 模擬 Supabase（產品頁需要資料） |
| `admin-product-form.e2e.cjs` | 產品表單不預填測試資料、預設不上架、沒有偵錯工具；手動新增可儲存（A2） | 模擬 Supabase |
| `admin-product-category.e2e.cjs` | 連續新增保留分類、切換大分類清空子分類、API 拒絕分類不符（A3） | 模擬 Supabase |
| `admin-product-import.e2e.cjs` | Excel＋ZIP 匯入、保留翻譯、FALSE 不上架、錯誤列表、120 筆分 3 批、範例檔（A1、A4） | 模擬 Supabase |
| `admin-delete.e2e.cjs` | 有產品的分類不能刪除並說明原因、刪除大分類提示子分類、換圖與刪除產品後清除圖檔（A5） | 模擬 Supabase |
| `admin-inquiries.e2e.cjs` | 詢價狀態篩選與筆數、搜尋（含型號）、分頁、Esc 關閉、最後更新時間（A6） | 模擬 Supabase |
| `admin-product-list.e2e.cjs` | 產品搜尋篩選分頁縮圖、正在編輯與取消、複製、未存檔圖片清除（A7） | 模擬 Supabase |
| `admin-api-errors.e2e.cjs` | 錯誤訊息為中文說明、長度與 ID 檢查、不自動建立分類（A9） | 模擬 Supabase |
| `admin-dashboard-tabs.e2e.cjs` | 後台分頁與總覽、網址記住分頁、鍵盤操作、切換不遺失表單、待處理數量同步、手機版、登出（A8） | 模擬 Supabase |
| `product-detail-cta.e2e.cjs` | 產品頁不用捲動就看得到「加入詢價清單」、照片 1:1（D15） | 模擬 Supabase |
| `admin-inquiry-export.e2e.cjs` | 詢價匯出 CSV：篩選結果、每個品項一列、BOM、防公式注入、未登入 401（A6 ①） | 模擬 Supabase |
| `admin-customers.e2e.cjs` | 客戶列表：次數、排序、國家、型號搜尋、詳情、與詢價分頁互相跳轉、匯出（A6 ②） | 模擬 Supabase |
| `admin-inquiry-events.e2e.cjs` | 詢價處理紀錄：操作人與前後值、沒有改變不記錄、刪除後保留、資料表不存在時照常運作（A6 ③） | 模擬 Supabase |
| `admin-inquiry-reply.e2e.cjs` | 後台回覆客戶：範本、未填提示不能寄、PDF 附件、狀態與紀錄、寄信失敗（A6 ④） | 模擬 Supabase＋模擬 Resend（`RESEND_API_URL`，見檔案開頭） |

### 模擬 Supabase

`mock-supabase.cjs` 是測試用的假 Supabase，只實作登入、取得使用者、登出與空的資料庫回應，
讓後台權限與產品列表可以在沒有真實 Supabase 的環境下測試。範例資料：1 個分類（cylinder）、1 個子分類（std）、2 個產品。啟動：`node tests/e2e/mock-supabase.cjs`（port 54321）。

可用 `E2E_BASE_URL` 指定其他網址，例如 Vercel Preview。

### 模擬 Supabase（`tests/e2e/mock-supabase.cjs`）

可讀寫的模擬資料庫與 Storage，後台測試都用它。外鍵與唯一值規則對照 `doc/SUPABASE_INIT_SQL.md`。
測試輔助端點：`POST /__mock/reset`（重設為範例資料）、`GET /__mock/state`（查看資料與已上傳檔案）、`POST /__mock/seed`（加入資料）。

後台改為分頁後，登入預設在「總覽」；測試要操作某個功能前，先用 `helpers.cjs` 的 `openAdminTab(page, '產品')` 切換分頁。
