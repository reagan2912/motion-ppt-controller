import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '모션 인식 PPT 컨트롤러',
  description: '손동작으로 PDF 슬라이드를 넘기는 PoC',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
