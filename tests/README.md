# 測試說明

## 一次執行全部測試（建議）

```bash
bash tests/run-all.sh
```

會依序在 8 種環境情境下啟動網站並執行全部單元測試與 E2E 測試（約 5～8 分鐘），
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
node --experimental-strip-types --test 'tests/security/*.test.mts'
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
| `csp-analytics.e2e.cjs` | GA4 / Clarity 未被 CSP 擋下（S3） | 需正式環境建置，見檔案開頭說明 |
| `cookie-consent.e2e.cjs` | Cookie 同意與 Clarity 載入（S6） | 需設定測試用分析 ID，見檔案開頭說明 |
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

### 模擬 Supabase

`mock-supabase.cjs` 是測試用的假 Supabase，只實作登入、取得使用者、登出與空的資料庫回應，
讓後台權限與產品列表可以在沒有真實 Supabase 的環境下測試。範例資料：1 個分類（cylinder）、1 個子分類（std）、2 個產品。啟動：`node tests/e2e/mock-supabase.cjs`（port 54321）。

可用 `E2E_BASE_URL` 指定其他網址，例如 Vercel Preview。
