'use client';

import { useCallback, useRef, useState } from 'react';

// zip またはそのままの conversations.json を受け取るドラッグ&ドロップ。
// File はネットワークに一切渡さない。読み取りは page 側で arrayBuffer() を使い完全にメモリ内。
export default function Dropzone({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div
      className={`dropzone${drag ? ' drag' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
    >
      <div className="big">
        ChatGPTのエクスポート（.zip）をここにドロップ
      </div>
      <div className="small">
        またはクリックして選択 — 解凍は不要です。zip 内の conversations.json を自動で読み取ります。
        <br />
        （展開済みの conversations.json をそのまま渡してもOK）
      </div>
      <div className="note">↑ ファイルはあなたの端末から外に出ません</div>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,.json,application/zip,application/json"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={disabled}
      />
    </div>
  );
}
