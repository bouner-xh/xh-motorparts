// 網址路徑片段（分類、子分類、型號代號）的編碼與解碼
// 分類代號可能含空白或大寫（例如 CLUTCH HOUSING），組網址時一律編碼、讀取網址參數時一律解碼

export function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

// 網址參數可能已解碼或仍是編碼過的字串；無法解碼（例如含單獨的 %）時回傳原字串
export function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
