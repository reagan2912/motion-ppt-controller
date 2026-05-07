import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '모션 및 음성 인식 PPT 컨트롤러',
  description: '손동작 및 목소리로 PDF 슬라이드를 넘기는 컨트롤러',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
