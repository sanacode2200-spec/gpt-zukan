import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseExport } from '../lib/parse';

const fixturePath = fileURLToPath(
  new URL('./fixtures/conversations.sample.json', import.meta.url),
);
const raw = readFileSync(fixturePath, 'utf-8');
const convs = parseExport(raw);

test('全会話を線形化する（メッセージを持つもの 5 件）', () => {
  assert.equal(convs.length, 5);
});

test('分岐処理: current_node の最新経路を辿り、放棄された分岐を除外する', () => {
  const c1 = convs.find((c) => c.id === 'conv-0001-code-js')!;
  const texts = c1.messages.map((m) => m.text);
  assert.ok(
    texts.includes('違う、そうじゃなくて。やり直して。'),
    '最新経路の user メッセージが含まれる',
  );
  assert.ok(texts.includes('失礼しました。修正版です。'), '最新の assistant が含まれる');
  assert.ok(
    !texts.some((t) => t.includes('これでいい、ありがとう')),
    '放棄された分岐 (c1-n3b) は除外される',
  );
  // 線形化経路 = n1(user) n2(assistant) n3(user) n4(assistant)。system(n0) は除外。
  assert.equal(c1.messages.length, 4);
});

test('system / カスタム指示ノードを除外する', () => {
  const c1 = convs.find((c) => c.id === 'conv-0001-code-js')!;
  assert.ok(c1.messages.every((m) => m.role === 'user' || m.role === 'assistant'));
});

test('最新経路上の user メッセージ総数 = 7（放棄分岐を含む 8 ではない）', () => {
  const users = convs.flatMap((c) => c.messages.filter((m) => m.role === 'user'));
  assert.equal(users.length, 7);
});

test('multimodal: テキストパートのみ抽出し image_asset_pointer は無視、例外を投げない', () => {
  const c4 = convs.find((c) => c.id === 'conv-0004-chat-multimodal')!;
  const userMsg = c4.messages.find((m) => m.role === 'user')!;
  assert.equal(userMsg.text, 'これ何の花か分かる？暇つぶしに聞いてるだけ。');
});

test('create_time を Unix 秒として保持する', () => {
  const c1 = convs.find((c) => c.id === 'conv-0001-code-js')!;
  assert.equal(c1.messages[0]!.create_time, 1704067260.0);
});
