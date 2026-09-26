# 測試說明

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

### 模擬 Supabase

`mock-supabase.cjs` 是測試用的假 Supabase，只實作登入、取得使用者、登出與空的資料庫回應，
讓後台權限可以在沒有真實 Supabase 的環境下測試。啟動：`node tests/e2e/mock-supabase.cjs`（port 54321）。

可用 `E2E_BASE_URL` 指定其他網址，例如 Vercel Preview。
