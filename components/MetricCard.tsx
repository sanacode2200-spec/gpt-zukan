import { LAYER_LABEL, type Layer } from '@/lib/layer';

// 1つの指標カード。layer タグを必ず表示し、第2/3層と混同させない（指標の3層分離・厳守）。
export default function MetricCard({
  label,
  value,
  unit,
  caption,
  layer = 'measured',
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  layer?: Layer;
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
