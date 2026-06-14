// 指示密度（第1層 実測）: (a) 1ユーザーメッセージあたりの語数、(b) 命令形比率。
//
// 命令形検出はヒューリスティック。引用・ナレーション・完了形（〜してしまった）等で誤検出しうる。
// 文法的精度を主張せず、UI では「指示的トーン(推定的検出)」のように控えめにラベリングする。
// これは第1層の「実測ビルディングブロック」であり、第2層の推定（人格形成要因）の入力になる。

import type { LinearizedConversation } from '../types';
import { countTokens, stripCode } from '../text';

// 日本語の命令／依頼パターン（節末に現れることが多い）
const JP_IMPERATIVE: RegExp[] = [
  /(?:し|せ)ろ(?:[!！。、\s]|$)/, // 〜しろ
  /せよ(?:[!！。、\s]|$)/, // 〜せよ
  /なさい(?:[!！。、\s]|$)/, // 〜なさい
  /して(?:ください|下さい)/, // 〜してください
  /してくれ(?:る|ない)?(?:[。!！?？、\s]|$)/, // 〜してくれ
  /して(?:ほしい|欲しい)/, // 〜してほしい（依頼）
  /お願い(?:します)?(?:[。!！\s]|$)/, // お願い（柔らかい指示）
  // 口語の節末て形コマンド（直して。/教えて。/やって。 等）。
  // て の直前が かな/漢字 で、直後が文末であることを要求し、している/してから 等を除外。
  /[ぁ-んァ-ヶ一-龥]て(?:ね|よ)?(?=[。.!！?？\s]|$)/,
];

// 英語の命令／依頼パターン（行/節の先頭）
const EN_IMPERATIVE: RegExp[] = [
  /^\s*(?:please\s+)?(?:write|make|create|build|fix|explain|give|show|list|generate|add|remove|delete|update|change|refactor|rewrite|translate|summarize|summarise|find|check|review|debug|implement|convert|format|optimize|optimise|describe|compare|calculate|tell|help|set|run|test|draw|design|plan|define|analyze|analyse|improve|sort|count|extract|provide|suggest|recommend|do)\b/i,
  /^\s*(?:can|could|would|will)\s+you\b/i, // can/could/would you ...（丁寧な指示）
  /^\s*let'?s\s+\w+/i, // let's ...
];

// 1ユーザーメッセージが命令的かを判定（いずれか一致で true）。
export function isImperative(raw: string): boolean {
  const text = stripCode(raw).trim();
  if (!text) return false;
  for (const re of JP_IMPERATIVE) if (re.test(text)) return true;
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    for (const re of EN_IMPERATIVE) if (re.test(line)) return true;
  }
  return false;
}

export interface InstructionDensityResult {
  userMessageCount: number;
  totalTokens: number;
  avgTokensPerUserMessage: number; // 単位: トークン（形態素＋語）
  imperativeCount: number;
  imperativeRatio: number;
}

export function computeInstructionDensity(
  convs: LinearizedConversation[],
): InstructionDensityResult {
  const userMsgs = convs.flatMap((c) => c.messages.filter((m) => m.role === 'user'));
  let totalTokens = 0;
  let imperativeCount = 0;
  for (const m of userMsgs) {
    totalTokens += countTokens(stripCode(m.text));
    if (isImperative(m.text)) imperativeCount++;
  }
  const n = userMsgs.length;
  return {
    userMessageCount: n,
    totalTokens,
    avgTokensPerUserMessage: n ? totalTokens / n : 0,
    imperativeCount,
    imperativeRatio: n ? imperativeCount / n : 0,
  };
}
