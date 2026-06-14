// テーマ比率（第1層 実測 / ルールベース分類）。会話ごとにキーワードで分類し、分布を出す。
// MVP の仮実装。将来は埋め込みクラスタリングに置き換える（CLAUDE.md の方針）。
// 「キーワード分類(簡易)」とラベリングし、0 ヒットは正直に「その他」に入れる。

import type { LinearizedConversation } from '../types';
import { stripCode } from '../text';

interface ThemeDef {
  theme: string;
  keywords: string[];
}

// 同点時の優先順位（具体的なテーマを汎用より先に。雑談は最後）。
const THEME_PRIORITY = ['コード', '健康', '仕事', '創作', '学習', '文章作成', '生活', '雑談'];

const TAXONOMY: ThemeDef[] = [
  {
    theme: 'コード',
    keywords: [
      'code', 'bug', 'function', '関数', 'エラー', 'error', 'api', 'react', 'python',
      'javascript', 'typescript', 'sql', 'git', 'デバッグ', 'debug', '実装', 'リファクタ',
      'refactor', 'コンパイル', '変数', 'クラス', 'class', 'npm', 'docker', 'デプロイ',
      'deploy', 'コード', 'プログラム', 'regex', '正規表現', 'json',
    ],
  },
  {
    theme: '仕事',
    keywords: [
      '会議', 'ミーティング', 'meeting', '資料', 'プレゼン', 'メール', 'mail', '上司',
      '顧客', 'client', 'manager', '売上', '契約', '稟議', '報告書', '議事録', 'スケジュール',
      'タスク', 'プロジェクト', 'project', 'ビジネス', 'business', 'kpi', '営業', 'status update',
    ],
  },
  {
    theme: '健康',
    keywords: [
      '健康', 'health', '症状', '薬', 'medicine', '病院', '医者', 'doctor', '痛い', '肩こり',
      '頭痛', 'ストレス', 'stress', '睡眠', 'sleep', 'ダイエット', 'diet', '運動', 'exercise',
      'メンタル', '不安', 'anxiety', 'うつ', '体調', '栄養', 'カロリー',
    ],
  },
  {
    theme: '学習',
    keywords: [
      '勉強', '学習', 'study', 'learn', '教えて', 'teach', '意味', '定義', '違いは', 'とは',
      '講座', '試験', 'exam', '資格', '英語', '数学', 'math', '歴史', '理解', '概念', '概要',
      'tutorial', '入門',
    ],
  },
  {
    theme: '創作',
    keywords: [
      '小説', '物語', 'story', 'novel', '詩', 'poem', '脚本', 'キャラ', 'character', '世界観',
      'プロット', 'plot', '作詞', '歌詞', 'lyrics', 'イラスト', 'brainstorm', 'fiction', '創作',
      '設定', 'ネーミング', 'タイトル案',
    ],
  },
  {
    theme: '雑談',
    keywords: [
      'こんにちは', 'hi', 'hello', '暇', 'どう思う', '面白い', 'funny', '雑談', 'おしゃべり',
      'chat', 'ねえ', '好き', '嫌い', '趣味', 'ゲーム', 'game', '映画', 'movie', 'アニメ',
      'anime', '音楽', 'music', '天気',
    ],
  },
  {
    theme: '文章作成',
    keywords: [
      '文章', '校正', '添削', 'proofread', '翻訳', 'translate', '要約', 'summarize', 'summary',
      'リライト', 'rewrite', 'ブログ', 'blog', '記事', 'article', '敬語', '言い換え', '推敲', '誤字',
    ],
  },
  {
    theme: '生活',
    keywords: [
      '料理', 'レシピ', 'recipe', '買い物', '旅行', 'travel', '引っ越し', '家事', '掃除', '節約',
      '家計', 'レストラン', 'おすすめ', '予約', 'ファッション', 'インテリア', 'ペット',
    ],
  },
];

const UNKNOWN_THEME = 'その他';

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAscii(s: string): boolean {
  return /^[\x00-\x7f]+$/.test(s);
}

// モジュール読み込み時に1回だけコンパイルする（会話ごと・キーワードごとの RegExp 生成を避ける）。
// ASCII キーワードはテーマ単位で1本の結合正規表現に、日本語キーワードは部分一致リストにする。
interface CompiledTheme {
  theme: string;
  priority: number;
  asciiRe: RegExp | null;
  jpKeywords: string[];
}

const COMPILED: CompiledTheme[] = TAXONOMY.map((def) => {
  const ascii = def.keywords.filter(isAscii).map(escapeRegExp);
  return {
    theme: def.theme,
    priority: THEME_PRIORITY.indexOf(def.theme),
    asciiRe: ascii.length ? new RegExp(`\\b(?:${ascii.join('|')})\\b`, 'g') : null,
    jpKeywords: def.keywords.filter((k) => !isAscii(k)),
  };
});

// haystack（NFKC + lowercase 済み）内のキーワード出現数を数える。
// ASCII は語境界一致、日本語は部分一致。
function scoreTheme(haystack: string, def: CompiledTheme): number {
  let score = def.asciiRe ? haystack.match(def.asciiRe)?.length ?? 0 : 0;
  for (const kw of def.jpKeywords) {
    let idx = 0;
    while ((idx = haystack.indexOf(kw, idx)) !== -1) {
      score++;
      idx += kw.length;
    }
  }
  return score;
}

function classifyConversation(conv: LinearizedConversation): { theme: string; score: number } {
  const raw = [conv.title, ...conv.messages.map((m) => m.text)].join('\n');
  const haystack = stripCode(raw).normalize('NFKC').toLowerCase();

  let best = { theme: UNKNOWN_THEME, score: 0, priority: Infinity };
  for (const def of COMPILED) {
    const score = scoreTheme(haystack, def);
    if (score === 0) continue;
    if (
      score > best.score ||
      (score === best.score && def.priority < best.priority)
    ) {
      best = { theme: def.theme, score, priority: def.priority };
    }
  }
  return { theme: best.theme, score: best.score };
}

export interface ThemeBucket {
  theme: string;
  count: number;
  ratio: number;
}

export interface ThemeResult {
  conversationCount: number;
  distribution: ThemeBucket[]; // count 降順
  perConversation: { id: string; title: string; theme: string; score: number }[];
}

export function computeThemeRatio(convs: LinearizedConversation[]): ThemeResult {
  const perConversation = convs.map((c) => {
    const { theme, score } = classifyConversation(c);
    return { id: c.id, title: c.title, theme, score };
  });

  const counts = new Map<string, number>();
  for (const p of perConversation) {
    counts.set(p.theme, (counts.get(p.theme) ?? 0) + 1);
  }
  const total = convs.length;
  const distribution: ThemeBucket[] = [...counts.entries()]
    .map(([theme, count]) => ({ theme, count, ratio: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);

  return { conversationCount: total, distribution, perConversation };
}
