// GPT年齢（第1層 実測）。最初の会話の create_time から算出する。
//
// 重要な注意（CLAUDE.md 厳守）: これは「モデルが歳をとった」ことを意味しない。モデルの重みは
// 変化しない。実体は「最初に記録された会話からの経過日数 = ユーザーの利用歴」である。
// 「あなたのGPTは○歳」と表示すると暗黙の偽の主張になるため、UI では
// 「最初の会話からの経過」と表現する。

import type { LinearizedConversation } from '../types';

export interface GptAgeResult {
  firstTimestamp: number | null; // Unix 秒（最古の有効タイムスタンプ）
  firstDateISO: string | null;
  ageDays: number | null;
}

// 会話レベルとノードレベル両方の create_time から最小値を取る
// （トップレベル create_time 欠落への保険）。null/0/NaN/負値は無視。
export function computeGptAge(
  convs: LinearizedConversation[],
  nowSeconds: number = Date.now() / 1000,
): GptAgeResult {
  let min = Infinity;
  const consider = (t: number | null | undefined) => {
    if (typeof t === 'number' && Number.isFinite(t) && t > 0 && t < min) min = t;
  };
  for (const c of convs) {
    consider(c.create_time);
    for (const m of c.messages) consider(m.create_time);
  }
  if (!Number.isFinite(min)) {
    return { firstTimestamp: null, firstDateISO: null, ageDays: null };
  }
  const ageDays = Math.max(0, Math.floor((nowSeconds - min) / 86400));
  return {
    firstTimestamp: min,
    firstDateISO: new Date(min * 1000).toISOString(),
    ageDays,
  };
}
