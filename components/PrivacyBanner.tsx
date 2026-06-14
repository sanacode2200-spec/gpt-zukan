// 「ブラウザ内で完結／サーバー送信ゼロ」を常に明示するバナー。信頼と差別化の核（CLAUDE.md）。
export default function PrivacyBanner() {
  return (
    <div className="privacy-banner">
      <span className="badge" aria-hidden>
        🔒
      </span>
      <span className="text">
        <strong>すべての解析はあなたのブラウザ内で完結します。</strong>
        <br />
        <span className="sub">
          会話ログはサーバーに一切送信されません。このサイトは静的ファイルのみで動作し、
          アップロードを受け取るサーバーは存在しません。
        </span>
      </span>
    </div>
  );
}
