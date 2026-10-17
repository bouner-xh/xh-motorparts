// 把結構化資料（JSON-LD）轉成可安全放進 script 標籤的字串（SX-12）
// 把 < 轉成 <，避免資料裡的結束標籤提早結束 script；JSON 解析結果不變
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
