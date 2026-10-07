// VG's terningkast dice, served from public/terningkast/1.svg–6.svg
export function Terningkast({ grade, size, style }: { grade: number; size: number; style?: React.CSSProperties }) {
  if (grade < 1 || grade > 6) return <span style={style}>{grade}</span>
  return (
    <img
      src={`/terningkast/${grade}.svg`}
      alt={`Terningkast ${grade}`}
      title={`Terningkast ${grade}`}
      width={size}
      height={size}
      style={{ verticalAlign: 'middle', ...style }}
    />
  )
}

// Points and terningkast from VG's most recent review, or nothing when VG hasn't reviewed the product
export function VgRating({ score, grade, size = 18, style }: {
  score: number | null
  grade: number | null
  size?: number
  style?: React.CSSProperties
}) {
  if (score == null || grade == null) return null
  return (
    <span style={{ whiteSpace: 'nowrap', ...style }} title={`VG: ${score} poeng, terningkast ${grade}`}>
      <span style={{ fontWeight: 600 }}>{score}</span>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}> p</span>
      <Terningkast grade={grade} size={size} style={{ marginLeft: '0.35rem' }} />
    </span>
  )
}
