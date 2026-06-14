// zip 内の conversations.json をブラウザ内で抽出する。解凍をユーザーに要求しない（摩擦最小化）。
// fflate（依存ゼロ・軽量・ブラウザ/Node 両対応）を使用。すべてメモリ内で完結し、
// File は fetch/XHR に一切渡さない（生ログをサーバー送信しない保証の一部）。

import { unzipSync } from 'fflate';

export class ConversationsNotFoundError extends Error {
  constructor(message = 'zip 内に conversations.json が見つかりませんでした') {
    super(message);
    this.name = 'ConversationsNotFoundError';
  }
}

// ChatGPT エクスポートは 'someuser/conversations.json' のようにネストされる場合があるため
// サフィックス一致で探す。ただし 'old_conversations.json' のような誤一致を避けるため、
// 完全一致 または '/conversations.json' で終わるもののみ。
export function findConversationsKey(names: string[]): string | undefined {
  return names.find(
    (k) => k === 'conversations.json' || k.endsWith('/conversations.json'),
  );
}

// zip バイト列から conversations.json のバイト列を取り出す。ブラウザ非依存（Uint8Array in/out）。
export function extractConversationsJson(zipBytes: Uint8Array): Uint8Array {
  // filter で対象エントリのみ解凍し、無関係なエントリの展開を避ける。
  const files = unzipSync(zipBytes, {
    filter: (f) =>
      f.name === 'conversations.json' || f.name.endsWith('/conversations.json'),
  });
  const key = findConversationsKey(Object.keys(files));
  if (!key) throw new ConversationsNotFoundError();
  return files[key]!;
}

// バイト列を UTF-8 文字列にデコード（ブラウザ/Node 共通）。
export function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8').decode(bytes);
}
