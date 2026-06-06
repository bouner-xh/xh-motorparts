# 外部服務接線清單與驗收指引

更新日期：2026-06-06

## 0. 本地預覽方式

快速版可直接看：`README.md`

### A. 舊版靜態站預覽
在專案根目錄執行：

`python3 -m http.server 8000`

預覽重點：
- `http://localhost:8000/index.html`
- `http://localhost:8000/products.html`

用途：
- 檢查目前舊版 HTML / CSS / 原生 JS 是否仍可運作
- 驗證舊站多語切換、分類切換、搜尋與圖片路徑

### B. 新版 Next.js 預覽
在專案根目錄執行：

`npm run dev`

預設網址：
- `http://localhost:3000`

可直接檢查的路由：
- `http://localhost:3000/zh-TW`
- `http://localhost:3000/zh-TW/products`
- `http://localhost:3000/zh-TW/products/cylinder`
- `http://localhost:3000/zh-TW/products/cylinder/1HV-11311-00`
- `http://localhost:3000/zh-TW/about`
- `http://localhost:3000/zh-TW/contact`
- `http://localhost:3000/zh-TW/legal/privacy`
- `http://localhost:3000/zh-TW/admin/login`
- `http://localhost:3000/zh-TW/admin/dashboard`
- `http://localhost:3000/api/health`

用途：
- 檢查 v1.4 遷移後的新站骨架
- 驗證多語路由、產品 permalink、Breadcrumb、Schema、Cookie Banner 與 API 骨架

### C. 本地建置驗證
在專案根目錄執行：

`npm run build`

用途：
- 驗證目前專案可成功編譯
- 交付前至少執行一次

### D. 目前本地預覽的限制
- 未提供 Supabase env 時，產品資料會 fallback 到 `src/data/products.ts`
- 未提供 Turnstile / Upstash / Resend env 時，詢價流程為骨架模式
- 未提供 GA4 / Clarity env 時，分析 script 不會啟用
- admin 頁面目前為路由骨架，尚未接正式登入驗證

## 1. 目前程式端已完成，可直接接線的功能
- Next.js 多語網站骨架（`/[locale]`）
- 產品分類頁 / 產品永久連結頁
- `robots.txt` / `sitemap.xml`
- Product JSON-LD Schema / Open Graph metadata 骨架
- Cookie Banner 骨架
- GA4 / Clarity script 骨架
- 詢價 API 骨架（Turnstile + Upstash Rate Limiting + Resend 預留）
- Supabase scaffold（無 env 時 fallback 本地資料）
- Admin 路由骨架（login / dashboard）
- Uptime health check API（`/api/health`）

---

## 2. 你需要提供的資料總表

### A. 網站與部署基本資料
| 項目 | 用途 | 範例 | 必要性 |
| --- | --- | --- | --- |
| 正式網站網域 | canonical / sitemap / GA / 寄信網域 | `https://xh-motorparts.com` | 必要 |
| GitHub repo 權限 | 設定 Actions / Secrets | repo admin | 必要 |
| Vercel 專案權限 | 正式部署 / env 設定 | team member | 必要 |

### B. Supabase
| 項目 | 用途 | 對應 env | 必要性 |
| --- | --- | --- | --- |
| Supabase Project URL | 前後端查資料 | `NEXT_PUBLIC_SUPABASE_URL` | 必要 |
| Supabase Anon Key | 前端/Server 讀取公開資料 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 必要 |
| Supabase Service Role Key | 後端管理操作（未全面啟用） | `SUPABASE_SERVICE_ROLE_KEY` | 建議 |
| PostgreSQL `DATABASE_URL` | GitHub 備份 workflow | `DATABASE_URL` | 必要 |
| Supabase Auth 設定資訊 | Admin 登入串接 | 無固定 env，需後台設定 | 下一步必要 |

### C. Cloudflare Turnstile
| 項目 | 用途 | 對應 env | 必要性 |
| --- | --- | --- | --- |
| Turnstile Site Key | 前端驗證元件 | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | 詢價正式啟用必要 |
| Turnstile Secret Key | 後端驗證 token | `TURNSTILE_SECRET_KEY` | 詢價正式啟用必要 |

### D. Upstash Redis
| 項目 | 用途 | 對應 env | 必要性 |
| --- | --- | --- | --- |
| Redis REST URL | Rate limiting | `UPSTASH_REDIS_REST_URL` | 詢價正式啟用必要 |
| Redis REST Token | Rate limiting | `UPSTASH_REDIS_REST_TOKEN` | 詢價正式啟用必要 |

### E. Resend
| 項目 | 用途 | 對應 env | 必要性 |
| --- | --- | --- | --- |
| Resend API Key | 發送詢價通知/自動回覆 | `RESEND_API_KEY` | 詢價正式寄信必要 |
| 寄件信箱 | 寄信來源 | `RESEND_FROM_EMAIL` | 必要 |
| 管理者收信信箱 | 收到詢價通知 | `RESEND_ADMIN_EMAIL` | 必要 |

### F. Analytics / Observability
| 項目 | 用途 | 對應 env | 必要性 |
| --- | --- | --- | --- |
| GA4 Measurement ID | 流量分析 | `NEXT_PUBLIC_GA4_MEASUREMENT_ID` | 建議 |
| Clarity Project ID | 行為錄影 / 熱圖 | `NEXT_PUBLIC_CLARITY_PROJECT_ID` | 建議 |
| Sentry DSN | 錯誤監控 | `NEXT_PUBLIC_SENTRY_DSN` | 建議 |
| Sentry Auth Token | source map 上傳 | `SENTRY_AUTH_TOKEN` | 建議 |

### G. 圖片 / 儲存
| 項目 | 用途 | 對應 env | 必要性 |
| --- | --- | --- | --- |
| Cloudflare R2 Account ID | 圖片儲存 | `CF_ACCOUNT_ID` | 圖片上雲必要 |
| R2 Access Key ID | 圖片上傳 | `R2_ACCESS_KEY_ID` | 圖片上雲必要 |
| R2 Secret Access Key | 圖片上傳 | `R2_SECRET_ACCESS_KEY` | 圖片上雲必要 |
| R2 Bucket Name | 圖片 bucket | `R2_BUCKET_NAME` | 圖片上雲必要 |
| R2 Public URL | 前端圖片網址 | `R2_PUBLIC_URL` | 圖片上雲必要 |

### H. 其他
| 項目 | 用途 | 對應 env | 必要性 |
| --- | --- | --- | --- |
| LINE Notify Token | 新詢價推播 | `LINE_NOTIFY_TOKEN` | 可選 |
| 公司正式名稱（中/英） | 頁面文案 / SEO / 寄件資訊 | 文字資料 | 建議 |
| 公司地址 / 電話 / Email | contact / privacy / inquiry | 文字資料 | 必要 |

---

## 3. 建議你一次提供的文字資料

### 公司基本資料
- 公司中文全名
- 公司英文全名
- 公司地址
- 公司電話
- 公司 Email
- 公司簡介（繁中為主）
- 主要出口市場 / 服務區域
- 是否有 OEM / ISO / 認證資訊

### 法遵與商業頁資料
- 隱私政策正式文案
- Cookie 使用說明
- Google Analytics / Clarity 使用聲明
- 是否要放 Google Maps
- `About Us` 內容
- `Contact` 營業時間

### 產品資料補充
- 是否沿用目前所有舊站圖片
- 是否已有正式產品封面圖
- 哪些產品需要優先上架至 Supabase
- 英文正式產品名稱是否要沿用目前暫定值

---

## 4. 要填到哪裡

### `.env.local` / Vercel Environment Variables
請依 [/.env.example](../.env.example) 填入：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `CF_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_URL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_ADMIN_EMAIL`
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_SITE_NAME`
- `LINE_NOTIFY_TOKEN`

### GitHub Secrets
至少先補：
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

如要擴充 CI/CD：
- `SENTRY_AUTH_TOKEN`
- 其他部署期必要 secrets

---

## 5. 每個功能如何驗收

### 5.1 Supabase 產品資料
**你要提供**
- Supabase URL / Anon Key / Database URL
- `categories`、`products` 資料表是否已建立

**驗收方式**
1. 設定 env 後重新部署。
2. 在首頁與產品頁檢查資料是否來自 Supabase，而不是本地 fallback。
3. 暫時修改一筆 Supabase 產品名稱，刷新頁面確認有變更。
4. 檢查產品詳細頁仍可正常開啟。

### 5.2 產品永久連結 + SEO
**你要提供**
- 正式網域
- 正式產品名稱 / 描述（如要修正）

**驗收方式**
1. 打開產品頁，例如 `/{locale}/products/cylinder/1HV-11311-00`。
2. 查看頁面 `<title>`、description、canonical 是否正確。
3. 用瀏覽器檢查頁面原始碼，確認有 JSON-LD Product Schema。
4. 打開 `/sitemap.xml`，確認有產品 URL。

### 5.3 Cookie Banner + GA4 / Clarity
**你要提供**
- `NEXT_PUBLIC_GA4_MEASUREMENT_ID`
- `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- 最終隱私政策文案

**驗收方式**
1. 清除瀏覽器 cookie / localStorage。
2. 首次進站應顯示 Cookie Banner。
3. 按「接受」後，`localStorage` 應記錄 consent 狀態。
4. GA4 DebugView / Clarity 後台應看到資料進站。
5. 按「拒絕」時，不應送出 analytics consent granted。

### 5.4 詢價 API + Turnstile + Rate Limiting + Resend
**你要提供**
- Turnstile site/secret key
- Upstash URL/token
- Resend API key
- 寄件信箱 / 管理員收件信箱

**驗收方式**
1. 在產品詳細頁填寫詢價表單。
2. 未通過 Turnstile 時應送出失敗。
3. 同 IP 短時間重複提交超過限制時應回 `429`。
4. 成功送出後，API 應回成功訊息。
5. 接上 Resend 後，管理員信箱應收到通知。

### 5.5 Admin Login / Dashboard
**你要提供**
- Supabase Auth 專案設定
- Admin 帳號 email
- 是否要單一 admin 或多角色

**驗收方式**
1. 進入 `/{locale}/admin/login`。
2. 完成登入流程後，應能進到 dashboard。
3. 未登入直接進 dashboard 時應被導回 login（此步驟尚待正式 auth 接線）。
4. dashboard 後續要能看到產品管理 / 詢價管理卡片或資料。

### 5.6 Uptime / Health Check
**你要提供**
- 正式網域
- UptimeRobot 帳號

**驗收方式**
1. 打開 `/api/health`。
2. 應回傳 JSON。
3. 在 UptimeRobot 建立監控後，狀態應為 up。

### 5.7 GitHub Actions / 備份
**你要提供**
- GitHub Secrets
- `DATABASE_URL`

**驗收方式**
1. 到 GitHub Actions 手動執行 backup workflow。
2. 應產出 `.dump` artifact。
3. PR 時 CI workflow 應能正常跑完。

---

## 6. 建議提供順序（最省時間）
1. 正式網域
2. Supabase：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`DATABASE_URL`
3. Turnstile：site key + secret key
4. Upstash：URL + token
5. Resend：API key + from/admin email
6. GA4 / Clarity ID
7. 公司正式文案（About / Contact / Privacy）
8. 圖片上雲資訊（R2）

---

## 7. 目前仍屬骨架模式的項目
以下功能已寫好程式結構，但尚未因缺少正式外部資料而完全啟用：
- Supabase 真實資料來源
- Admin 真實登入保護
- 詢價正式寄信
- Rate limiting 正式生效
- Turnstile 正式驗證
- GA4 / Clarity 正式資料寫入
- R2 圖片正式網址替換

---

## 8. 你下一次回覆最有效的格式
你可以直接照下面格式貼給我：

```text
正式網域：
NEXT_PUBLIC_BASE_URL=

Supabase：
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
DATABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

Turnstile：
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

Upstash：
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

Resend：
RESEND_API_KEY=
RESEND_FROM_EMAIL=
RESEND_ADMIN_EMAIL=

Analytics：
NEXT_PUBLIC_GA4_MEASUREMENT_ID=
NEXT_PUBLIC_CLARITY_PROJECT_ID=
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

R2：
CF_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

公司資料：
中文公司名=
英文公司名=
地址=
電話=
Email=
About 文案=
Privacy 文案=
```

提供後，我就可以接著把骨架切成正式可用版本。
