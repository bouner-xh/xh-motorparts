# Gmail 以 sales@xh-motorparts.com 名義寄信（設定步驟）

目的：在 Gmail 回覆客戶時，寄件人顯示公司信箱 `sales@xh-motorparts.com`，而不是個人 Gmail。

原理：`sales@` 的收信由 Cloudflare Email Routing 轉寄到負責人 Gmail；寄信改走網站已在使用的寄信服務 Resend（SMTP），Gmail 只是「借用」這個寄信管道。

- 所需時間：約 10–15 分鐘
- 費用：不另外收費（Resend 免費方案每月 3,000 封、每天 100 封，與網站通知信共用）
- 需要：Resend 帳號、要設定的 Gmail 帳號（請用電腦版網頁操作）

---

## 第一步：確認 Resend 網域已驗證

1. 登入 <https://resend.com>，左側選 **Domains**。
2. 確認列表裡有 **`xh-motorparts.com`**，狀態為 **Verified**（綠色）。
3. 如果看到的是其他名稱（例如只有 `send.xh-motorparts.com`），或狀態不是 Verified：**先停在這裡**，截圖給工程師確認。

## 第二步：在 Resend 建立 Gmail 專用的寄信金鑰

1. 左側選 **API Keys** → 右上 **Create API Key**。
2. 填寫：
   - **Name**：`gmail-sales-smtp`（方便日後辨認）
   - **Permission**：**Sending access**（只能寄信，不能改設定）
   - **Domain**：`xh-motorparts.com`
3. 按 **Add**，畫面會顯示一串 `re_` 開頭的金鑰。**這串只會顯示一次**，先複製起來，下一步要貼到 Gmail。
4. 這串金鑰等同寄信密碼：不要傳給任何人（包含工程師），也不要存在聊天或文件裡；直接貼到 Gmail 即可。

## 第三步：在 Gmail 新增寄件地址

1. 打開 Gmail → 右上角齒輪 ⚙ → **查看所有設定**。
2. 上方分頁選 **帳戶和匯入**。
3. 找到 **以這個地址寄送郵件** → 按 **新增另一個電子郵件地址**，會跳出小視窗。
4. 第一頁填寫：
   - **名稱**：`協皇企業 Xie Huang Enterprise`（客戶看到的寄件人名稱）
   - **電子郵件地址**：`sales@xh-motorparts.com`
   - **視為別名**：保持勾選
   - 按 **下一步**
5. 第二頁（SMTP 伺服器）填寫：

   | 欄位 | 填入 |
   |---|---|
   | SMTP 伺服器 | `smtp.resend.com` |
   | 通訊埠 | `587` |
   | 使用者名稱 | `resend`（全小寫，就是這幾個字） |
   | 密碼 | 第二步複製的 `re_` 金鑰 |
   | 連線方式 | **使用 TLS 的安全連線** |

   按 **新增帳戶**。
   - 若出現連線失敗：確認使用者名稱是 `resend`、金鑰完整貼上；仍失敗時改用通訊埠 `465` 並選 **使用 SSL 的安全連線**。

## 第四步：驗證 sales@ 是你的信箱

1. Gmail 會寄一封「Gmail 確認 - 以 sales@xh-motorparts.com 的身分傳送郵件」到 `sales@`，經 Cloudflare 轉寄後會出現在同一個 Gmail。
2. 打開信，點裡面的確認連結（或把信中的驗證碼貼回小視窗）。
3. 5 分鐘內沒收到：看一下「垃圾郵件」與「所有郵件」。

## 第五步：設定回覆時自動用 sales@

1. 回到 **設定 → 帳戶和匯入 → 以這個地址寄送郵件**。
2. **回覆郵件時** 選 **從郵件寄送至的地址回覆**。
   - 效果：客戶寄到 `sales@` 的信（含網站的新詢價通知信，回覆地址已設為客戶），按「回覆」時寄件人會自動是 `sales@`。
3. （選擇性）在 `sales@xh-motorparts.com` 那一列按 **設為預設值**，之後寫新信預設就用公司信箱。
4. 拉到最下面按 **儲存變更**（如果有出現這個按鈕）。

## 第六步：測試

1. 按「撰寫」，寄件者選 `協皇企業 Xie Huang Enterprise <sales@xh-motorparts.com>`，寄到另一個信箱（例如同事或自己的其他信箱，**不要寄到 sales@ 本身**）。
2. 在收件的信箱確認：
   - 寄件人顯示 `協皇企業 Xie Huang Enterprise <sales@xh-motorparts.com>`，沒有出現「經由 xxx」的字樣。
   - （Gmail 收件時）打開信 → 右上「⋮」→ **顯示原始郵件**，SPF、DKIM 都是 **PASS**。
3. 從那個信箱回覆這封信，確認回信有回到你的 Gmail（經 `sales@` 轉寄）。
4. 手機 Gmail App：網頁版設定好之後，手機寫信時點寄件人也可以選 `sales@`。

---

## 之後需要注意

- **金鑰外流或換人負責**：到 Resend → API Keys 刪除 `gmail-sales-smtp`，重新建立一把，再到 Gmail「以這個地址寄送郵件」→ 編輯資訊，換上新金鑰。
- **寄出的信**仍會保存在 Gmail 的「寄件備份」。
- **每天寄信量**：與網站通知信共用每天 100 封的免費額度，一般詢價回覆不會用完；若將來量大，再考慮升級 Resend 方案。
- **遇到問題**：截圖錯誤訊息給工程師（請遮住金鑰）。
