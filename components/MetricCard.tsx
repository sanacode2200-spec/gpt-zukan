import { LAYER_LABEL, type Layer } from '@/lib/layer';

// 1つの指標カード。layer タグを必ず表示し、第2/3層と混同させない（指標の3層分離・厳守）。
// layer は必須プロパティ。将来 第2/第3層 を追加する際に層の宣言を強制し、'第1層 実測' の
// 暗黙継承を防ぐ（=指標の3層分離をコンパイル時に担保する）。
export default function MetricCard({
  label,
  value,
  unit,
  caption,
  layer,
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  layer: Layer;
}) {
  return (
    <div className="card">
      <span className="layer-tag">{LAYER_LABEL[layer]}</span>
      <div className="label">{label}</div>
      <div className="value">
        {value}
        {unit ? <span className="unit">{unit}</span> : null}
      </div>
      {caption ? <div className="caption">{caption}</div> : null}
    </div>
  );
}
