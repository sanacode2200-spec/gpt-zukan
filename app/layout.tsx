import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GPT育成図鑑',
  description:
    'ChatGPTのエクスポートログから、あなた自身のAI活用スタイルを定量化・可視化する。すべてブラウザ内で完結し、会話ログはサーバーに一切送信されません。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
