import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseExport } from '../lib/parse';
import { computeMetrics, type MetricsResult } from '../lib/metrics/index';
import { deriveUserType } from '../lib/typeName';

// deriveUserType が読むフィールドだけを持つ最小の MetricsResult を作る。
function fakeMetrics(opts: {
  avgTokens: number;
  imperativeRatio: number;
  correctionRate: number;
  topTheme: string;
}): MetricsResult {
  return {
    conversationCount: 1,
    userMessageCount: 1,
    assistantMessageCount: 1,
    gptAge: { firstTimestamp: null, firstDateISO: null, ageDays: null },
    instructionDensity: {
      userMessageCount: 1,
      totalTokens: opts.avgTokens,
      avgTokensPerUserMessage: opts.avgTokens,
      imperativeCount: 0,
      imperativeRatio: opts.imperativeRatio,
    },
    correction: { userMessageCount: 1, correctionCount: 0, rate: opts.correctionRate },
    themes: {
      conversationCount: 1,
      distribution: [{ theme: opts.topTheme, count: 1, ratio: 1 }],
      perConversation: [],
    },
  };
}

test('精密設計型: 作り込み高×推敲低×テーマ=コード（CLAUDE.md の例）', () => {
  const t = deriveUserType(
    fakeMetrics({ avgTokens: 30, imperativeRatio: 0.3, correctionRate: 0.05, topTheme: 'コード' }),
  );
  assert.equal(t.name, '精密設計型');
  assert.equal(t.axes.craft, 'high');
  assert.equal(t.axes.iterate, 'low');
});

test('投げっぱなし探索型: 作り込み低×推敲低×テーマ=雑談（CLAUDE.md の例）', () => {
  const t = deriveUserType(
    fakeMetrics({ avgTokens: 6, imperativeRatio: 0.2, correctionRate: 0.0, topTheme: '雑談' }),
  );
  assert.equal(t.name, '投げっぱなし探索型');
  assert.equal(t.axes.craft, 'low');
  assert.equal(t.axes.iterate, 'low');
});

test('緻密/直感 のスタイル語切り替え（推敲軸）', () => {
  const meticulous = deriveUserType(
    fakeMetrics({ avgTokens: 40, imperativeRatio: 0.5, correctionRate: 0.3, topTheme: 'コード' }),
  );
  assert.equal(meticulous.styleWord, '緻密');
  const intuitive = deriveUserType(
    fakeMetrics({ avgTokens: 8, imperativeRatio: 0.2, correctionRate: 0.3, topTheme: '学習' }),
  );
  assert.equal(intuitive.styleWord, '直感');
  assert.equal(intuitive.actionWord, '探求');
});

test('主導性（命令形）が trait に反映される', () => {
  const lead = deriveUserType(
    fakeMetrics({ avgTokens: 10, imperativeRatio: 0.7, correctionRate: 0.0, topTheme: '仕事' }),
  );
  assert.ok(lead.traits[0]!.includes('主導的'));
  const collab = deriveUserType(
    fakeMetrics({ avgTokens: 10, imperativeRatio: 0.1, correctionRate: 0.0, topTheme: '仕事' }),
  );
  assert.ok(collab.traits[0]!.includes('委任'));
});

test('決定的: フィクスチャから常に同じタイプを導出する', () => {
  const fixturePath = fileURLToPath(
    new URL('./fixtures/conversations.sample.json', import.meta.url),
  );
  const convs = parseExport(readFileSync(fixturePath, 'utf-8'));
  const a = deriveUserType(computeMetrics(convs));
  const b = deriveUserType(computeMetrics(convs));
  assert.equal(a.name, b.name);
  assert.equal(a.dominantTheme, 'コード');
  assert.ok(a.name.endsWith('型'));
});
