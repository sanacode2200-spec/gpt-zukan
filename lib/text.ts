// テキスト前処理・トークン化のヘルパー。日本語＋英語混在を想定。
// 第1層メトリクス（指示密度・修正要求率・テーマ比率）が共通で使う。

// コードブロック・インラインコード・URL を除去する。
// 貼り付けたコードやログが語数・指示判定を汚さないようにするための前処理。
// 指示密度とテーマ分類で同一の前処理を適用すること。
export function stripCode(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ') // フェンス付きコードブロック
    .replace(/`[^`]*`/g, ' ') // インラインコード
    .replace(/https?:\/\/\S+/g, ' '); // URL
}

// 単語数カウント。日本語（空白区切りなし）と英語を 1 パスで扱う。
// 第一手段: Intl.Segmenter('ja', {granularity:'word'}) で isWordLike セグメントを数える
//   （Node 26 / モダンブラウザで動作確認済み）。
// フォールバック: 英数字ラン + CJK 文字数。Segmenter が無い環境向け（単調増加で近似）。
//
// 注意: 日本語の助詞・活用語尾も word-like として数えるため、英語の「空白区切り単語」より
// ~1.5〜2倍多く出る。これは全ユーザー一貫なので相対比較には問題ない。単位は
// 「トークン（形態素＋語）」であって自然言語の「単語」ではない、と UI で明記する。

let cachedSegmenter: Intl.Segmenter | null | undefined;

function getWordSegmenter(): Intl.Segmenter | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter;
  try {
    cachedSegmenter = new Intl.Segmenter('ja', { granularity: 'word' });
  } catch {
    cachedSegmenter = null;
  }
  return cachedSegmenter;
}

// CJK 表意文字・かな（フォールバック用）
const CJK_RE = /[぀-ヿ㐀-鿿豈-﫿々〇]/g;
// 英数字ラン（アポストロフィ・ハイフン連結を含む）
const EN_RE = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

export function countTokens(text: string): number {
  if (!text) return 0;
  const seg = getWordSegmenter();
  if (seg) {
    let n = 0;
    for (const part of seg.segment(text)) {
      if ((part as Intl.SegmentData).isWordLike) n++;
    }
    return n;
  }
  const en = text.match(EN_RE)?.length ?? 0;
  const cjk = text.match(CJK_RE)?.length ?? 0;
  return en + cjk;
}
