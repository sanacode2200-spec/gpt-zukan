// 指標の3層分離（CLAUDE.md 厳守）。すべての指標は UI 上でこのラベルで区別できるようにする。
//   measured  = 第1層 実測（計算で確実に導出可能）
//   estimated = 第2層 推定（行動から間接的に導出）— MVP では未実装
//   staged    = 第3層 演出（実測不能・装飾）— MVP では未実装
// 数値を出した瞬間に「測定した」という暗黙の主張が発生する。その主張が嘘にならない層だけを
// この MVP では出す（= measured のみ）。

export type Layer = 'measured' | 'estimated' | 'staged';

export const LAYER_LABEL: Record<Layer, string> = {
  measured: '第1層 実測',
  estimated: '第2層 推定',
  staged: '第3層 演出',
};

export const LAYER_DESCRIPTION: Record<Layer, string> = {
  measured: '会話ログからの計算で確実に導出',
  estimated: '行動パターンから間接的に推定',
  staged: '操作的定義を持たない演出指標',
};
