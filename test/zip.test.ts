import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { zipSync, strToU8 } from 'fflate';
import {
  extractConversationsJson,
  decodeUtf8,
  findConversationsKey,
  ConversationsNotFoundError,
} from '../lib/zip';
import { parseExport } from '../lib/parse';

const fixturePath = fileURLToPath(
  new URL('./fixtures/conversations.sample.json', import.meta.url),
);
const jsonText = readFileSync(fixturePath, 'utf-8');

test('ネストされた conversations.json を zip から抽出する', () => {
  const zipped = zipSync({
    'someuser/conversations.json': strToU8(jsonText),
    'someuser/chat.html': strToU8('<html></html>'),
    'someuser/user.json': strToU8('{}'),
  });
  const bytes = extractConversationsJson(zipped);
  const convs = parseExport(decodeUtf8(bytes));
  assert.equal(convs.length, 5);
});

test('トップレベル直下の conversations.json も抽出する', () => {
  const zipped = zipSync({ 'conversations.json': strToU8(jsonText) });
  const bytes = extractConversationsJson(zipped);
  assert.equal(parseExport(decodeUtf8(bytes)).length, 5);
});

test('findConversationsKey: old_conversations.json に誤一致しない', () => {
  assert.equal(
    findConversationsKey(['x/old_conversations.json', 'x/conversations.json']),
    'x/conversations.json',
  );
  assert.equal(findConversationsKey(['old_conversations.json']), undefined);
});

test('conversations.json が無ければ ConversationsNotFoundError', () => {
  const zipped = zipSync({ 'someuser/other.json': strToU8('{}') });
  assert.throws(() => extractConversationsJson(zipped), ConversationsNotFoundError);
});
