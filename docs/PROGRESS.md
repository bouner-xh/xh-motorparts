# 開發進度（PROGRESS）

- 更新日期：2026-09-26
- 本檔只記錄**目前狀態**（已完成／待辦／待決定）；每次修改的細節、檔案、還原方式請看 `docs/CHANGELOG.md`
- 問題編號對照網站健檢報告（第 3 版）：S = 資安、C = 網站設定與營運、D = 使用者體驗
- 功能規劃與原始計畫：`doc/摩托車零件網站現代化重構計畫_v1.6.md`

---

## ⚠️ 老闆待處理

| # | 事項 | 說明 |
|---|---|---|
| 1 | **Vercel `NEXT_PUBLIC_BASE_URL`** | 正式專案 `xh-motorparts-uhan` 有設定這個變數（值看不到）。若為 `https://xh-motorparts.com`，請改為 `https://www.xh-motorparts.com` 並 Redeploy，C4 才會生效 |
| 2 | **`sales@` 收信測試**（C2） | 確認 Email Routing 已建立 `sales` 規則，用其他信箱寄測試信給 `sales@xh-motorparts.com`，確認 `bounerchang@gmail.com` 有收到 |
| 3 | 刪除重複的 Vercel 專案（C1） | `xh-motorparts` 已中斷 Git 連結；觀察一週正常後可刪除 |
| 4 | （選擇性）GitHub Support 清除舊 commit | 密碼已更換，風險已解除；要徹底清除需以 `bouner-xh` 帳號申請 |

---

## ✅ 已完成並上線

| 項目 | PR |
|---|---|
| S0 後台後門、S1 Email 注入、S3 CSP、S5 詢價存檔、S6 Cookie 同意（部分）、S7 登入跳轉、S8 圖片上傳 | #1 |
| S2 後台管理員名單 | #2 |
| C4 正式網址統一為 www、S4 正式環境缺防護設定停止收單、移除舊版靜態站 | #3 |
| D1 產品卡片直接加入詢價、產品預設圖、D5 Hero 手機內距、D6 語系切換停留同頁、D7 三語文案、D8 小字對比、D10 H1、D11 主按鈕結構 | #4 |
| 密碼更換、關閉公開註冊、git 歷史改寫、Vercel 管理員名單、Cloudflare Email Routing | 設定變更（見 CHANGELOG） |

測試：`bash tests/run-all.sh`（單元 16 項、E2E 30 項，8 種環境情境）全部通過。

## 🔄 處理中

| 編號 | 項目 | 狀態 |
|---|---|---|
| C1 | Vercel 重複專案 | 已停止自動部署，觀察中（PR #3 之後只剩一個部署，確認生效） |
| C2 | `sales@` 收不到信 | Email Routing 已啟用、目的地已驗證，待收信測試 |

## ⏳ 待老闆決定

| 編號 | 項目 | 建議 |
|---|---|---|
| S6 補充 | 頁尾加「Cookie 設定」連結，可撤回同意（GDPR） | 放在頁尾「隱私政策」旁 |
| S9 | 首頁與頁尾的個人 Gmail 改為 `sales@xh-motorparts.com` | C2 收信測試成功後再改 |
| S10 | CSP 改用 nonce | 建議暫緩（會讓全站改為即時產生頁面） |
| C3 | Cloudflare 代理改為 DNS only | 需先提供 Cloudflare Security／Rules 截圖確認沒有自訂規則 |
| C5 | 忘記密碼功能 | 建議暫緩（目前只有兩位管理員） |
| D2 | 首頁只留一個主要按鈕 | 需確認主按鈕文字 |
| D3 | 首頁區塊順序：Hero → 產品分類 → 詢價步驟 → Why Us → 品牌理念 | 需確認 |
| D4 | 手機版漢堡選單、語系下拉 | 需確認 |
| D9 | emoji 圖示改為線條圖示 | 需確認 |
| D12 | 手機版詢價清單改為直式卡片 | 需確認 |
| S1 補充 | 詢價欄位長度上限 | 會改變 API 可接受的資料，需確認 |
| — | 產品分類頁、子分類頁、產品頁沒有 hreflang（只有首頁有） | 屬 SEO 補強，可排入後續 |
| — | 重新產生 `package-lock.json`（目前 `npm ci` 失敗，CI 也會失敗） | 需確認 |
| — | 將 `@playwright/test` 加入 devDependencies（目前用全域安裝版本） | 需確認 |

## ⚠️ 已知問題與注意事項

- **`npm ci` 失敗**：lockfile 與 `package.json` 不同步（缺 `@swc/helpers@0.5.23`）。本機請用 `npm install`，且不要提交 lockfile 變更，除非決定重新產生。
- **無法在工作環境直接連線正式網站**：正式網站的畫面需由老闆在瀏覽器確認；部署狀態可由 GitHub 的 Vercel 狀態確認。
- **Cloudflare 代理與流量限制**：網域經 Cloudflare 代理時，Vercel 看到的訪客 IP 可能是 Cloudflare 的 IP，詢價流量限制可能無法正確區分訪客。最乾淨的解法是 C3 改為 DNS only。
- 文件資料夾：專案原有 `doc/`（計畫書），開發進度與變更紀錄放在 `docs/`。
