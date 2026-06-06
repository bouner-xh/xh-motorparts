# motorcyclepartweb 快速預覽

## 3 分鐘快速預覽版

### 1. 進入專案根目錄
在 Terminal 執行：

`cd /Users/james/Development/WebSite/motorcyclepartweb`

如果你看到目前路徑是：

`/Users/james/Development/WebSite/motorcyclepartweb`

就代表你已經在專案根目錄。

---

### 2. 啟動新版 Next.js 預覽
在專案根目錄執行：

`npm run dev`

開啟瀏覽器：

- `http://localhost:3000/zh-TW`
- `http://localhost:3000/zh-TW/products`
- `http://localhost:3000/zh-TW/products/cylinder`
- `http://localhost:3000/zh-TW/products/cylinder/1HV-11311-00`

可快速檢查：
- 多語路由
- 產品分類頁
- 產品詳細頁
- About / Contact / Privacy
- Admin 骨架頁

---

### 3. 驗證專案可編譯
在專案根目錄執行：

`npm run build`

用途：
- 檢查 Next.js 專案是否能成功建置
- 驗證目前修改沒有破壞編譯

---

### 4. 如果想看舊版靜態站
在專案根目錄執行：

`python3 -m http.server 8000`

開啟：

- `http://localhost:8000/index.html`
- `http://localhost:8000/products.html`

---

## 如何在專案根目錄執行 `npm run build`

### 方法 A：直接切換到專案目錄
在 Terminal 執行：

`cd /Users/james/Development/WebSite/motorcyclepartweb`

再執行：

`npm run build`

### 方法 B：先確認目前位置
在 Terminal 執行：

`pwd`

如果輸出是：

`/Users/james/Development/WebSite/motorcyclepartweb`

就可以直接執行：

`npm run build`

### 成功時你會看到
- `Compiled successfully`
- `Generating static pages`
- `Route (app)`

這代表目前專案可正常建置。

---

## 目前預覽限制
- 未提供 Supabase env 時，會使用本地產品資料 fallback
- 未提供 Turnstile / Upstash / Resend 時，詢價流程為骨架模式
- 未提供 GA4 / Clarity 時，分析腳本不會啟用
- Admin 頁面目前是路由骨架，尚未接正式登入
