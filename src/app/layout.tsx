import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  title: 'motorcyclepartweb',
  description: 'Motorcycle parts catalog and B2B inquiry website',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-TW">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
