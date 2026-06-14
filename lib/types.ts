// conversations.json の生データ型（エクスポートは厳密に型付けされていないため緩く定義）。
// すべての指標はこの生データ「からの計算による導出」のみで作る。モデルの自己申告は一切使わない。

export type RawRole = 'user' | 'assistant' | 'system' | 'tool' | (string & {});

export interface RawMessage {
  id?: string;
  author?: { role?: RawRole } | null;
  content?: {
    content_type?: string;
    parts?: unknown[];
  } | null;
  create_time?: number | null;
  metadata?: {
    is_visually_hidden_from_conversation?: boolean;
    is_user_system_message?: boolean;
    [k: string]: unknown;
  } | null;
}

export interface RawNode {
  id?: string;
  parent?: string | null;
  children?: string[];
  message?: RawMessage | null;
}

export interface RawConversation {
  id?: string;
  title?: string;
  create_time?: number | null;
  update_time?: number | null;
  current_node?: string | null;
  mapping?: Record<string, RawNode>;
}

// 線形化済み（クリーン）モデル。第1層メトリクスはこれだけを消費する。
export type Role = 'user' | 'assistant' | 'system' | 'tool';

export interface LinearizedMessage {
  role: Role; // 正規化済み author.role。第1層では実質 user / assistant のみ残る。
  text: string; // text パートを連結・トリムした本文。出力されるメッセージは必ず非空。
  create_time: number | null; // Unix 秒。元が null/欠落なら null。
}

export interface LinearizedConversation {
  id: string;
  title: string;
  create_time: number | null;
  update_time: number | null;
  messages: LinearizedMessage[];
}
