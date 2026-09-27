// 網站共用線條圖示（D9：取代 emoji，各平台顯示一致）
// 自行繪製的 24×24 線條圖示，顏色跟隨文字顏色（currentColor）
import type { ReactNode } from 'react';

export type IconName =
  | 'factory'
  | 'clipboard'
  | 'wrench'
  | 'globe'
  | 'chat'
  | 'package'
  | 'mail'
  | 'phone'
  | 'map-pin'
  | 'clock'
  | 'shield-check';

const paths: Record<IconName, ReactNode> = {
  factory: <path d="M2 20h20M4 20V10l5 3v-3l5 3V6l6 4v10M8 16h2M14 16h2" />,
  clipboard: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h4" />
    </>
  ),
  wrench: <path d="M15 4a5 5 0 0 0-4.6 6.9L4 17.3 6.7 20l6.4-6.4A5 5 0 0 0 20 9l-3 1-2-2 1-3Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M3 12h18" />
    </>
  ),
  chat: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />,
  package: <path d="M3 7l9-4 9 4v10l-9 4-9-4V7Zm0 0 9 4 9-4M12 11v10" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  phone: <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z" />,
  'map-pin': (
    <>
      <path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  'shield-check': <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Zm-3.5 9 2.5 2.5 4.5-4.5" />,
};

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
