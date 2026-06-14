import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseExport } from '../lib/parse';
import { computeMetrics } from '../lib/metrics/index';
import { isImperative } from '../lib/metrics/instructionDensity';
import { isCorrection } from '../lib/metrics/correctionRate';

const fixturePath = fileURLToPath(
  new URL('./fixtures/conversations.sample.json', import.meta.url),
);
const convs = parseExport(readFileSync(fixturePath, 'utf-8'));

// 最後の会話の 1 日後を「現在」として固定し、年齢を決定的にする。
const NOW = 1718323200 + 86400;
const m = computeMetrics(convs, NOW);

test('集計の基本カウント', () => {
  assert.equal(m.conversationCount, 5);
  assert.equal(m.userMessageCount, 7);
  assert.equal(m.assistantMessageCount, 6);
});

test('GPT年齢: 最古の create_time をアンカーにする', () => {
  assert.equal(m.gptAge.firstTimestamp, 1704067200);
  assert.equal(m.gptAge.ageDays, Math.floor((NOW - 1704067200) / 86400));
  assert.ok(m.gptAge.ageDays! > 0);
});

test('修正要求率: 該当は c1-n3 のみ = 1/7', () => {
  assert.equal(m.correction.correctionCount, 1);
  assert.ok(Math.abs(m.correction.rate - 1 / 7) < 1e-9);
});

test('命令形比率: フィクスチャでは 7 件中 6 件が命令的', () => {
  assert.equal(m.instructionDensity.imperativeCount, 6);
  assert.ok(Math.abs(m.instructionDensity.imperativeRatio - 6 / 7) < 1e-9);
});

test('指示密度: 平均トークン数は正の有限値', () => {
  assert.ok(m.instructionDensity.avgTokensPerUserMessage > 0);
  assert.ok(Number.isFinite(m.instructionDensity.avgTokensPerUserMessage));
});

test('テーマ比率: コード 2 / 仕事 1 / 健康 1 / 雑談 1', () => {
  const byTheme = new Map(m.themes.distribution.map((d) => [d.theme, d.count]));
  assert.equal(byTheme.get('コード'), 2);
  assert.equal(byTheme.get('仕事'), 1);
  assert.equal(byTheme.get('健康'), 1);
  assert.equal(byTheme.get('雑談'), 1);
  // 全会話が分類され、合計は会話数に一致する
  const total = m.themes.distribution.reduce((s, d) => s + d.count, 0);
  assert.equal(total, 5);
});

// --- ヒューリスティック単体（誤検出の境界を固定）---

test('isImperative: 既知の命令／非命令を正しく分類', () => {
  assert.equal(isImperative('このJSの関数を直して。'), true);
  assert.equal(isImperative('原因を教えて。'), true);
  assert.equal(isImperative('Write a regex to match email addresses.'), true);
  assert.equal(isImperative('Make it more formal please.'), true);
  // 非命令（質問・継続形）
  assert.equal(isImperative('これ何の花か分かる？暇つぶしに聞いてるだけ。'), false);
  assert.equal(isImperative('昨日それをしてしまった。'), false);
});

test('isCorrection: 初出依頼を誤検出しない', () => {
  assert.equal(isCorrection('違う、そうじゃなくて。やり直して。'), true);
  // 「このJSの関数を直して」は初出の依頼であり修正要求ではない
  assert.equal(isCorrection('このJSの関数を直して。バグってる。'), false);
  assert.equal(isCorrection("No, that's wrong."), true);
});
