// conversations.json のパーサ。mapping のツリーを「最新経路」で線形化し、
// 各メッセージを {role, text, create_time} に変換する。
//
// 設計判断: current_node から parent ポインタを辿って root まで上り、反転する方式を採用。
// 編集・再生成は分岐（1ノードが複数 children）を生むが、children[] の順序は保証されないため
// DFS（children を下る）は古い分岐を誤選択しうる。parent は単値なので、権威ある最新リーフ
// （current_node）から上る経路が一意の最新経路になる。

import type {
  LinearizedConversation,
  LinearizedMessage,
  RawConversation,
  RawMessage,
  RawNode,
  Role,
} from './types';

const KNOWN_ROLES: Role[] = ['user', 'assistant', 'system', 'tool'];

function normalizeRole(role: unknown): Role {
  return typeof role === 'string' && (KNOWN_ROLES as string[]).includes(role)
    ? (role as Role)
    : 'system'; // 未知ロールは system 扱い → 後段でフィルタされる
}

// 第1層が残すのは人間／AI の対話ターンのみ。system / hidden / tool / カスタム指示は除外。
function isVisibleContentMessage(msg: RawMessage | null | undefined): boolean {
  if (!msg) return false;
  const role = msg.author?.role;
  if (typeof role !== 'string') return false;
  if (role === 'system' || role === 'tool') return false;
  const meta = msg.metadata ?? {};
  if (meta.is_visually_hidden_from_conversation === true) return false;
  if (meta.is_user_system_message === true) return false; // カスタム指示ブロブ
  return role === 'user' || role === 'assistant';
}

// 本文抽出。プレーンな会話テキスト（content_type === 'text'）のみを第1層の対象とする。
// 非文字列パート（image_asset_pointer 等）は完全に無視する。プレースホルダ文字列を入れると
// 語数・指示密度が歪むため、'[image]' のようなトークンも一切注入しない。
export function extractText(content: RawMessage['content']): string {
  if (!content) return '';
  // 'text' に加え 'multimodal_text'（画像＋ユーザーが打った本文）も対象にする。
  // multimodal は本物のユーザー入力テキストを含むため、メッセージごと捨てると user ターンを
  // 取りこぼす。文字列パートのみ抽出し、image_asset_pointer 等の非文字列は無視する。
  // それ以外（code / execution_output / tether_* 等）は会話テキストではないので除外。
  if (content.content_type !== 'text' && content.content_type !== 'multimodal_text') {
    return '';
  }
  const parts = content.parts;
  if (!Array.isArray(parts)) return '';
  const buf: string[] = [];
  for (const p of parts) {
    if (typeof p === 'string') {
      if (p.trim() !== '') buf.push(p);
    }
    // 非文字列パートはスキップ（プレースホルダを入れない）
  }
  return buf.join('\n\n').trim();
}

// current_node が欠落／不正なときのフォールバック: 最新の message.create_time を持つ
// childless ノードを選ぶ。なければ任意の childless、最後に任意のノード。
function resolveFallbackLeaf(mapping: Record<string, RawNode>): string | null {
  let bestId: string | null = null;
  let bestT = -Infinity;
  for (const [id, node] of Object.entries(mapping)) {
    const childless = !node.children || node.children.length === 0;
    const t = node.message?.create_time;
    if (childless && typeof t === 'number' && t > bestT) {
      bestT = t;
      bestId = id;
    }
  }
  if (bestId !== null) return bestId;
  for (const [id, node] of Object.entries(mapping)) {
    if (!node.children || node.children.length === 0) return id;
  }
  const keys = Object.keys(mapping);
  return keys.length > 0 ? keys[0]! : null;
}

export function linearizeConversation(conv: RawConversation): LinearizedConversation {
  const meta = {
    id: typeof conv.id === 'string' ? conv.id : '',
    title: typeof conv.title === 'string' ? conv.title : '',
    create_time: typeof conv.create_time === 'number' ? conv.create_time : null,
    update_time: typeof conv.update_time === 'number' ? conv.update_time : null,
  };
  const mapping = conv.mapping;
  if (!mapping || Object.keys(mapping).length === 0) {
    return { ...meta, messages: [] };
  }

  // 1. 最新リーフを解決
  let leafId: string | null = conv.current_node ?? null;
  if (leafId === null || mapping[leafId] === undefined) {
    leafId = resolveFallbackLeaf(mapping);
  }
  if (leafId === null) return { ...meta, messages: [] };

  // 2. parent を辿って root まで上る（visited でサイクル防御）
  const pathIds: string[] = [];
  const visited = new Set<string>();
  let cur: string | null | undefined = leafId;
  while (cur != null && mapping[cur] !== undefined && !visited.has(cur)) {
    visited.add(cur);
    pathIds.push(cur);
    cur = mapping[cur]!.parent ?? null;
  }

  // 3. 反転して root → leaf の時系列順に
  pathIds.reverse();

  // 4. ノード → 線形化メッセージ（非コンテンツノードは除外）
  const messages: LinearizedMessage[] = [];
  for (const id of pathIds) {
    const node = mapping[id]!;
    const msg = node.message;
    if (!msg) continue; // root / プレースホルダ
    if (!isVisibleContentMessage(msg)) continue; // system / hidden / tool
    const text = extractText(msg.content);
    if (text === '') continue; // 抽出後に空
    messages.push({
      role: normalizeRole(msg.author?.role),
      text,
      create_time: typeof msg.create_time === 'number' ? msg.create_time : null,
    });
  }

  return { ...meta, messages };
}

// エクスポート全体（トップレベル配列、または JSON 文字列）を線形化済み会話の配列にする。
export function parseExport(input: unknown): LinearizedConversation[] {
  const data = typeof input === 'string' ? JSON.parse(input) : input;
  if (!Array.isArray(data)) {
    throw new Error('conversations.json: トップレベルが配列ではありません');
  }
  return data
    .map((c) => linearizeConversation(c as RawConversation))
    .filter((c) => c.messages.length > 0);
}
