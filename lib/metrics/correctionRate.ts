// 修正要求率（第1層 実測）: 「違う」「やり直して」「そうじゃなくて」等のパターンを含む
// ユーザーメッセージの割合。ヒューリスティックなので「やり直し・修正のサイン検出(参考値)」
// として控えめにラベリングする。
//
// 注意: 初出の依頼（例「このコードを直して」）は修正要求ではないため、単独の「直して/修正して」は
// 含めない。「違い(名詞)」と「違う(述語)」を取り違えないよう、う を含む語幹で限定する。

import type { LinearizedConversation } from '../types';
import { stripCode } from '../text';

const CORRECTION: RegExp[] = [
  /違う|ちがう|違います/, // 違う（述語）。「違い」名詞は う が無いので一致しない
  /やり?直(?:し|して|す)/, // やり直し / やり直して
  /(?:そう)?じゃなくて|そうではなく|ではなく/, // そうじゃなくて / ではなく
  /間違(?:って|い|え)|まちが(?:って|い)/, // 間違って / 間違い
  /違(?:くて|って)/, // 違くて / 違って（口語）
  /(?:そう|それ|これ)じゃない/, // そうじゃない 等
  /おかしい/, // 出力がおかしい
  /^\s*(?:no|nope)\b[,.\s！？!?]/i, // 文頭の no / nope
  /(?:that'?s|that is|it'?s|you'?re|you are)\s+(?:wrong|incorrect|not right)/i,
  /not what i\s+(?:asked|meant|wanted|said|need)/i,
  /\b(?:redo|try again|do it again|start over)\b/i,
  /(?:that'?s not|this isn'?t)\b/i,
];

export function isCorrection(raw: string): boolean {
  const text = stripCode(raw);
  return CORRECTION.some((re) => re.test(text));
}

export interface CorrectionResult {
  userMessageCount: number;
  correctionCount: number;
  rate: number;
}

export function computeCorrectionRate(
  convs: LinearizedConversation[],
): CorrectionResult {
  const userMsgs = convs.flatMap((c) => c.messages.filter((m) => m.role === 'user'));
  let correctionCount = 0;
  for (const m of userMsgs) if (isCorrection(m.text)) correctionCount++;
  const n = userMsgs.length;
  return { userMessageCount: n, correctionCount, rate: n ? correctionCount / n : 0 };
}
