# 開發進度（PROGRESS）

- 更新日期：2026-09-26
- 分支：`claude/quirky-noether-qibs76`
- 本次主題：安全性修正（依 2026-09-25 網站健檢報告）
- 功能狀態總表仍以 `doc/IMPLEMENTATION_STATUS.md` 為準；本檔記錄每次 session 的工作進度

---

## ⚠️ 老闆需要立即處理（我無法代為執行）

1. **更換後台帳號密碼**
   `src/app/[locale]/admin/login/page.tsx` 原本寫死一組管理員帳號密碼，登入頁還有一顆「測試登入」按鈕，任何人按一下就能進後台。
   按鈕與程式碼已經移除（S0），但 **這個 GitHub repo 是公開的**，密碼仍留在 git 歷史紀錄中（commit `7c22acd`，2026-06-07 起）。
   - 請到 Supabase → Authentication → Users 更換原程式碼中寫死的那個管理員帳號的密碼
   - 如果其他服務（Gmail 等）也用同一組密碼，請一併更換
   - 建議檢查 Supabase 後台的 CRM 詢價資料、產品資料有沒有被異動
   - 是否要把 repo 改為私有、或清除 git 歷史紀錄，需要老闆決定（清除歷史紀錄會改寫已推送的 commit）
2. **改寫 git 歷史**：老闆已同意改寫 `master`、`test`、`claude/quirky-noether-qibs76` 三個分支，把密碼從所有 commit 中移除。
   待老闆更換密碼、下達「開始執行」後進行。

---

## ✅ 已完成（本次）

| 編號 | 項目 | Commit | 測試 |
|---|---|---|---|
| S0 | 移除登入頁寫死帳密的「測試登入」後門（新發現，緊急） | `c770e17` | E2E：修改前失敗 → 修改後通過 |
| S1 | 詢價信件跳脫使用者輸入，防止 HTML 注入 / 釣魚信 | `6853785` | 單元測試 5 項 + E2E |
| S3 | CSP 放行 GA4 / Clarity，修正上線後分析數據被擋 | `8783c28` | E2E（正式環境建置）：修改前失敗 → 修改後通過 |
| S5 | 詢價單存檔失敗時不再回報成功；改寄管理員備援通知，都失敗才回報錯誤並保留清單 | `ae53e51` | E2E（模擬資料庫故障）：修改前失敗 → 修改後通過 |
| S6 | Clarity 需同意 Cookie 才載入；回訪時沿用同意狀態 | `d775973` | E2E 2 組情境：修改前失敗 → 修改後通過 |
| S7 | 登入 server action 重新驗證跳轉路徑（Open Redirect） | `bfcb3cb` | E2E 5 組輸入 |
| S8 | 圖片上傳以檔案內容驗證格式、錯誤訊息不外露 | `c0e3c39` | 單元測試 3 項 + E2E |

**2026-09-26 上線**：已透過 [PR #1](https://github.com/bouner-xh/xh-motorparts/pull/1) 合併進 `master`（`6e13b68`），
Vercel 兩個專案（`xh-motorparts`、`xh-motorparts-uhan`）的 Production 部署皆成功。
合併前在 Vercel Preview 手動驗證：登入頁已無後門、帳號登入正常進入後台。
尚未手動驗證：後台上傳圖片、前台送出詢價並收信、Cookie 同意（程式已有自動化測試覆蓋）。

最終驗證（全部通過）：`tsc --noEmit`、`npm run lint`、`npm run build`、單元測試 8/8、E2E 7/7（正式環境建置）。
測試方式見 `tests/README.md`。

## 🔄 進行中

- 無

## ⏳ 待處理（需要老闆決定後才能動工）

| 編號 | 項目 | 需要決定的事 |
|---|---|---|
| S2 | 後台 API 只檢查有沒有登入，沒檢查是不是管理員 | 管理員判斷方式：A. `ADMIN_EMAILS` 環境變數白名單；B. Supabase `app_metadata.role`。另請確認 Supabase 已關閉公開註冊 |
| S4 | 正式環境缺少 Turnstile / Upstash 設定時自動放行 | 改為「缺設定就停止收詢價單（503）」。**若目前正式站尚未設定這些變數，修改後詢價會停擺**，需先確認 Vercel 環境變數 |
| S6 補充 | 頁尾加「Cookie 設定」讓使用者撤回同意（GDPR） | 屬於新增 UI，需確認位置與文案 |
| S9 | 個人 Gmail 寫死在首頁與程式碼 | 公司信箱（如 `sales@xh-motorparts.com`）是否已申請 |
| S10 | CSP 允許 inline script | 改用 nonce 會讓頁面變成動態渲染，需評估效能 |
| S1 補充 | 詢價欄位長度上限、客戶確認信是否回顯留言 | 會改變 API 可接受的資料，依規範需先確認 |
| D1–D12 | 使用者體驗與設計項目 | 依報告建議順序，待安全性項目確認後進行 |

## ⚠️ 遇到的問題

- **Vercel 有兩個專案同時部署同一個 repo**（`xh-motorparts`、`xh-motorparts-uhan`），需確認正式網域綁在哪一個，另一個是否可刪除。
- **GitHub 推送權限**（已解決）：原因是 Claude GitHub App 未安裝在 `bouner-xh`，安裝後已可推送。
- **`npm ci` 失敗**：`package-lock.json` 與 `package.json` 不同步（缺 `@swc/helpers@0.5.23`），CI 的 `npm ci` 也會失敗。
  本次用 `npm install` 安裝後把 lockfile 還原，沒有提交 lockfile 變更。是否重新產生 lockfile 需老闆確認。
- **Playwright 未加入專案依賴**：依規範新增套件需先詢問，因此 E2E 使用環境中全域安裝的 playwright 執行。
  建議之後把 `@playwright/test` 加為 devDependency（待老闆同意）。
- **部分情境無法在無資料庫的環境完整測試**：
  - S5「資料庫失敗但管理員信寄送成功」需要真的 Resend 金鑰
  - S7 server action 跳轉、S8 格式檢查需要真的 Supabase 登入
  以上以單元測試或頁面層級 E2E 覆蓋，建議部署到 Vercel Preview 後再實際登入測試一次。
- 文件資料夾：開發規範寫 `docs/`，專案原本使用 `doc/`。本檔依規範建在 `docs/PROGRESS.md`，是否合併資料夾待決定。
