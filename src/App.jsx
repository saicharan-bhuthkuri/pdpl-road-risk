import { useState, useEffect, useRef } from 'react'
import networkData from './data/road_network.json'
import { computeRoutes, fetchWeather } from './router.js'

// ── helpers ────────────────────────────────────────────────────
const getRiskColor = s => s >= 0.65 ? 'var(--risk-high)' : s >= 0.35 ? 'var(--risk-med)' : 'var(--risk-low)'
const getRiskBg = s => s >= 0.65 ? 'var(--risk-high-glow)' : s >= 0.35 ? 'var(--risk-med-glow)' : 'var(--risk-low-glow)'
const getRiskLabel = s => s >= 0.65 ? 'High Risk' : s >= 0.35 ? 'Moderate' : 'Safest'
const getRibbonClass = s => s >= 0.65 ? 'ribbon-red' : s >= 0.35 ? 'ribbon-orange' : 'ribbon-green'

// ── location chips ─────────────────────────────────────────────
const CHIPS = [
  { label: '🏘 Peddapalli', val: 'Peddapalli Town' },
  { label: '🏭 Godavarikhani', val: 'Godavarikhani' },
  { label: '⚡ Ramagundam', val: 'Ramagundam' },
  { label: '🌿 Manthani', val: 'Manthani' },
  { label: '🌾 Sultanabad', val: 'Sultanabad' },
  { label: '🏥 Hospital', val: 'Peddapalli Hospital' },
  { label: '🚌 Bus Stand', val: 'Peddapalli Bus Stand' },
  { label: '🚂 Railway Station', val: 'Peddapalli Railway Station' },
  { label: '🏛 Collectorate', val: 'Peddapalli Collectorate' },
  { label: '🌉 Godavari Bridge', val: 'Godavari Bridge' },
  { label: '💧 Sabbitham Falls', val: 'Sabbitham Waterfall' },
  { label: '⚠ SH7 Kamanpur', val: 'SH7 Kamanpur Junction' },
  { label: '🏗 Karimnagar Bypass', val: 'Karimnagar Road Bypass' },
  { label: '🏗 Jagtial Road', val: 'Jagtial Road' },
]

// ── sub-components ─────────────────────────────────────────────
function WeatherBadge({ weather }) {
  if (!weather) return null
  const icons = { clear: '☀️', rainy: '🌧️', foggy: '🌫️', cloudy: '☁️' }
  const wc = weather.weather_condition
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: 'rgba(255,255,255,0.08)', borderRadius: '20px',
      padding: '4px 12px', fontSize: '12px', fontWeight: 600,
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <span style={{ fontSize: '15px' }}>{icons[wc] || '🌤'}</span>
      {wc?.toUpperCase()} · {weather.temperature_c}°C
    </div>
  )
}

function RiskBadge({ score }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: getRiskBg(score), color: getRiskColor(score),
      borderRadius: '20px', padding: '4px 12px', fontSize: '12px', fontWeight: 800,
      border: `1px solid ${getRiskColor(score)}40`, boxShadow: `0 4px 12px ${getRiskBg(score)}`
    }}>
      <span style={{ 
        width: 8, height: 8, borderRadius: '50%', background: getRiskColor(score),
        boxShadow: `0 0 8px ${getRiskColor(score)}`
      }} />
      {getRiskLabel(score)}
    </div>
  )
}

function RouteCard({ route, isRecommended, isAvoid }) {
  const [expanded, setExpanded] = useState(false)
  const km = route.total_km ?? route.km ?? 0
  const mins = route.est_minutes ?? route.mins ?? 0
  const nSegs = route.segments?.length ?? route.n_segments ?? 0
  const rbn = getRibbonClass(route.avg_risk)

  return (
    <div className="route-card animate-slide-up">
      <div className={`ribbon-glow ${rbn}`}></div>
      
      {isRecommended && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: 'var(--risk-low-glow)', color: 'var(--risk-low)', fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--risk-low)' }}>
            ✨ RECOMMENDED ROUTE
          </span>
        </div>
      )}
      
      {isAvoid && (
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ background: 'var(--risk-high-glow)', color: 'var(--risk-high)', fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 8, border: '1px solid var(--risk-high)' }}>
            🚨 AVOID (HIGHEST RISK)
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: '0 0 6px', fontSize: 18, color: '#fff', fontWeight: 700 }}>
            {route.name}
          </h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, paddingRight: 16 }}>
            {route.segments?.slice(0, 4).map(s => s.name).join(' → ')}
            {route.segments?.length > 4 ? ` → ...` : ''}
          </p>
        </div>
        <RiskBadge score={route.avg_risk} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        <div className="route-stat-box">
          <span style={{ fontSize: 20 }}>📏</span>
          <div className="route-stat-val">{km} km</div>
          <div className="route-stat-label">Distance</div>
        </div>
        <div className="route-stat-box">
          <span style={{ fontSize: 20 }}>⏱</span>
          <div className="route-stat-val">{mins} m</div>
          <div className="route-stat-label">Time</div>
        </div>
        <div className="route-stat-box">
          <span style={{ fontSize: 20 }}>🎯</span>
          <div className="route-stat-val">{route.avg_risk?.toFixed(3)}</div>
          <div className="route-stat-label">Risk</div>
        </div>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          marginTop: 16, width: '100%', background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
          padding: '8px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
          fontWeight: 600, transition: '0.2s'
        }}
        onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
        onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
      >
        {expanded ? '▲ Hide Segments' : `▼ View ${nSegs} Segments`}
      </button>

      {expanded && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {route.segments?.map((s, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 8, fontSize: 13,
              borderLeft: `3px solid ${getRiskColor(s.risk_score)}`
            }}>
              <span style={{ color: '#e2e8f0', fontWeight: 500 }}>{s.name}</span>
              <span style={{ color: getRiskColor(s.risk_score), fontWeight: 700 }}>
                {(s.risk_score * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SegmentFactorCard({ seg, weather }) {
  const wc = weather?.weather_condition || 'clear'
  return (
    <div className="route-card animate-slide-up" style={{
      borderLeft: `4px solid ${getRiskColor(seg.risk_score)}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h4 style={{ margin: 0, fontSize: 16, color: '#fff' }}>{seg.name}</h4>
        <span style={{ color: getRiskColor(seg.risk_score), fontWeight: 800, fontSize: 18 }}>
          {(seg.risk_score * 100).toFixed(0)}%
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {seg.mandal} · {wc} · {seg.road_type}
      </div>
      {seg.factors?.length > 0 && (
        <div style={{ background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 6, textTransform: 'uppercase' }}>
            Flagged ML Risk Factors
          </div>
          {seg.factors.map((f, i) => (
            <div key={i} style={{ fontSize: 13, color: '#cbd5e1', paddingLeft: 4, lineHeight: 1.6, display: 'flex', gap: 6 }}>
              <span style={{ color: 'var(--accent-blue)' }}>•</span> {f}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────
export default function App() {
  const [source, setSource] = useState('')
  const [dest, setDest] = useState('')
  const [time, setTime] = useState('now')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('recommendation')
  const [activeField, setActiveField] = useState(null)
  const [weather, setWeather] = useState(null)

  // Load live weather on mount (non-blocking)
  useEffect(() => {
    fetchWeather('now').then(setWeather).catch(() => { })
  }, [])

  const handleChipClick = (val) => {
    if (activeField === 'dest' || (!activeField && source)) {
      setDest(val)
      setActiveField(null)
    } else {
      setSource(val)
      setActiveField('dest')
    }
  }

  const handleSubmit = async () => {
    if (!source.trim() || !dest.trim()) {
      setError('Please enter both source and destination.')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    setActiveTab('recommendation')
    try {
      const data = await computeRoutes(networkData, source.trim(), dest.trim(), time || 'now')
      setResult(data)
      setWeather(data.weather)
    } catch (err) {
      setError(err.message || 'Failed to compute route.')
    } finally {
      setLoading(false)
    }
  }

  const TABS = [
    { id: 'recommendation', label: '✅ Recommendation' },
    { id: 'routes', label: '🗺 Routes' },
    { id: 'risk', label: '📊 Risk' },
    { id: 'explain', label: '⚠ Explain' },
  ]

  const wc = weather?.weather_condition

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 16px', paddingBottom: 64 }}>
      
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: 40, animation: 'floatApp 6s infinite ease-in-out' }}>
        <div style={{ fontSize: 48, marginBottom: 8 }}>🛣️</div>
        <h1 className="header-title text-gradient">Peddapalli Road Risk</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, maxWidth: 400, margin: '0 auto 16px', lineHeight: 1.5 }}>
          Predictive machine learning routing for safe travel across 550+ road segments in Peddapalli District.
        </p>
        
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Dijkstra Routing', 'ML Scoring', '14-Factor Model'].map(t => (
            <span key={t} style={{
              background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: 20, padding: '4px 12px', fontSize: 11, color: '#93c5fd', fontWeight: 600, textTransform: 'uppercase'
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Planner Card */}
      <div className="glass-panel" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#fff' }}>Plan Journey</h2>
          {wc && <WeatherBadge weather={weather} />}
        </div>

        <div className="input-group">
          <label className="input-label">📍 Source Location</label>
          <input
            className="glass-input"
            value={source}
            onChange={e => setSource(e.target.value)}
            onFocus={() => setActiveField('source')}
            placeholder="e.g. Peddapalli Town, Godavarikhani"
          />
        </div>

        <div className="input-group">
          <label className="input-label">🏁 Destination</label>
          <input
            className="glass-input"
            value={dest}
            onChange={e => setDest(e.target.value)}
            onFocus={() => setActiveField('dest')}
            placeholder="e.g. Ramagundam, NTPC Colony"
          />
        </div>

        <div className="input-group">
          <label className="input-label">⏱ Departure Time</label>
          <input
            className="glass-input"
            value={time}
            onChange={e => setTime(e.target.value)}
            placeholder="8:30 · 14:00 · 22:00 · now"
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={loading}
          style={{ animation: loading ? 'pulseGlow 1.5s infinite' : 'none' }}
        >
          {loading ? '⏳ Computing Safest Routes...' : '🔍 Analyze & Get Routes'}
        </button>

        {error && (
          <div style={{
            marginTop: 16, background: 'var(--risk-high-glow)', color: '#fca5a5',
            borderRadius: 12, padding: '12px 16px', fontSize: 13, border: '1px solid var(--risk-high)'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Quick Location Chips */}
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase' }}>
            Quick Select
          </p>
          <div className="chip-container">
            {CHIPS.map(chip => (
              <button key={chip.label} className="chip" onClick={() => handleChipClick(chip.val)}>
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Results Dashboard */}
      {result && (
        <div className="glass-panel animate-slide-up" style={{ padding: '0', background: 'rgba(20, 25, 40, 0.6)' }}>
          
          {/* Header Summary */}
          <div style={{ padding: 24, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase' }}>
              Route Analysis Complete
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>
              {result.source} <span style={{ color: 'var(--text-muted)' }}>→</span> {result.destination}
            </h2>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 12 }}>🗺 {result.routes?.length} routes found</span>
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 12 }}>📏 ~{result.direct_km}km direct</span>
            </div>
          </div>

          <div style={{ padding: '24px 20px' }}>
            {/* Custom Segmented Control */}
            <div className="segmented-control">
              {TABS.map(tab => (
                <div
                  key={tab.id}
                  className={`segment-tab ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </div>
              ))}
            </div>

            {/* TAB CONTENT */}
            
            {/* RECOMMENDATION TAB */}
            {activeTab === 'recommendation' && result.recommendation && (
              <div className="animate-slide-up">
                <RouteCard route={result.recommendation.route} isRecommended={true} />
                
                {result.recommendation.risk_cut_pct > 0 && (
                  <div style={{
                    background: 'var(--risk-low-glow)', border: '1px solid var(--risk-low)',
                    borderRadius: 16, padding: '16px', fontSize: 14, color: '#a7f3d0',
                    marginTop: 16, lineHeight: 1.6, display: 'flex', gap: 12, alignItems: 'center'
                  }}>
                    <div style={{ fontSize: 24 }}>🛡️</div>
                    <div>{result.recommendation.why}</div>
                  </div>
                )}

                {result.routes?.length > 1 && (
                  <div style={{ marginTop: 24 }}>
                    <h4 style={{ color: 'var(--text-muted)', fontSize: 12, textTransform: 'uppercase', marginBottom: 12 }}>Comparison: Route to Avoid</h4>
                    <RouteCard route={result.routes[result.routes.length - 1]} isAvoid={true} />
                  </div>
                )}
              </div>
            )}

            {/* ROUTES TAB */}
            {activeTab === 'routes' && (
              <div className="animate-slide-up">
                {result.routes?.map((route, i) => (
                  <RouteCard
                    key={i} route={route}
                    isRecommended={i === 0}
                    isAvoid={i === result.routes.length - 1 && result.routes.length > 1}
                  />
                ))}
              </div>
            )}

            {/* RISK TAB */}
            {activeTab === 'risk' && (
              <div className="animate-slide-up">
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                  Showing segments with elevated risk profiles across all computed routes.
                </p>
                {result.top_risk_segments?.length > 0 ? (
                  result.top_risk_segments.map((seg, i) => (
                    <SegmentFactorCard key={i} seg={seg} weather={result.weather} />
                  ))
                ) : (
                  <div style={{ color: '#888', fontSize: 13, textAlign: 'center', padding: 20 }}>
                    No extreme risk segments detected.
                  </div>
                )}
              </div>
            )}

            {/* EXPLAIN TAB */}
            {activeTab === 'explain' && (
              <div className="animate-slide-up">
                 <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                  Detailed factor breakdown for the <b>Safest Route</b>.
                </p>
                {result.recommendation?.route?.segments
                  ?.filter(s => s.risk_score >= 0.35)
                  ?.slice(0, 6)
                  ?.map((seg, i) => (
                    <div key={i} style={{
                      background: 'rgba(0,0,0,0.3)',
                      borderLeft: `4px solid ${getRiskColor(seg.risk_score)}`,
                      borderRadius: 12, padding: '14px 16px', marginBottom: 12, fontSize: 13
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8, color: '#fff' }}>
                        {seg.name}
                        <span style={{ background: getRiskBg(seg.risk_score), color: getRiskColor(seg.risk_score), padding: '2px 8px', borderRadius: 12, marginLeft: 'auto', fontSize: 11 }}>
                          {(seg.risk_score * 100).toFixed(0)}% risk
                        </span>
                      </div>
                      {seg.factors?.map((f, j) => (
                        <div key={j} style={{ color: '#cbd5e1', paddingLeft: 4, lineHeight: 1.6, marginBottom: 4 }}>
                          <span style={{ color: 'var(--accent-blue)' }}>•</span> {f}
                        </div>
                      ))}
                    </div>
                  )) ?? (
                    <div style={{ background: 'var(--risk-low-glow)', color: 'var(--risk-low)', padding: 20, borderRadius: 12, textAlign: 'center' }}>
                      All segments on the recommended route are low risk! ✅
                    </div>
                  )
                }
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}