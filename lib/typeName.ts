// タイプ命名。実測メトリクス（第1層）から「決定的に」導出する分類ラベル。
//
// 重要（CLAUDE.md 厳守）: これはモデルの人格診断ではない。測定しているのは
// 「あなたのAIとの関わり方」であり、タイプ名はその記述。操作的定義（下の閾値）を持つので
// Bond Score 等の演出指標とは違い再現可能。ただし閾値は規範データ未蓄積のため暫定の絶対値で、
// 規範データ蓄積後はパーセンタイルベースに置き換える。
//
// 命名規則: スタイル語（作り込み×推敲の2軸）＋ 行動語（主戦テーマ）＋「型」。
//   例: 精密(作り込み高・推敲低) ＋ 設計(コード) = 「精密設計型」
//       投げっぱなし(作り込み低・推敲低) ＋ 探索(雑談) = 「投げっぱなし探索型」

import type { MetricsResult } from './metrics/index';

// 暫定閾値（規範データ蓄積後にパーセンタイルへ置換）
export const CRAFT_TOKENS_THRESHOLD = 22; // 1メッセージ平均トークンがこれ以上で「作り込み高」
export const ITERATE_CORRECTION_THRESHOLD = 0.12; // 修正要求率がこれ以上で「推敲・軌道修正する」
export const LEAD_IMPERATIVE_THRESHOLD = 0.45; // 命令形比率がこれ以上で「主導的」

type Axis = 'high' | 'low';

// 主戦テーマ → 行動語
const THEME_ACTION: Record<string, string> = {
  コード: '設計',
  仕事: '遂行',
  健康: '内省',
  学習: '探求',
  創作: '創造',
  文章作成: '推敲',
  生活: '段取り',
  雑談: '探索',
  その他: '雑食',
};

export interface UserType {
  name: string; // 「精密設計型」
  styleWord: string; // 「精密」
  actionWord: string; // 「設計」
  dominantTheme: string;
  dominantThemeRatio: number;
  tagline: string;
  traits: string[];
  axes: { craft: Axis; lead: Axis; iterate: Axis };
}

export function deriveUserType(m: MetricsResult): UserType {
  const craft: Axis =
    m.instructionDensity.avgTokensPerUserMessage >= CRAFT_TOKENS_THRESHOLD
      ? 'high'
      : 'low';
  const lead: Axis =
    m.instructionDensity.imperativeRatio >= LEAD_IMPERATIVE_THRESHOLD
      ? 'high'
      : 'low';
  const iterate: Axis =
    m.correction.rate >= ITERATE_CORRECTION_THRESHOLD ? 'high' : 'low';

  // スタイル語: 作り込み × 推敲
  let styleWord: string;
  if (craft === 'high') styleWord = iterate === 'high' ? '緻密' : '精密';
  else styleWord = iterate === 'high' ? '直感' : '投げっぱなし';

  const top = m.themes.distribution[0];
  const dominantTheme = top?.theme ?? 'その他';
  const actionWord = THEME_ACTION[dominantTheme] ?? '雑食';
  const name = `${styleWord}${actionWord}型`;

  const traits = [
    lead === 'high' ? '主導的に指示を出す' : '相談・委任しながら進める',
    iterate === 'high'
      ? '違和感があれば言い直して軌道修正する'
      : '出力をそのまま受け取りがち',
    craft === 'high' ? '1メッセージに情報を詰めて設計する' : '短く投げて対話で詰める',
  ];

  const tagline = `主戦場は「${dominantTheme}」。${traits[0]}、${traits[2]}スタイル。`;

  return {
    name,
    styleWord,
    actionWord,
    dominantTheme,
    dominantThemeRatio: top?.ratio ?? 0,
    tagline,
    traits,
    axes: { craft, lead, iterate },
  };
}
