# 啟用「詢價處理紀錄」：在 Supabase 建立資料表

後台詢價詳情的「處理紀錄」（誰、何時、改了什麼）與「從後台寄回覆信」的紀錄，需要一張新的資料表 `inquiry_events`。
**只新增資料表，不會改動或刪除任何現有資料。** 沒建立之前，後台其他功能照常運作，只是詳情會顯示「處理紀錄尚未啟用」。

- 所需時間：約 2 分鐘
- 需要：可以登入 Supabase 專案的帳號

## 步驟

1. 登入 <https://supabase.com/dashboard>，點進網站使用的專案。
2. 左側選 **SQL Editor** → 右上 **New query**（或「+」）。
3. 打開 GitHub 上的檔案 `supabase/migrations/20260928_inquiry_events.sql`，按 **Raw** 或複製按鈕，把整段內容貼到 SQL Editor。
4. 按右下 **Run**（或 Ctrl + Enter）。
5. 下方出現 **Success. No rows returned** 就完成了。
6. 確認：左側 **Table Editor** 應該多了一張 `inquiry_events` 表（目前是空的）。

## 確認有在記錄

1. 到網站後台 → 詢價 → 任一筆「檢視」，改一下狀態後儲存。
2. 再打開同一筆，下方「處理紀錄」會出現「時間、你的帳號、狀態：新詢價 → 報價中」。

## 如果要還原

在 SQL Editor 執行下面這行即可（會刪除所有處理紀錄，詢價單本身不受影響）：

```sql
drop table if exists public.inquiry_events;
```

## 說明

- 資料表只有網站伺服器可以讀寫（已開啟 RLS 並移除一般帳號權限），前台訪客無法讀取。
- 詢價單被刪除時，紀錄會保留（標示公司名稱與 Email），方便日後查是誰刪的。
