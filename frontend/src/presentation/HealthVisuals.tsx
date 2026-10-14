import {useId, useState, type CSSProperties} from 'react';
import type {HealthDimension, HealthResult} from '../intelligence/types';

const scoreLabel = (score: number | null) => score === null ? 'Unknown' : `${score} / 100`;
const direction = (dimension: HealthDimension) => dimension.id === 'timeline_risk' ? 'Higher timeline risk = more risk' : 'Higher = better';

/** A bounded, present-tense value on a numeric score axis; never a time series. */
export function HealthMetric({label, score, hint, explanation, calculation, tone = 'blue', evidenceHref, compact = false}: {
  label: string; score: number | null; hint: string; explanation?: string; calculation?: string;
  tone?: 'blue' | 'amber' | 'teal'; evidenceHref?: string; compact?: boolean;
}) {
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const visible = !dismissed && (hovered || focused || pinned);
  const reveal = () => setDismissed(false);
  return <div className={`health-metric metric-${tone} ${compact ? 'compact' : ''} ${score === null ? 'metric-unknown' : ''}`} onMouseEnter={() => {setHovered(true);reveal();}} onMouseLeave={() => setHovered(false)} onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) {setFocused(false);setPinned(false);}}} onKeyDown={event => {if (event.key === 'Escape') {setPinned(false);setDismissed(true);event.stopPropagation();}}}>
    <button type="button" className="health-metric-inspect" aria-label={`${label}: ${score === null ? 'Unknown' : `${score} out of 100`}. ${hint}. Inspect value`} aria-describedby={visible ? `${id}-detail` : undefined} aria-expanded={visible} aria-controls={`${id}-detail`} onFocus={() => {setFocused(true);reveal();}} onClick={() => {setPinned(!pinned);setDismissed(pinned);}}>
      <span className="health-metric-label"><span>{label}</span><strong>{scoreLabel(score)}</strong></span>
      <span className="health-metric-plot" aria-hidden="true">
        <span className="metric-grid"><i/><i/><i/><i/><i/></span>
        {score !== null && <span className="metric-ribbon" key={score} style={{width: `${score}%`}}><span className="metric-marker"/></span>}
        {score === null && <span className="metric-no-value">Not assessed</span>}
      </span>
      <span className="health-metric-hint">{hint}</span>
    </button>
    {visible && <div className="metric-tooltip" id={`${id}-detail`} role="tooltip">
      <strong>{label} · {scoreLabel(score)}</strong><span>{hint}</span>
      {explanation && <p>{explanation}</p>}{calculation && <p className="metric-tooltip-calculation">{calculation}</p>}
    </div>}
    {evidenceHref && <a className="metric-evidence-link" href={evidenceHref}>Calculation & evidence<span aria-hidden="true">↗</span></a>}
  </div>;
}

export function DimensionVisual({dimension, evidenceHref, compact = false}: {dimension: HealthDimension; evidenceHref?: string; compact?: boolean}) {
  return <HealthMetric label={dimension.label} score={dimension.score} hint={direction(dimension)} explanation={dimension.explanation} calculation={dimension.calculation} tone={dimension.id === 'timeline_risk' ? 'amber' : dimension.id === 'blocker_health' ? 'teal' : 'blue'} evidenceHref={evidenceHref} compact={compact}/>;
}

export function HealthComparison({health, evidencePrefix = 'dashboard'}: {health: HealthResult | null; evidencePrefix?: string}) {
  const score = health?.overall_score ?? null;
  return <div className="health-comparison">
    <div className="comparison-header"><div><span className="visual-eyebrow">Evidence Health Comparison</span><div className="comparison-score" role="img" aria-label={score === null ? 'Overall project health not assessed' : `Overall evidence health ${score} out of 100`}><strong key={score}>{score ?? '—'}</strong><span>{score === null ? 'Not assessed' : '/ 100'}</span></div></div><div><h3>{health?.interpretation ?? 'Assessment unavailable'}</h3><p>{health ? `${health.assessed_dimensions} of 3 dimensions assessed` : 'No assessment is available.'}</p></div></div>
    <HealthMetric label="Overall evidence health" score={score} hint="Higher = better · not a delivery probability" explanation={health?.methodology} evidenceHref={`#${evidencePrefix}-calculation`}/>
    <div className="comparison-axis" aria-label="Score scale from 0 to 100"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div>
    <p className="comparison-note">Current evidence assessment · no historical trend</p>
    <div className="comparison-dimensions">{health ? health.dimensions.map(dimension => <DimensionVisual dimension={dimension} key={dimension.id} evidenceHref={`#${evidencePrefix}-${dimension.id}`}/>) : <p className="unknown-value">Dimension data is unavailable.</p>}</div>
  </div>;
}

/** Organic layers provide state emphasis, never a second calculation or chart. */
export function HealthPulse({score, small = false, interpretation, dimensions = []}: {score: number | null; small?: boolean; interpretation?: string; dimensions?: HealthDimension[]}) {
  const id = useId().replace(/:/g, '');
  const tone = score === null ? 'unknown' : score >= 75 ? 'good' : score >= 45 ? 'review' : 'attention';
  const style = {'--field-intensity': score === null ? .13 : .16 + (100-score)/500} as CSSProperties;
  return <div className={`health-pulse pulse-${tone} ${small ? 'pulse-small' : ''}`} style={style}>
    <div className="health-pulse-field" role="img" aria-label={score === null ? 'Overall project health not assessed' : `Overall evidence health ${score} out of 100`}>
      <svg viewBox="0 0 360 292" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-blue`} x1="35" y1="20" x2="310" y2="255" gradientUnits="userSpaceOnUse"><stop stopColor="var(--pulse-blue)" stopOpacity=".7"/><stop offset="1" stopColor="var(--pulse-blue)" stopOpacity=".08"/></linearGradient>
          <linearGradient id={`${id}-warm`} x1="265" y1="25" x2="70" y2="265" gradientUnits="userSpaceOnUse"><stop stopColor="var(--pulse-accent)" stopOpacity=".65"/><stop offset="1" stopColor="var(--pulse-accent)" stopOpacity=".09"/></linearGradient>
          <linearGradient id={`${id}-calm`} x1="310" y1="145" x2="56" y2="132" gradientUnits="userSpaceOnUse"><stop stopColor="var(--pulse-teal)" stopOpacity=".48"/><stop offset="1" stopColor="var(--pulse-teal)" stopOpacity=".12"/></linearGradient>
        </defs>
        <g className="pulse-layers" key={score}>
          <path className="pulse-layer pulse-layer-a" d="M60 97C38 59 91 28 143 47S215 11 264 44S279 109 313 139S303 207 264 216S235 275 182 251S116 271 78 237S32 206 48 164S74 130 60 97Z" fill={`url(#${id}-blue)`} stroke="var(--pulse-blue)" strokeOpacity=".18"/>
          <path className="pulse-layer pulse-layer-b" d="M72 74C115 60 123 17 171 31S214 66 261 68S322 103 300 143S326 192 293 218S238 215 204 251S158 250 123 236S61 236 53 195S70 159 54 127S41 84 72 74Z" fill={`url(#${id}-warm)`} stroke="var(--pulse-accent)" strokeOpacity=".24"/>
          <path className="pulse-layer pulse-layer-c" d="M96 66C128 43 153 78 184 56S253 43 267 80S250 127 283 154S287 210 248 220S207 212 177 235S125 221 104 206S53 173 70 143S72 85 96 66Z" fill={`url(#${id}-calm)`} stroke="var(--pulse-teal)" strokeOpacity=".3"/>
          <path className="pulse-layer pulse-layer-d" d="M90 101C115 69 153 94 181 72S251 77 253 113S278 163 256 190S202 191 178 212S115 208 110 180S68 131 90 101Z" fill={`url(#${id}-blue)`} stroke="var(--pulse-blue)" strokeOpacity=".16"/>
        </g>
      </svg>
      <div className="pulse-score-core"><span className="pulse-core-label">Evidence health</span><strong className="pulse-score" key={score}>{score ?? '—'}{score !== null && <small>/100</small>}</strong><span className="pulse-interpretation">{interpretation ?? (score === null ? 'Not assessed' : 'Current assessment')}</span></div>
    </div>
    {dimensions.length > 0 && <div className="pulse-indicators" aria-label="Current health dimension values">{dimensions.map(dimension => <div key={dimension.id} className={`pulse-indicator indicator-${dimension.id}`}><span>{dimension.label}</span><strong>{scoreLabel(dimension.score)}</strong></div>)}</div>}
  </div>;
}
