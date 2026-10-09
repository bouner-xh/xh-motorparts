# 變更紀錄（CHANGELOG）

記錄每一次修改：改了什麼、改了哪些檔案、依賴哪些設定、怎麼確認正常、出問題時怎麼還原。
**網站出現異常時，先從這裡找最近的相關修改。** 目前進度與待辦事項請看 `docs/PROGRESS.md`。

- 編號對照 2026-09-25 網站健檢報告：S = 資安、C = 網站設定與營運、D = 使用者體驗
- 還原方式：在 GitHub 找到對應 PR → 按 **Revert** 開一個還原 PR → 合併後 Vercel 會自動重新部署
- 驗證方式：`bash tests/run-all.sh`（見 `tests/README.md`）

---

## 目前必要的環境設定（Vercel 正式專案 `xh-motorparts-uhan`）

| 變數 | 用途 | 缺少時會怎樣 | 相關修改 |
|---|---|---|---|
| `ADMIN_EMAILS` | 後台管理員名單（逗號分隔） | **所有人都無法進後台** | S2 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`、`TURNSTILE_SECRET_KEY` | 詢價表單機器人驗證 | **正式環境停止收詢價單（503）** | S4 |
| `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN` | 詢價表單流量限制 | **未設定：正式環境停止收詢價單（503）**；已設定但連不上：略過流量限制照常收單並記錄錯誤（第十五批） | S4 |
| `NEXT_PUBLIC_BASE_URL`（2026-09-27 已刪除，不需設定） | 正式網址（canonical、sitemap） | 使用程式預設值 `https://www.xh-motorparts.com`；若要設定，類型不可選 Secret | C4 |
| `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY` | 資料庫與登入 | 產品改用內建資料、後台無法使用 | — |
| `RESEND_API_KEY`、`RESEND_FROM_EMAIL`（格式：`協皇企業 Xie Huang Enterprise <sales@xh-motorparts.com>`）、`RESEND_ADMIN_EMAIL` | 詢價通知信、確認信、後台回覆 | 不寄信；資料庫也失敗時詢價回報失敗 | S1、S5 |
| `CRON_SECRET` | 每日排程保持 Upstash 運作（Vercel 排程自動帶上） | 排程回報 503、Upstash 可能在 14 天沒有詢價後被刪除 | 第十六批 |

修改環境變數後需要到 Vercel → Deployments → 最新部署 → **Redeploy** 才會生效。

---

## 2026-10-09（第三十六批）：刪除沒作用的 middleware、產品網址不分大小寫

| 項目 | 內容 | 主要檔案 | 測試 |
|---|---|---|---|
| L5 | 刪除專案根目錄不會被載入的 `middleware.ts` 與只有它使用的 `getSupabaseMiddlewareAuthClient`；網站行為不變 | `middleware.ts`（刪除）、`src/lib/supabase/server.ts` | `tests/security/middleware-location.test.mts` |
| L7 | 分類、子分類、型號大小寫寫錯時，頁面找不到資料就比對不分大小寫的正確網址並 308 轉址（保留語系）；找不到仍 404 | `src/lib/canonical-path.ts`（新）、`catalog-service.ts` 的 `resolveCanonicalProductPath`、三個產品頁 | `canonical-path.test.mts`、`product-url-case.e2e.cjs` |

- 不改資料庫、API，不新增套件。還原：Revert 對應 PR。
- 備註：兩項改動在同一個 commit（`649d54c`）。

---

## 2026-10-09（第三十五批）：分類卡片封面不再破圖

| 項目 | 內容 | 主要檔案 | 測試 |
|---|---|---|---|
| L6 | 備用圖路徑改為實際存在的 `/legacy-assets/no-image.jpg`；封面順序改為「已挑好的封面 → 該分類第一個已上架且有照片的產品的照片 → 預設圖」；`clutch-housing` 使用離合器封面；`getCategorySummaries` 多回傳 `coverImage` | `src/lib/assets.ts`、`src/lib/catalog-service.ts`、`[locale]/page.tsx`、`[locale]/products/page.tsx` | `category-covers.e2e.cjs` |

- 不改資料庫結構，不新增套件。還原：Revert 對應 PR。

---

## 2026-10-09（第三十四批）：產品名稱以英文為主（P5）

| 項目 | 內容 | 主要檔案 | 測試 |
|---|---|---|---|
| P5 | 英文名稱必填，繁中、簡中選填；資料庫只存有填的語言（API 行為變更：原本三語都必填）；沒填時前台退回英文；後台表單英文欄位排第一並加提示；列表在沒有繁中時顯示英文名稱；批量匯入優先採用英文名稱 | `api/admin/products/route.ts`、`AdminProductManager.tsx`、`src/lib/product-form.ts`、`src/lib/product-import.ts` | `admin-product-names.e2e.cjs`、`product-form.test.mts` |

- 不改資料庫結構，不新增套件。還原：Revert 對應 PR。

---

## 2026-10-09（第三十三批）：sitemap 英文優先

| 項目 | 內容 | 主要檔案 | 測試 |
|---|---|---|---|
| L4 | 英文排最前；每個網址附 en／zh-TW／zh-CN／x-default 對應頁；移除每次都是「現在」的 lastmod 與 changefreq | `src/app/sitemap.ts` | `sitemap-languages.e2e.cjs`、`product-urls`、`category-slug-spaces` |

- 不改資料庫、API，不新增套件。還原：Revert 對應 PR。

---

## 2026-10-09（第三十二批）：每頁 html lang 與網址語系一致

| 項目 | 內容 | 主要檔案 | 測試 |
|---|---|---|---|
| L2 | `<html lang>` 改由 `[locale]/layout` 輸出，英文頁不再是 `zh-TW`；移除 `src/app/layout.tsx` 與 `src/app/page.tsx`；根網址轉 `/en` 改放 `next.config.ts` 的 `redirects()`（307）；預設 `description` 移到 `[locale]/layout` | `src/app/[locale]/layout.tsx`、`next.config.ts` | `html-lang.e2e.cjs`、`root-redirect.e2e.cjs` |

- 發現：專案根目錄的 `middleware.ts` 不會被載入（程式在 `src/` 底下，Next 只認 `src/middleware.ts`），所以語言偵測從未運作；這次不啟用，列為 PROGRESS 的 L5 待決定。
- 不改資料庫、API，不新增套件。還原：Revert 對應 PR。

---

## 2026-10-09（第三十、三十一批）：英文與中文文案

| 項目 | 內容 | 主要檔案 | 測試 |
|---|---|---|---|
| 聯絡頁 | 國際電話 +886 930 797 299、WhatsApp、營業時間標示台灣時間 GMT+8、工作日 24 小時內回覆、訂購資訊七項（MOQ、交期、付款、貿易條件與台中港、包裝、檢驗、保固退換） | `src/lib/site-content.ts`、`contact/page.tsx`、`messages/*.json`、`Footer.tsx` | `international-copy.e2e.cjs` |
| 關於我們 | 換成實際資訊（1990 年、台中、摩托車內部零組件、OEM／ODM、全球）；移除「新版網站正在重建」等開發中文字；統計列改為 1990／Worldwide／OEM-ODM | `site-content.ts` | 同上 |
| 隱私政策 | 資料保存期限三語統一：處理詢價與商業往來所需期間內保存，依要求刪除；更新日期 2026 年 10 月 | `src/lib/privacy-content.ts` | 同上 |
| 詢價頁 | 驗證服務提示改為「暫時無法使用，請稍後再試或寄信到 sales@」 | `messages/*.json` | — |
| 首頁品類 | 標題與副標題不寫死數量與品項（原寫「9 大品類」「密封件到電氣線材」） | `site-content.ts` | `international-copy.e2e.cjs`、`home-section-order.e2e.cjs` |

- 不改資料庫、API，不新增套件。還原：Revert 對應 PR（#35 與下一個）。
- 測試提醒：`home-section-order` 要在無資料庫模式（run-all 第 2 組）執行，用模擬資料庫會誤報「9 個產品分類」失敗。

---

## 2026-10-09（第二十九批）：網站預設英文

| 項目 | 內容 | 主要檔案 | 測試 |
|---|---|---|---|
| L1 | 根網址一律轉 `/en`（不看瀏覽器語言、不使用 cookie）；預設語系改英文；`localized()` 與產品名稱缺漏時退回英文；語言切換列順序 EN、繁中、简中；備用的繁中預設值改英文 | `src/app/page.tsx`、`src/i18n/routing.ts`、`src/lib/localized-text.ts`、`src/lib/catalog-service.ts`、`LanguageLinks.tsx`、`sitemap.ts`、詢價頁與表單 | `tests/admin/localized-text.test.mts`、`root-redirect.e2e.cjs` |

- 不改資料庫、API，不新增套件。`/zh-TW`、`/zh-CN` 網址不變。還原：Revert 對應 PR。

---

## 2026-10-09（第二十八批）：移除圖片、沒有圖片時上架提醒

| 項目 | 內容 | 主要檔案 | 測試 |
|---|---|---|---|
| U7 | 表單加「移除圖片」；產品更新 API 的圖片網址留空時，刪除該產品的圖片紀錄與沒有其他產品使用的圖檔（API 行為變更：原本留空是不處理） | `AdminProductManager.tsx`、`api/admin/products/route.ts` | `admin-product-update.e2e.cjs` |
| U8 | 上架時沒有圖片先提醒（表單與列表按鈕）；已上架產品重複編輯不提醒 | `AdminProductManager.tsx` | `admin-product-update.e2e.cjs` |

- 不改資料庫結構，不新增套件。還原：Revert 對應 PR。

---

## 2026-10-09（第二十七批）：後台分類代號自動轉換、更新產品改善

| 項目 | 內容 | 主要檔案 | 測試 |
|---|---|---|---|
| 分類代號 | 輸入時離開欄位自動轉小寫加連字號（`Clutch Housing` → `clutch-housing`）；API 儲存前也轉換；沒有任何英數字的代號擋下並說明。子分類的「上層分類」欄位不轉換 | `src/lib/slug.ts`（新）、`AdminCategoryManager.tsx`、`AdminSubCategoryManager.tsx`、`api/admin/categories`、`api/admin/sub-categories` | `tests/admin/slug.test.mts`、`admin-slug.e2e.cjs` |
| U1 | 更新不存在的產品回 404 | `api/admin/products/route.ts` | `admin-product-update.e2e.cjs` |
| U2 | 庫存上限 1,000,000 | `product-form.ts`、`api/admin/products`、`api/admin/products/batch` | `product-form.test.mts`、`admin-product-update`、`admin-product-input` |
| U3–U6 | 改型號確認、未儲存內容確認、刪除確認寫出型號、列表上架／下架 | `AdminProductManager.tsx` | `admin-product-update.e2e.cjs` |

- 不改資料庫結構，不新增套件。API 變更：分類 API 的 `slug` 儲存前會被轉成標準格式；產品 PUT 對不存在的產品改回 404、庫存超過上限回 400。
- 還原：Revert 對應 PR。

---

## 2026-10-06（第二十六批）：產品頁標題與描述、robots.txt（SEO 調整）

PR：[#31](https://github.com/bouner-xh/xh-motorparts/pull/31)（2026-10-06 正式站確認標題、描述與 robots.txt 已更新）

**原因：** 老闆希望在 Google 搜尋「DT125 counter shaft」找得到網站。檢查產品頁：標題為「型號 | 品名」，沒有分類與公司名；描述只有「型號 品名，規格」，英文頁出現中文逗號；robots.txt 封鎖 `/_next/`（網站的樣式與程式），Google 無法完整判斷網頁在手機上的呈現。

**修改：**
- `src/lib/product-seo.ts`（新增）：產品頁標題「品名 型號 | 分類 | 公司名」，例如 `DT125 COUNTER SHAFT 2A6-17421-00 | Transmission | Xie Huang Motorcycle Parts`；描述依語言寫成完整句子（品名、型號、分類、規格、台灣製造商、可線上詢價）；名稱與型號相同時只出現一次
- 產品頁 metadata 與分享預覽（og:title、og:description）使用上面的標題與描述
- `src/app/robots.ts`：不再封鎖 `/_next/`；後台與 API 仍封鎖
- 新增 `docs/google-search-console.md`：Google Search Console 設定步驟（只需設定一次）

**測試：** 單元 `tests/admin/product-seo.test.mts`；E2E `tests/e2e/product-seo.e2e.cjs`（英文、繁中標題與描述、og:title、robots.txt）。舊版執行失敗。

**還原：** Revert 本批 PR。

---

## 2026-10-06（第二十五批）：分類代號含空白時分類頁 404

PR：[#30](https://github.com/bouner-xh/xh-motorparts/pull/30)

**事件：** 老闆回報產品目錄點「離合器系列」「變速鼓撥叉」等分類出現 404。正式站唯讀檢查：分類代號含空白的 `CLUTCH HOUSING`、`DRUM FORK`、`SARTER MOTOR` 三個分類頁都是 404；`Transmission`、`sprocket` 正常。

**原因：** 分類頁沒有把網址中的分類代號解碼（`CLUTCH%20HOUSING` 沒有還原成 `CLUTCH HOUSING`），用編碼過的字串去資料庫找分類，找不到就顯示 404。子分類、型號原本就有解碼，所以只有分類受影響；各處組網址時分類代號也沒有編碼。

**修改：**
- `src/lib/url-segment.ts`（新增）：網址片段的編碼與解碼
- 分類、子分類、產品三個頁面讀取分類代號時先解碼
- 首頁、產品目錄、側欄、麵包屑、搜尋結果、sitemap、結構化資料組網址時，分類代號一律編碼

**測試：** E2E `tests/e2e/category-slug-spaces.e2e.cjs`（代號 `CLUTCH HOUSING` 的分類 → 子分類 → 產品都能開啟、麵包屑連結、sitemap 中 9 個網址都能開啟）。舊版執行失敗（與正式站相同）。

**建議：** 分類代號用英文小寫加連字號（例如 `clutch-housing`），網址比較乾淨；`SARTER MOTOR` 應為 `STARTER MOTOR`。修改代號會改變網址，舊連結會失效。

**上線紀錄：** 合併當下因程式庫為私有，Vercel 擋下部署；改回公開後重新部署上線（2026-10-06）。

**還原：** Revert 本批 PR。

---

## 2026-10-04（第二十四批）：sitemap 與結構化資料的產品網址（產品上架檢查 P10）

PR：[#29](https://github.com/bouner-xh/xh-motorparts/pull/29)

**原因：** 實際產品網址是 `/products/大分類/子分類/型號`，但 sitemap 與產品結構化資料（JSON-LD）用的是 `/products/大分類/型號`，少了子分類。
正式站唯讀檢查確認 sitemap 列出的產品網址（例如 `/zh-TW/products/cylinder/TEST-337980`）都是 **404**，Google 收錄不到產品頁。

**修改：**
- `src/lib/catalog-service.ts`：`getCatalogProducts` 一併取出子分類代號（`subCategory`）
- `src/app/sitemap.ts`：產品網址加上子分類；沒有子分類的產品沒有產品頁，不列入
- `src/components/products/ProductSchema.tsx`：結構化資料的產品網址加上子分類，與頁面網址相同

**測試：** E2E `tests/e2e/product-urls.e2e.cjs`（sitemap 的每個產品網址都能打開、網址含子分類、結構化資料網址與頁面相同）。舊版執行失敗。

**上線後：** 可到 Google Search Console 重新提交 sitemap（`https://www.xh-motorparts.com/sitemap.xml`），加快重新收錄。

**還原：** Revert 本批 PR。

---

## 2026-10-04（第二十三批）：前台產品搜尋（產品上架檢查 P2）

PR：[#28](https://github.com/bouner-xh/xh-motorparts/pull/28)

**原因：** 買家多半拿料號來找產品，原本只能一層層點分類。

**修改：**
- `src/lib/product-search.ts`（新增）：比對與排序。料號忽略大小寫、空白、`- _ . /`；三種語言的名稱與規格也能搜；多個關鍵字都要符合；型號完全相同 > 開頭相同 > 包含 > 名稱 > 規格；最多 60 筆；關鍵字最長 100 字
- `src/lib/catalog-service.ts`：`searchCatalogProducts` 只搜尋已上架產品，帶出子分類代號以連到正確的產品頁
- 新頁面 `/[locale]/products/search?q=`：搜尋結果（不給搜尋引擎收錄）；查無結果時提示換關鍵字或寄料號到 sales@
- `ProductSearchForm`：產品目錄、大分類、子分類頁的側欄最上方都有搜尋框（一般表單，不需要 JavaScript）；三語文字在 `messages/*.json`

**測試：** 單元 `tests/admin/product-search.test.mts`；E2E `tests/e2e/product-search.e2e.cjs`（料號不分大小寫與連字號、點結果進入產品頁、名稱與規格搜尋、未上架搜不到、查無結果、英文頁、手機版沒有橫向捲動）。舊版執行失敗。

**還原：** Revert 本批 PR。

---

## 2026-10-04（第二十二批）：產品頁改顯示「現貨／接單生產」（產品上架檢查 P3）

PR：[#27](https://github.com/bouner-xh/xh-motorparts/pull/27)

**原因：** 產品頁公開顯示精確庫存數字（例如「庫存：20」），同業看得到；顯示 0 時買家可能以為不能下單。老闆 2026-10-04 決定改顯示供貨狀態。

**修改：**
- 產品頁 `.../[modelNumber]/page.tsx`：「庫存：數字」改為「供貨狀態：現貨」（庫存大於 0）或「供貨狀態：接單生產」（庫存為 0）；三語文字在 `messages/*.json`（`availability`、`inStock`、`madeToOrder`）
- 結構化資料 `ProductSchema.tsx`：庫存為 0 時由 `OutOfStock`（缺貨）改為 `MadeToOrder`（接單生產），Google 不會把產品標成缺貨
- 後台仍顯示精確庫存，方便內部管理

**測試：** E2E `tests/e2e/product-availability.e2e.cjs`（繁中、簡中、英文頁的文字，頁面沒有「庫存」，結構化資料）。舊版執行失敗。

**還原：** Revert 本批 PR。

---

## 2026-10-04（第二十一批）：產品表單好用度（產品上架檢查 P4、P6、P7）

PR：[#26](https://github.com/bouner-xh/xh-motorparts/pull/26)

**修改：**
- P4 規格分隔：`src/lib/product-form.ts`（新增）`splitSpecifications`，產品表單的規格可用半形逗號、全形逗號「，」、頓號「、」、分號分隔（原本只認半形逗號，打「，」會變成一整個標籤）
- P6 錯誤訊息：
  - 送出前檢查庫存必須是 0 以上的整數（原本送到伺服器才回「格式不正確」）
  - 產品 API 欄位錯誤改為指出欄位，例如「請修正：型號太長（最多 100 字）」
  - 型號重複改為「型號「XXX」已經存在，請換一個型號，或到下方列表編輯原本的產品」（原本提到 slug）
- P7 用語：產品、大分類、子分類的標題去掉「CRUD（zh-TW）」改為「產品管理」「大分類管理」「子分類管理」；「圖片路徑 / URL」欄位收進「進階：手動指定圖片網址」，並說明其他網站的圖片無法在前台顯示

**測試：** 單元 `tests/admin/product-form.test.mts`；E2E `tests/e2e/admin-product-input.e2e.cjs`。舊版三項都失敗。
`admin-api-errors`、`admin-product-category` 兩支既有測試改為檢查新的、更具體的訊息。

**還原：** Revert 本批 PR。

---

## 2026-10-04（第二十批）：產品照片上傳前自動縮圖（產品上架檢查 P1）

PR：[#25](https://github.com/bouner-xh/xh-motorparts/pull/25)

**原因：** 前台產品圖片設定為不經伺服器壓縮（`unoptimized`），上傳的原檔會直接傳給買家。手機照片常有 3–7 MB，一頁 20 個產品可能數十 MB，手機與海外瀏覽很慢，也耗用 Supabase 流量。

**修改：**
- `src/lib/image-resize.ts`（新增）：在瀏覽器用 canvas 把照片長邊縮到 1600px，轉成 WebP（瀏覽器不支援時用 JPEG，透明背景鋪白），品質 0.82；長邊不超過 1600px 且小於 400 KB 的圖片不重新壓縮；處理失敗時改傳原檔
- 產品表單「上傳主圖」與批量匯入的圖片（ZIP、多選）上傳前都先經過縮圖
- 不需新增套件；伺服器端檢查（格式、5 MB 上限、檔頭驗證）不變。原本超過 5 MB 會被拒絕的手機照片，縮圖後可以直接上傳

**測試：** 單元 `tests/admin/image-resize.test.mts`；E2E `tests/e2e/admin-image-resize.e2e.cjs`（約 7 MB 的 4000×3000 照片 → 上傳約 140 KB WebP；小圖維持原檔；批量匯入 ZIP 照片也縮小）。舊版執行失敗（7 MB 照片被拒絕）。
`mock-supabase.cjs` 的模擬 Storage 會記錄上傳檔案大小與類型（`storageMeta`）。

**注意：** 已經上傳的照片不會自動變小；正式資料目前只有測試產品，不需處理。

**還原：** Revert 本批 PR。

---

## 2026-10-04（第十九批）：客戶確認信不回顯需求說明

PR：[#24](https://github.com/bouner-xh/xh-motorparts/pull/24)

**原因：** 確認信寄到表單填的任何信箱。原本會附上客戶自由輸入的「需求說明」全文，有心人可以填陌生人的信箱與廣告文字，
借公司名義（sales@）寄出，影響寄件網域信譽。老闆 2026-10-04 比較三種做法後決定：確認信不附需求說明。

**修改：** `src/lib/inquiry-email.ts` 的確認信移除「Your Messages / Requirements」區塊；有填需求說明時改顯示固定文字
「Your additional requirements have been received and will be reviewed by our sales team…」，沒填則不顯示。管理員通知信不變，仍有全文。

**測試：** 單元 `tests/security/inquiry-email.test.mts`（確認信不含需求說明、通知信有全文）；E2E `tests/e2e/inquiry-confirmation-email.e2e.cjs`（瀏覽器送出含廣告文字的需求說明 → 確認信沒有、通知信有）。舊版執行失敗。

**還原：** Revert 本批 PR。

---

## 2026-09-30（第十八批）：每日排程同時保持 Supabase 運作（安全複查 R5）

PR：[#23](https://github.com/bouner-xh/xh-motorparts/pull/23)

**原因：** Supabase 免費專案 7 天沒有活動會被暫停；暫停後產品頁改用內建資料、詢價無法存檔、後台無法使用。

**修改：** `src/app/api/cron/upstash-keepalive/route.ts`（沿用第十六批的排程與網址，不需要新設定）
- 除了讀寫 Upstash，另外查詢一次 Supabase `products`（只讀 1 筆 id）
- 回應分別列出兩個服務的結果 `{ ok, upstash, supabase }`；任何一項失敗或未設定都回 502，Vercel Logs 會記錄 `[cron] keepalive`

**測試：** `tests/e2e/cron-keepalive.e2e.cjs` 新增：確認有查詢產品資料表、Supabase 查詢失敗時回 502 且 Upstash 仍照常更新；Upstash 連不上時分別回報。
`mock-supabase.cjs` 新增資料庫讀寫紀錄（`restLog`）。舊版執行新測試失敗（沒有查詢 Supabase、失敗時仍回 200）。

**還原：** Revert 本批 PR（排程回到只處理 Upstash）。

---

## 2026-09-30（第十七批）：詢價欄位上限、品項名稱以資料庫為準（安全複查 R3）

PR：[#22](https://github.com/bouner-xh/xh-motorparts/pull/22)

**原因：** 詢價確認信會寄到表單填的任何信箱；原本姓名、品項名稱沒有長度限制，而且品項名稱直接採用瀏覽器送來的文字，
可被借用我們的網域寄出廣告內容、耗盡 Resend 每日 100 封額度（真正的詢價通知就寄不出去）。

**修改：**
- `src/lib/inquiry-limits.ts`：欄位上限（姓名 100、Email 254、公司 150、國家 80、電話 40、需求說明 2,000、品項最多 100 項、品項名稱 200、數量最多 1,000,000）與品項名稱處理
- `src/app/api/inquiry/route.ts`：超過上限回 400「表單或詢價品項資料不完整」；有資料庫時品項名稱與型號改用資料庫的值，查不到的品項只保留型號與數量（名稱清空）
- 詢價頁表單輸入框加上字數上限（瀏覽器直接擋住，不會等到送出才失敗）；詢價清單與產品頁數量上限 1,000,000

**API 變更（老闆 2026-09-30 同意）：** 超過上限的請求會被拒絕；正常操作不受影響。

**測試：** 單元 `tests/security/inquiry-limits.test.mts`；E2E `tests/e2e/inquiry-limits.e2e.cjs`（竄改詢價清單的品項名稱 → 信件與詢價單都是資料庫名稱；輸入框字數上限；5 種超過上限的請求都被拒絕且不寄信）。舊版兩項測試都失敗。

**還原：** Revert 本批 PR。

---

## 2026-09-29（第十六批）：每日排程保持 Upstash 運作（C）

PR：[#21](https://github.com/bouner-xh/xh-motorparts/pull/21)

**原因：** Upstash 免費資料庫連續 14 天沒有使用會被自動刪除；網站詢價量低，只靠詢價觸發容易被判定閒置（第十五批事件）。

**修改：**
- `vercel.json`：新增 Vercel 排程，每天 UTC 19:17（台灣 03:17）呼叫 `/api/cron/upstash-keepalive`（免費方案每天一次，實際時間在該小時內）
- `src/app/api/cron/upstash-keepalive/route.ts`：寫入並讀回 Upstash 一筆 `xh:keepalive`（30 天後自動過期）
  - 只接受 `Authorization: Bearer <CRON_SECRET>`；未設定 `CRON_SECRET` 回 503，密碼錯誤回 401，Upstash 失敗回 502 並記錄 `[cron] upstash-keepalive`
- `src/lib/cron-auth.ts`：密碼比對（固定時間比較）

**需要的設定：** Vercel 環境變數 `CRON_SECRET`（Production），設定後 Redeploy。Vercel 排程會自動帶上這個密碼。
**確認方式：** Vercel → 專案 → Settings → Cron Jobs 可看到排程並可手動 Run；Upstash 的 COMMANDS 每天會增加 2。

**測試：** 單元 `tests/security/cron-auth.test.mts`；E2E `tests/e2e/cron-keepalive.e2e.cjs`（模擬 Upstash：沒密碼／錯密碼 401 且不碰 Upstash、正確密碼寫入並讀回；Upstash 連不上回 502）。舊版執行為 404。
`mock-supabase.cjs` 新增模擬 Upstash（`POST /upstash`、`/upstash/pipeline`）。

**還原：** Revert 本批 PR（或在 Vercel Cron Jobs 頁面停用排程）。

---

## 2026-09-29（第十五批）：流量限制服務故障時照常收單（B）

PR：[#20](https://github.com/bouner-xh/xh-motorparts/pull/20)

**事件：** 2026-09-29 正式站送出詢價一律顯示「伺服器處理詢價單時發生錯誤」。Vercel Logs：
`getaddrinfo ENOTFOUND <舊資料庫>.upstash.io`。原因：Upstash 免費資料庫連續 14 天沒有使用，被自動刪除；
流量限制連不上時程式直接拋錯，整個詢價表單停擺。

**處理：**
1. 設定變更：老闆在 Upstash 重建資料庫（東京 ap-northeast-1，Free），更新 Vercel 兩個 `UPSTASH_` 變數並 Redeploy；
   第一次 Redeploy 未生效，確認 Production 的變數後再部署一次才恢復。老闆實際送單確認成功。
2. 程式：`src/app/api/inquiry/route.ts`
   - 流量限制呼叫 Upstash 失敗時略過並照常收單，Vercel 記錄 `[inquiry] rate-limit: Upstash unavailable`。機器人驗證（Turnstile）維持原本的嚴格檢查
   - 未預期錯誤的紀錄加上失敗步驟：`Inquiry submission API error [stage: rate-limit|turnstile|database|email]`
   - 「未設定」Upstash 變數時正式環境仍停止收單（S4 不變）

**測試：** 新增 `tests/e2e/inquiry-ratelimit-down.e2e.cjs`（`run-all.sh` 情境 4b：Upstash 位址連不上，瀏覽器實際送單 → 顯示成功、寫入資料庫、寄出兩封信）。
舊版執行同一測試得到 500（與正式站相同）。`inquiry-protection` 情境 B 另外確認 Upstash 連不上時回應 400（進入機器人驗證）而不是 500。

**還原：** Revert 本批 PR。還原後 Upstash 一旦故障，詢價表單會再次全部失敗。

---

## 2026-09-28（第十四批）：詢價處理紀錄、從後台回覆客戶（A6 第二階段 ③④）

PR：[#19](https://github.com/bouner-xh/xh-motorparts/pull/19)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| A6 ③ | 詢價處理紀錄：儲存時記錄操作人與狀態、備忘的前後值；刪除前先記錄；詳情顯示時間軸 | `supabase/migrations/20260928_inquiry_events.sql`（新）、`src/lib/inquiry-events.ts`、`inquiry-event-diff.ts`（新）、`api/admin/inquiries/events`（新） | `e3374cc` | `tests/admin/inquiry-event-diff.test.mts`、`admin-inquiry-events.e2e.cjs` |
| A6 ④ | 從後台回覆客戶：中英文範本、預覽確認、未填提示不能寄、PDF 附件（4 MB）、回覆地址與副本 sales@、寄出後改為已回覆並記錄 | `src/lib/inquiry-reply.ts`（新）、`src/lib/resend.ts`（新）、`api/admin/inquiries/reply`（新）、`InquiryReplyComposer.tsx`（新） | `fa92e3e` | `tests/admin/inquiry-reply.test.mts`、`admin-inquiry-reply.e2e.cjs` |

**需要老闆做的事（資料庫）**：在 Supabase 執行 `supabase/migrations/20260928_inquiry_events.sql`，步驟見 `docs/inquiry-events-setup.md`。
**沒執行之前**：後台其他功能與「回覆客戶」都照常運作（信會寄出、狀態會更新），只是不會留下處理紀錄，詳情會顯示「處理紀錄尚未啟用」。

**之後修改時要注意**
- 網站寄信請用 `src/lib/resend.ts` 的 `sendResendEmail`。`RESEND_API_URL` 只給測試使用，正式環境不要設定。
- 回覆信的寄件人是 Vercel 的 `RESEND_FROM_EMAIL`；Resend 寄件網域必須已驗證，否則會顯示「寄信失敗」。
- Vercel 單次請求上限約 4.5 MB，所以附件限制 4 MB。

## 2026-09-28（第十三批）：詢價匯出、客戶列表（A6 第二階段 ①②）

PR：[#18](https://github.com/bouner-xh/xh-motorparts/pull/18)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| A6 ① | 詢價分頁「匯出 CSV」：匯出目前篩選結果，每個品項一列、台灣時間、BOM；客戶輸入以 = + - @ 開頭的內容加單引號，防止 Excel 公式注入 | `src/lib/inquiry-export.ts`（新）、`api/admin/inquiries/export`（新）、`AdminInquiryManager.tsx` | `9319f7f` | `tests/admin/inquiry-export.test.mts`、`admin-inquiry-export.e2e.cjs` |
| A6 ② | 新增「客戶」分頁：詢價次數、待處理、最近詢價、常詢價型號；搜尋、國家、排序、匯出；客戶詳情與詢價分頁互相跳轉；詢價詳情顯示回頭客 | `src/lib/customer-summary.ts`（新）、`src/lib/admin-customers.ts`（新）、`api/admin/customers`（新）、`AdminCustomerManager.tsx`（新） | `d4d6d78` | `tests/admin/customer-summary.test.mts`、`admin-customers.e2e.cjs` |

**不需要改資料庫**：客戶資料沿用既有的 `customers` 表（每次詢價依 Email 自動建立或更新）。

**設定變更**：`tsconfig.json` 開啟 `allowImportingTsExtensions`，讓 `src/lib` 的純函式可以用 `.ts` 路徑互相引用並直接做單元測試（專案原本就是 `noEmit`，不影響建置）。

**之後修改時要注意**
- 匯出功能會把客戶個資下載到電腦，伺服器紀錄會記下匯出人與筆數；匯出檔請勿轉寄給外部人員。
- 新增後台 API 可以用 `src/lib/admin-session.ts` 的 `requireAdmin()` 做登入與權限檢查。

## 2026-09-28（第十二批）：詢價信件回覆地址、產品頁按鈕位置

PR：[#17](https://github.com/bouner-xh/xh-motorparts/pull/17)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| 信件 B | 新詢價通知信的回覆地址設為客戶（在信箱按回覆就是回給客戶）；客戶確認信的回覆地址設為 `sales@`；未設定 `RESEND_ADMIN_EMAIL` 時改寄 `sales@`，程式與舊文件不再有個人信箱 | `src/lib/inquiry-email.ts`、`src/app/api/inquiry/route.ts`、`doc/IMPLEMENTATION_STATUS.md` | `daaf66d` | `tests/security/inquiry-email.test.mts` |
| D15 | 數量與「加入詢價清單」移到規格、庫存下方；修正產品照片 1:1 比例沒有生效；桌機按鈕 1,122px → 677px（第一個畫面內），手機 1,617px → 985px | 產品頁 `page.tsx`、`InquiryForm.tsx`、`globals.css` | `9ea2b61` | `product-detail-cta.e2e.cjs` |

**之後修改時要注意**
- 網站寄出的信件請用 `inquiry-email.ts` 的 envelope 函式，並設定 `replyTo`，避免客戶回信寄到沒人收的地址。
- Gmail 以 `sales@` 名義寄信的設定步驟：`docs/gmail-send-as-sales.md`。

## 2026-09-27（第十一批）：匯入工具圖示、功能介紹

PR：[#16](https://github.com/bouner-xh/xh-motorparts/pull/16)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| A8 補完 | 批量匯入工具的 emoji（📦 🖼️ 🎉 ⏳ ⚠）改為線條圖示或純文字 | `src/components/admin/AdminProductImporter.tsx` | `e58ad57` | `admin-dashboard-tabs.e2e.cjs` 新增「後台沒有 emoji」檢查 |

**文件**：健檢報告新增「網站功能介紹」：前台 8 個畫面、後台 5 個分頁的實際截圖，以及「上架新產品」「整批上架」「處理詢價」的操作步驟。截圖時發現產品頁按鈕位置問題，列為 D15（待決定）。

## 2026-09-27（第十批）：後台分頁與總覽

PR：[#15](https://github.com/bouner-xh/xh-motorparts/pull/15)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| A8 | 後台改為上方分頁（總覽／詢價／產品／分類／批量匯入），網址記住分頁；總覽顯示待處理詢價、產品與分類筆數、最新 5 筆詢價；標頭顯示登入帳號、前往網站、登出；移除過時文字；手機版分頁可左右滑動 | `src/app/[locale]/admin/dashboard/page.tsx`、`src/components/admin/AdminDashboardTabs.tsx`（新）、`AdminOverview.tsx`（新）、`globals.css`、`messages/*.json` | `5478515` | `admin-dashboard-tabs.e2e.cjs`；依老闆確認的示意圖實作，桌機與手機截圖比對 |

**之後修改時要注意**
- 新增後台功能時，在 `AdminDashboardTabs.tsx` 的 `TABS` 加一個分頁，並用 `panel()` 放入內容。
- 各分頁的元件都保持掛載（只是隱藏），元件之間用瀏覽器事件同步；詢價新增了 `inquiries-updated` 事件，總覽與詢價分頁的待處理數量會跟著更新。

## 2026-09-27（第九批）：Next.js 安全性升級

PR：[#14](https://github.com/bouner-xh/xh-motorparts/pull/14)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| S11 | next 15.5.19 → 15.5.26（同系列修正版），修補已公告的 2 個嚴重、4 個高與數個中等級漏洞；`npm audit fix`（不含破壞性升級）一併更新 sharp、nanoid | `package.json`、`package-lock.json` | `bd62b3a` | `bash tests/run-all.sh` 全部通過（含正式環境建置）；`npm ci` 正常 |

**剩下的 `npm audit` 警告**：postcss（Next.js 內建，只在建置時處理本站自己的 CSS，沒有外部輸入），要升級到 Next 16 才能消除，暫不處理。

**之後修改時要注意**
- **不要用 `npm audit fix --omit=dev`**：會把開發用套件從 `node_modules` 移除，之後 `next build` 會自動補裝不同版本並改寫 `package.json`（這次實際發生過）。要檢查請用 `npm audit --omit=dev`，修正用 `npm audit fix`。
- 建議每季執行一次 `npm audit --omit=dev` 檢查。

## 2026-09-27（第八批）：後台分類刪除、詢價管理、產品列表與 API 錯誤處理

PR：[#12](https://github.com/bouner-xh/xh-motorparts/pull/12)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| A5 | 分類列表顯示子分類數與產品數；有產品時不能刪除並說明原因（API 回 409）；刪除大分類提示子分類會一併刪除；刪除產品、換圖、匯入覆蓋圖片後清除沒人用的圖檔 | `AdminCategoryManager.tsx`、`AdminSubCategoryManager.tsx`、`api/admin/categories`、`api/admin/sub-categories`、`src/lib/product-image-cleanup.ts`（新）、`src/lib/storage-path.ts`（新） | `ac8f6d8` | `admin-delete.e2e.cjs`、`tests/admin/storage-path.test.mts` |
| A6 第一階段 | 詢價依狀態篩選（含筆數）、「N 筆待處理」、搜尋（公司／聯絡人／Email／國家／電話／型號）、每頁 20 筆、建立與最後更新時間、Esc 關閉、錯誤不取代整個面板、修正排版 | `AdminInquiryManager.tsx`、`api/admin/inquiries/route.ts` | `81d2fac` | `admin-inquiries.e2e.cjs` |
| A7 | 產品列表搜尋、分類與上架篩選、分頁、縮圖、子分類；編輯時捲到表單並顯示「正在編輯」與取消；「複製」產品；未存檔的上傳圖片自動刪除 | `AdminProductManager.tsx`、`api/admin/upload-image`（新增 DELETE）、`src/lib/product-image-url.ts`（新） | `528d38b` | `admin-product-list.e2e.cjs` |
| A9 | 後台 API 錯誤改為中文說明（原始訊息只記在伺服器 log）、ID 格式與欄位長度檢查、產品 API 不再自動建立沒有名稱的分類 | `src/lib/admin-api-errors.ts`（新）、`src/app/api/admin/**` | `01918dc` | `admin-api-errors.e2e.cjs`、`tests/admin/admin-api-errors.test.mts` |

**之後修改時要注意**
- 後台 API 回傳錯誤請用 `src/lib/admin-api-errors.ts` 的 `dbErrorResponse`／`invalidInputResponse`，不要直接回傳 `error.message`。
- 會刪除或更換產品圖片的地方，請在資料庫更新後呼叫 `removeUnreferencedImages`，避免圖檔累積。
- 後台元件之間用瀏覽器事件同步：`products-updated`、`categories-updated`、`subcategories-updated`。
- A6 第二階段（匯出 CSV、客戶列表、後台直接寄回覆信）尚未進行，需另外討論；「修改人」紀錄需要新增資料表欄位，也需確認。

## 2026-09-27（第七批）：後台產品管理與批量匯入

PR：[#11](https://github.com/bouner-xh/xh-motorparts/pull/11)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| A2 | 產品表單不再預填 TEST 測試資料，「上架」預設不勾選；移除偵錯面板、Build 標記與測試按鈕，並清除舊版存在瀏覽器的偵錯紀錄 | `src/components/admin/AdminProductManager.tsx` | `4c7eb22` | `admin-product-form.e2e.cjs` |
| A3 | 新增後保留分類與子分類（可連續新增）；切換大分類時清空子分類；API 檢查子分類屬於所選大分類 | `AdminProductManager.tsx`、`src/app/api/admin/products/route.ts` | `b4beace` | `admin-product-category.e2e.cjs` |
| A1 | Excel／ZIP 匯入改用隨網站打包的套件（`read-excel-file`、`jszip`），不再從外部網站載入（原本被 CSP 擋下）；不支援舊版 .xls | `AdminProductImporter.tsx`、`package.json` | `3d605b0` | `admin-product-import.e2e.cjs` |
| A4 | 正式 CSV 解析、FALSE／0／否 判讀為不上架、錯誤列號清單、每 50 筆分批、既有產品只更新有填的語言名稱（規格與庫存沒填保留原值）、範例檔下載 | `src/lib/product-import.ts`（新）、`AdminProductImporter.tsx`、`src/app/api/admin/products/batch/route.ts` | `3d605b0` | `tests/admin/product-import.test.mts`、`admin-product-import.e2e.cjs` |

**新增套件**（老闆 2026-09-27 同意）：`read-excel-file@9.3.10`、`jszip@3.10.2`（皆 MIT 授權；安裝後 `npm audit` 沒有新增警告）。安裝時 `package-lock.json` 一併同步，**`npm ci` 已恢復正常**。

**測試環境**：模擬 Supabase（`tests/e2e/mock-supabase.cjs`）改為可寫入，支援關聯查詢、外鍵限制與 Storage，範例資料 ID 改為 UUID。

**之後修改時要注意**
- 匯入欄位的解析規則都在 `src/lib/product-import.ts`，改規則時請一併更新單元測試。
- 後台不要再加入從外部網站載入的程式；需要的套件請安裝進專案。
- 設定程式以外的變更（2026-09-27）：老闆刪除 Vercel 的 `NEXT_PUBLIC_BASE_URL`（改用程式預設的 www）並重新部署，正式網站 canonical 已為 www（C4 完全生效）。

## 2026-09-27（第六批）：Cookie 撤回與多語 SEO

PR：[#10](https://github.com/bouner-xh/xh-motorparts/pull/10)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| S6 | 頁尾「隱私政策」旁新增「Cookie 設定」（三語）：清除同意紀錄與 GA／Clarity Cookie 後重新載入，橫幅重新出現；手機版公司名稱與連結分兩行 | `src/components/layout/CookieSettingsButton.tsx`（新）、`Footer.tsx`、`globals.css` | `353e6bd` | `cookie-consent.e2e.cjs`（新增撤回情境） |
| D14 | 所有公開頁面設定自己的 canonical 與 zh-TW／zh-CN／en／x-default hreflang。**另修正**：關於、聯絡、產品目錄、隱私政策、詢價頁原本的 canonical 指向首頁 | `src/lib/site.ts`（`localeAlternates`）、`src/app/[locale]/**/page.tsx`、`inquiry/layout.tsx`（新） | `8a51c2b` | `hreflang.e2e.cjs`（新）、`canonical-url.e2e.cjs` |

**之後修改時要注意**
- 新增公開頁面時，一定要在 `generateMetadata` 設定 `alternates: localeAlternates(locale, '/路徑')`。Next.js 不會合併 `alternates`：沒設定會沿用首頁的 canonical，只設 canonical 會少了 hreflang。
- 設定程式以外的變更（2026-09-27）：C3 Cloudflare 兩筆 DNS 紀錄改為 DNS only（已確認沒有自訂 Security 規則；正式網站回應已無 `cf-ray`）。

## 2026-09-27（第五批）：首頁與手機版體驗

PR：[#9](https://github.com/bouner-xh/xh-motorparts/pull/9)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| D3 | 首頁順序改為 Hero → 產品分類 → 詢價步驟 → 選擇理由 → 品牌故事（名言與品牌理念合併）；第一個產品分類位置桌機 1972 → 930px、手機 2379 → 1233px | `src/app/[locale]/page.tsx` | `3ac23ed` | `home-section-order.e2e.cjs` |
| D4 | 768px 以下標頭收合為 ☰ 選單（標頭高度約 310 → 68px），換頁自動收合；桌機不變 | `src/components/layout/SiteHeader.tsx`、`layout.tsx`、`globals.css` | `10d95f2` | `mobile-menu.e2e.cjs`、桌機截圖逐像素相同 |
| D2 | 依示意圖：主按鈕放大加粗、「公司資訊」改外框按鈕、聯絡資訊縮為按鈕下方一行（三語「或直接聯絡業務」） | `src/app/[locale]/page.tsx`、`globals.css` | `123a817` | `home-hero-cta.e2e.cjs` |
| D9 | emoji 改為自繪線條圖示（選擇理由、頁尾、詢價清單按鈕、空清單頁） | `src/components/ui/Icon.tsx`、`src/lib/site-content.ts`、`Footer.tsx`、`CartIndicator.tsx` | `791dc9c` | `no-emoji-icons.e2e.cjs` |
| D12 | 640px 以下詢價清單改為直式卡片（不需左右捲動、按鈕 44px、料號一行）；桌機不變 | `src/app/[locale]/inquiry/page.tsx`、`globals.css` | `ff055a3` | `inquiry-mobile-cards.e2e.cjs`、桌機截圖逐像素相同 |

**之後修改時要注意**
- 新增圖示請在 `src/components/ui/Icon.tsx` 加一個名稱，不要再使用 emoji。
- 標頭改由 `SiteHeader` 元件組成；新增導覽連結請在 `src/app/[locale]/layout.tsx` 的 `links` 裡加入，桌機與手機選單會同時出現。

## 2026-09-27：對外聯絡信箱改為公司信箱

PR：[#8](https://github.com/bouner-xh/xh-motorparts/pull/8)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| S9 | 首頁、頁尾、聯絡我們、隱私權政策（三語）的聯絡信箱由個人 Gmail 改為 `sales@xh-motorparts.com` | `src/components/layout/Footer.tsx`、`src/app/[locale]/page.tsx`、`src/lib/privacy-content.ts`、`messages/*.json`（`contact.email`） | `bde143f` | `contact-email.e2e.cjs` |

**之後修改時要注意**
- `sales@` 是 Cloudflare Email Routing 的轉寄地址，**只能收信**；要更換收信人請到 Cloudflare → Email Routing → Routing rules 修改，不需要改程式。
- 詢價通知信寄到哪裡由 Vercel 的 `RESEND_ADMIN_EMAIL` 決定，與網站顯示的信箱無關。

## 2026-09-26（第三批）：產品卡片加入詢價與前台體驗修正

PR：[#4](https://github.com/bouner-xh/xh-motorparts/pull/4)

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| D1 | 產品列表卡片「加入詢價清單」按鈕，加入後變成「✓ 已加入，點此移除」，預設數量 100 | `src/components/products/ProductCardInquiryButton.tsx`、`ProductCard.tsx`、`messages/*.json`（`inquiry.addedToCart`）、`globals.css` | `5752c3a` | `product-card-inquiry.e2e.cjs`（桌機／手機） |
| D13 | 補上不存在的產品預設圖，沒有照片的產品不再破圖 | `images/no-image.jpg` | `19c5c4e` | 同上 |
| D5 | 首頁 Hero 內距以 `clamp()` 縮放（桌機不變） | `src/app/[locale]/page.tsx`、`globals.css`（`.hero__panel--home`） | `7d4d078` | `home-hero-responsive.e2e.cjs` |
| D6 | 切換語系保留目前頁面 | `src/components/layout/LanguageLinks.tsx`、`layout.tsx` | `41cf158` | `language-switch.e2e.cjs` |
| D7 | 文案改為三語，簡中無繁體字、英文無中文 | `src/lib/localized-text.ts`（`localized()`）與 11 個頁面／元件 | `bfd1246` | `locale-text.e2e.cjs` |
| D8 | 小字顏色 `#64748b` → `#94a3b8`（對比 3.73 → 6.92） | `globals.css`（`.footer-bottom`、`.footer-privacy-link`、`.privacy-last-updated`） | `fc04ce5` | `text-contrast.e2e.cjs` |
| D10 | 每頁 H1 為該頁主標題；標頭公司名稱改為 `.brand-name` | `layout.tsx`、各頁面、`globals.css` | `4812eb3` | `page-h1.e2e.cjs`、截圖比對 |
| D11 | 首頁主按鈕改為 `.button-primary` 連結（不再 `<a>` 包 `<button>`） | `src/app/[locale]/page.tsx`、`globals.css` | `9535fe9` | `no-nested-interactive.e2e.cjs`、截圖比對 |
| 測試 | 一次執行全部測試的腳本 | `tests/run-all.sh` | `273cfde` | — |

**之後修改時要注意**
- 新增前台文字時，請用 `localized(locale, { 'zh-TW': …, 'zh-CN': …, en: … })` 或 `messages/*.json`，不要再寫 `locale === 'en' ? 英 : 繁`，否則簡中頁會出現繁體字。
- 每頁只能有一個 `<h1>`（頁面主標題）；標頭公司名稱不是 H1。
- 按鈕外觀的連結請用 `className="button-primary"`，不要在 `<Link>` 裡放 `<button>`。

## 2026-09-26（第二批）：正式網址、防刷機制、清理舊檔

PR：[#3](https://github.com/bouner-xh/xh-motorparts/pull/3)（合併 `14e424d`）

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| C4 | 正式網址統一為 `https://www.xh-motorparts.com`，6 處改用 `getBaseUrl()` | `src/lib/site.ts`、`layout.tsx`、`robots.ts`、`sitemap.ts`、產品頁 | `f693dc0` | `canonical-url.e2e.cjs` |
| S4 | 正式環境（`VERCEL_ENV=production`）缺少 Turnstile／Upstash 任一設定即停止收單（503），伺服器 log 記錄缺少的變數；Preview 與開發環境不受影響 | `src/lib/inquiry-protection.ts`、`src/app/api/inquiry/route.ts` | `7408b6b` | `inquiry-protection.e2e.cjs`、單元測試 |
| 清理 | 移除舊版 GitHub Pages 靜態站（`index.html`、`products.html`、`404.html`、`styles.css`、`js/`）；`images/`、`messages/` 保留 | 根目錄 | `192047a` | `site-smoke.e2e.cjs` |

**之後修改時要注意**
- 詢價若突然全部失敗並回應 503，到 Vercel → Logs 搜尋 `Inquiry protection is not configured`，會列出缺少的變數。
- `images/` 仍被新網站使用（`/legacy-assets/*` 路由），不可刪除。

## 2026-09-26（第一批之二）：後台管理員名單

PR：[#2](https://github.com/bouner-xh/xh-motorparts/pull/2)（合併 `f998c10`）

| 編號 | 修改 | 主要檔案 | Commit | 驗證 |
|---|---|---|---|---|
| S2 | 只有 `ADMIN_EMAILS` 名單內的帳號能使用後台頁面與 6 支後台 API（名單外 403、登入即登出、未設定名單一律拒絕） | `src/lib/admin-auth.ts`、`middleware.ts`、`src/app/api/admin/*`、後台頁面 | `9369ca1` | `admin-access*.e2e.cjs`、單元測試 |

**新增或移除管理員**：(1) Supabase → Authentication → Users 新增／刪除帳號；(2) 修改 Vercel 的 `ADMIN_EMAILS`；(3) Redeploy。

## 2026-09-25～26（第一批）：主要資安修正

PR：[#1](https://github.com/bouner-xh/xh-motorparts/pull/1)（合併 `6f8d849`，git 歷史改寫後的編號）

| 編號 | 修改 | 主要檔案 | Commit |
|---|---|---|---|
| S1 | 詢價信件所有欄位跳脫，防止 HTML 注入／釣魚信 | `src/lib/inquiry-email.ts`、`src/app/api/inquiry/route.ts` | `5521391` |
| S3 | CSP 放行 GA4、Clarity 收集網域 | `next.config.ts` | `36a3e72` |
| S5 | 詢價存檔失敗時寄管理員備援信（標題 `[NOT SAVED TO CRM]`），都失敗才回報錯誤 | `src/app/api/inquiry/route.ts` | `4955e6c` |
| S6 | Clarity 需同意 Cookie 才載入；回訪沿用同意狀態（「Cookie 設定」撤回連結尚未做） | `src/components/layout/AnalyticsScripts.tsx` | `5eaec0f` |
| S0 | 移除登入頁寫死帳密的「測試登入」後門 | `src/app/[locale]/admin/login/page.tsx` | `bca6f8b` |
| S7 | 登入後跳轉路徑於 server action 再次驗證 | 同上 | `85380bf` |
| S8 | 圖片上傳以檔案內容確認格式，錯誤訊息不外露 | `src/lib/image-signature.ts`、`src/app/api/admin/upload-image/route.ts` | `a03c520` |

---

## 程式以外的設定變更

| 日期 | 服務 | 變更 | 執行者 |
|---|---|---|---|
| 2026-09-26 | GitHub | git 歷史改寫：`master`、`test`、修正分支共 33 個 commit 中的外洩密碼替換為 `***REMOVED***`（所有 commit 編號因此改變） | Claude |
| 2026-09-26 | GitHub | Claude GitHub App 安裝到 `bouner-xh` | 老闆 |
| 2026-09-26 | Supabase | 更換外洩的管理員密碼、新增第二位管理員、關閉公開註冊、Site URL 改為正式網址 | 老闆 |
| 2026-09-26 | Vercel | 新增 `ADMIN_EMAILS`（兩個專案）；`xh-motorparts`（無正式網域的重複專案）中斷 Git 連結 | 老闆 |
| 2026-09-26 | Cloudflare | 刪除無效的 Porkbun SPF；啟用 Email Routing（MX／DKIM／SPF 已鎖定），轉寄目的地已驗證 | 老闆 |
| 2026-09-27 | Cloudflare | `sales@xh-motorparts.com` 轉寄規則實測成功（外部信箱寄出，負責人信箱收到）（C2 完成） | 老闆 |
