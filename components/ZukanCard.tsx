'use client';

import { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import type { MetricsResult } from '@/lib/metrics/index';
import type { UserType } from '@/lib/typeName';

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

// SNSシェア用のアイデンティティ・カード。タイプ名＋主要メトリクスを1枚に。
// 画像書き出し(html-to-image)もブラウザ内で完結。会話ログは一切外に出ない。
export default function ZukanCard({
  metrics,
  userType,
}: {
  metrics: MetricsResult;
  userType: UserType;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function download() {
    if (!cardRef.current) return;
    setBusy(true);
    setErr('');
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#0e1116',
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `gpt-zukan-${userType.name}.png`;
      a.click();
    } catch (e) {
      console.error(e);
      setErr('画像の書き出しに失敗しました。');
    } finally {
      setBusy(false);
    }
  }

  const { gptAge, instructionDensity, correction, themes } = metrics;
  const topThemes = themes.distribution.slice(0, 3);

  return (
    <div className="zukan-wrap">
      <div className="zukan-card" ref={cardRef}>
        <div className="zukan-head">
          <span className="zukan-logo">GPT育成図鑑</span>
          <span className="zukan-sub">あなたのAI活用スタイル</span>
        </div>

        <div className="zukan-type">{userType.name}</div>
        <div className="zukan-tagline">{userType.tagline}</div>

        <div className="zukan-themes">
          {topThemes.map((t) => (
            <div className="zukan-theme-row" key={t.theme}>
              <span className="name">{t.theme}</span>
              <span className="bar">
                <span style={{ width: pct(t.ratio) }} />
              </span>
              <span className="pct">{pct(t.ratio)}</span>
            </div>
          ))}
        </div>

        <div className="zukan-stats">
          <Stat
            label="経過日数"
            value={gptAge.ageDays !== null ? String(gptAge.ageDays) : '—'}
            unit="日"
          />
          <Stat
            label="指示密度"
            value={instructionDensity.avgTokensPerUserMessage.toFixed(0)}
            unit="t/msg"
          />
          <Stat label="指示的トーン" value={pct(instructionDensity.imperativeRatio)} />
          <Stat label="修正要求率" value={pct(correction.rate)} />
        </div>

        <div className="zukan-foot">
          第1層 実測 ／ 測定対象はモデルの人格ではなく、あなたの関わり方
        </div>
      </div>

      <div className="zukan-actions">
        <button className="btn" onClick={download} disabled={busy}>
          {busy ? '書き出し中…' : '画像を保存（PNG）'}
        </button>
        {err && <span className="status error">{err}</span>}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="zukan-stat">
      <div className="zukan-stat-val">
        {value}
        {unit ? <span className="u">{unit}</span> : null}
      </div>
      <div className="zukan-stat-label">{label}</div>
    </div>
  );
}
