// next.config.mjs
// 静的エクスポート（Cloudflare Pages 向け）。SSR/サーバーランタイムを一切持たない。
// 全ルートがビルド時に HTML/JS へ事前生成され、静的アセットとして配信される。
// = アップロードを受け取れるサーバーエンドポイントがそもそも存在しない、という
//   「生ログを一切サーバー送信しない」保証のアーキテクチャ的な土台でもある。
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ./out へ完全な静的サイトを出力する。このフォルダを Cloudflare Pages にデプロイする。
  output: 'export',

  // next/image のデフォルトローダーはサーバー最適化を要求し、静的エクスポートには存在しない。
  images: { unoptimized: true },

  // Cloudflare Pages は /foo を /foo/index.html として配信する。リンクと出力ツリーの整合用。
  trailingSlash: true,

  reactStrictMode: true,

  // 型エラーはビルドを止める（本質的価値＝計算の正しさを守るため厳格に）。
  typescript: { ignoreBuildErrors: false },

  // ESLint は MVP では未設定。lint 不在でビルドが止まらないようスキップ（将来 flat config を追加）。
  eslint: { ignoreDuringBuilds: true },

  // 注: COOP/COEP ヘッダ（将来 WASM/SharedArrayBuffer 用）が必要になったら
  // next.config ではなく public/_headers に置く（export はヘッダを出力できない）。
};

export default nextConfig;
