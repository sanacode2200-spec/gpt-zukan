'use client';

import { useState } from 'react';
import Dropzone from '@/components/Dropzone';
import PrivacyBanner from '@/components/PrivacyBanner';
import MetricCard from '@/components/MetricCard';
import { extractConversationsJson, decodeUtf8 } from '@/lib/zip';
import { parseExport } from '@/lib/parse';
import { computeMetrics, type MetricsResult } from '@/lib/metrics/index';
import { deriveUserType } from '@/lib/typeName';
import ZukanCard from '@/components/ZukanCard';
import { LAYER_LABEL } from '@/lib/layer';

type Status = 'idle' | 'working' | 'done' | 'error';

// 先頭 2 バイトが 'PK'(0x50 0x4b) なら zip。
function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

// ライブラリの英語エラーをそのまま日本語 UI に出さない。原文は console に残す。
function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/invalid zip|zip data|incorrect header|compress/i.test(msg)) {
    return 'zip ファイルが壊れているか、対応していない形式です。ChatGPT のエクスポート zip を選んでください。';
  }
  if (/JSON|Unexpected (token|end|non-whitespace)/i.test(msg)) {
    return 'conversations.json の形式が不正です。正しいエクスポートファイルか確認してください。';
  }
  return msg; // 自前の日本語メッセージ（会話が見つかりません 等）はそのまま表示
}

export default function Home() {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');
  const [metrics, setMetrics] = useState<MetricsResult | null>(null);
  const [fileName, setFileName] = useState<string>('');

  async function handleFile(file: File) {
    setStatus('working');
    setError('');
    setMetrics(null);
    setFileName(file.name);
    try {
      // すべてメモリ内。File は fetch/XHR に渡さない。
      // NOTE(MVP既知のトレードオフ): 下の unzip→parse→computeMetrics は同期実行のため、
      // 数百MB級の巨大エクスポートでは UI スレッドが数秒フリーズしうる。次フェーズで Web Worker
      // へ移す（Worker 内処理もクライアント完結のままで、サーバー送信ゼロは損なわない）。
      const bytes = new Uint8Array(await file.arrayBuffer());
      const jsonText = isZip(bytes)
        ? decodeUtf8(extractConversationsJson(bytes))
        : decodeUtf8(bytes);
      if (jsonText.trim() === '') {
        throw new Error('ファイルが空です。conversations.json を含むエクスポートを選んでください。');
      }
      const convs = parseExport(jsonText);
      if (convs.length === 0) {
        throw new Error(
          '会話が見つかりませんでした。conversations.json か、それを含む zip を選んでください。',
        );
      }
      setMetrics(computeMetrics(convs));
      setStatus('done');
    } catch (e) {
      console.error(e); // 原文（英語）はデバッグ用にコンソールへ
      setError(friendlyError(e));
      setStatus('error');
    }
  }

  return (
    <main className="container">
      <h1 className="title">GPT育成図鑑</h1>
      <p className="subtitle">
        ChatGPTのエクスポートから「あなた自身のAI活用スタイル」を定量化する。
        測定するのはモデルの人格ではなく、あなたのAIとの関わり方です。
      </p>

      <PrivacyBanner />

      <Dropzone onFile={handleFile} disabled={status === 'working'} />

      {status === 'working' && (
        <div className="status">解析中… ({fileName})</div>
      )}
      {status === 'error' && (
        <div className="status error">エラー: {error}</div>
      )}

      {status === 'done' && metrics && <Metrics metrics={metrics} />}

      <p className="footer-note">
        すべての指標は conversations.json からの計算で導出した第1層（実測）です。
        モデルに自己申告させた値は一切使っていません。命令形比率・修正要求率はヒューリスティック検出のため
        参考値として表示しています。テーマ分類はキーワードベースの簡易版です。
      </p>
    </main>
  );
}

function Metrics({ metrics }: { metrics: MetricsResult }) {
  const { gptAge, instructionDensity, correction, themes } = metrics;
  const userType = deriveUserType(metrics);
  const ageDate = gptAge.firstDateISO
    ? gptAge.firstDateISO.slice(0, 10)
    : '不明';

  return (
    <section>
      <div className="metrics-head">
        <h2>あなたのタイプ</h2>
        <span className="meta">
          会話 {metrics.conversationCount} 件 / ユーザー発話{' '}
          {metrics.userMessageCount} 件
        </span>
      </div>

      <ZukanCard metrics={metrics} userType={userType} />

      <div className="metrics-head">
        <h2 style={{ fontSize: 16 }}>内訳（第1層 実測）</h2>
      </div>

      <div className="grid">
        <MetricCard
          layer="measured"
          label="最初の会話からの経過"
          value={gptAge.ageDays !== null ? String(gptAge.ageDays) : '—'}
          unit="日"
          caption={`最初の会話: ${ageDate}（モデルが歳をとるのではなく、あなたの利用歴です）`}
        />
        <MetricCard
          layer="measured"
          label="指示密度（平均トークン数 / メッセージ）"
          value={instructionDensity.avgTokensPerUserMessage.toFixed(1)}
          unit="トークン"
          caption="単位は形態素＋語。1メッセージあたりの情報量の目安です。"
        />
        <MetricCard
          layer="measured"
          label="指示的トーン（命令形・依頼の比率）"
          value={pct(instructionDensity.imperativeRatio)}
          caption={`ユーザー発話 ${instructionDensity.userMessageCount} 件中 ${instructionDensity.imperativeCount} 件。ヒューリスティック検出の参考値。`}
        />
        <MetricCard
          layer="measured"
          label="修正要求率（やり直し・修正のサイン）"
          value={pct(correction.rate)}
          caption={`${correction.correctionCount} 件で「違う／やり直して」等を検出。参考値。`}
        />
      </div>

      <div className="metrics-head">
        <h2 style={{ fontSize: 16 }}>テーマ比率</h2>
        <span className="meta">キーワード分類（簡易）</span>
      </div>
      <div className="card">
        <span className="layer-tag">{LAYER_LABEL.measured}</span>
        {themes.distribution.map((d) => (
          <div className="theme-row" key={d.theme}>
            <span className="name">{d.theme}</span>
            <span className="bar">
              <span style={{ width: pct(d.ratio) }} />
            </span>
            <span className="pct">
              {d.count}件 {pct(d.ratio)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
