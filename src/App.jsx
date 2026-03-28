import { useState, useEffect } from 'react'
import networkData from './data/road_network.json'
import { computeRoutes, fetchWeather } from './router.js'

// ── helpers ────────────────────────────────────────────────────
const getRiskColor = s => s >= 0.65 ? 'var(--risk-high)' : s >= 0.35 ? 'var(--risk-med)' : 'var(--risk-low)'
const getRiskBg = s => s >= 0.65 ? 'var(--risk-high-glow)' : s >= 0.35 ? 'var(--risk-med-glow)' : 'var(--risk-low-glow)'
const getRiskLabel = s => s >= 0.65 ? 'High Risk' : s >= 0.35 ? 'Moderate' : 'Safest'
const getRibbonClass = s => s >= 0.65 ? 'ribbon-red' : s >= 0.35 ? 'ribbon-orange' : 'ribbon-green'

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
]

// ── Shared UI Components ───────────────────────────────────────

function RiskBadge({ score }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '8px',
      background: getRiskBg(score), color: getRiskColor(score),
      borderRadius: '24px', padding: '6px 14px', fontSize: '13px', fontWeight: 800,
      border: `1px solid ${getRiskBg(score)}`, boxShadow: `0 4px 12px ${getRiskBg(score)}`
    }}>
      <span style={{ 
        width: 8, height: 8, borderRadius: '50%', background: getRiskColor(score),
        boxShadow: `0 0 8px ${getRiskColor(score)}`
      }} />
      {getRiskLabel(score)}
    </div>
  )
}

function WeatherBadge({ weather }) {
  if (!weather) return null
  const icons = { clear: '☀️', rainy: '🌧️', foggy: '🌫️', cloudy: '☁️' }
  const wc = weather.weather_condition
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      background: 'var(--inner-bg)', borderRadius: '24px',
      padding: '4px 14px', fontSize: '13px', fontWeight: 700,
      border: '1px solid var(--inner-border)', color: 'var(--text-accent)'
    }}>
      <span style={{ fontSize: '18px' }}>{icons[wc] || '🌤'}</span>
      {wc?.toUpperCase()} · {weather.temperature_c}°C
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
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: 'var(--risk-low-glow)', color: 'var(--risk-low)', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--risk-low)' }}>
            ✨ RECOMMENDED ROUTE
          </span>
        </div>
      )}
      
      {isAvoid && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ background: 'var(--risk-high-glow)', color: 'var(--risk-high)', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 8, border: '1px solid var(--risk-high)' }}>
            🚨 AVOID (HIGHEST RISK)
          </span>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 className="card-title">{route.name}</h3>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, paddingRight: 20 }}>
            {route.segments?.slice(0, 5).map(s => s.name).join(' → ')}
            {route.segments?.length > 5 ? ` → ... (${nSegs} paths)` : ''}
          </p>
        </div>
        <div style={{ marginLeft: 16 }}>
          <RiskBadge score={route.avg_risk} />
        </div>
      </div>

      <div className="dashboard-stats-grid">
        <div className="route-stat-box">
          <span style={{ fontSize: 24, marginBottom: 4 }}>📏</span>
          <div className="route-stat-val">{km} km</div>
          <div className="route-stat-label">Distance</div>
        </div>
        <div className="route-stat-box">
          <span style={{ fontSize: 24, marginBottom: 4 }}>⏱</span>
          <div className="route-stat-val">{mins} m</div>
          <div className="route-stat-label">Est. Time</div>
        </div>
        <div className="route-stat-box">
          <span style={{ fontSize: 24, marginBottom: 4 }}>🎯</span>
          <div className="route-stat-val">{route.avg_risk?.toFixed(3)}</div>
          <div className="route-stat-label">Avg Risk</div>
        </div>
      </div>

      <button className="collapse-btn" onClick={() => setExpanded(!expanded)}>
        {expanded ? '▲ Collapse Road Segments Tracking' : `▼ View All ${nSegs} Segments Breakdown`}
      </button>

      {expanded && (
        <div className="animate-fade-in" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {route.segments?.map((s, i) => (
            <div key={i} className="inner-box" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderLeft: `4px solid ${getRiskColor(s.risk_score)}`
            }}>
              <span style={{ color: 'var(--text-accent)', fontWeight: 600 }}>{s.name}</span>
              <span style={{ color: getRiskColor(s.risk_score), fontWeight: 800 }}>
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
      borderLeft: `5px solid ${getRiskColor(seg.risk_score)}`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h4 className="card-title">{seg.name}</h4>
        <span style={{ background: getRiskBg(seg.risk_score), color: getRiskColor(seg.risk_score), padding: '6px 12px', borderRadius: 12, fontWeight: 800, fontSize: 16 }}>
          {(seg.risk_score * 100).toFixed(0)}% RISK
        </span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>
        {seg.mandal} · {wc} · {seg.road_type}
      </div>
      {seg.factors?.length > 0 && (
        <div className="inner-box">
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Automated Threat Analysis
          </div>
          {seg.factors.map((f, i) => (
            <div key={i} style={{ fontSize: 14, color: 'var(--text-accent)', paddingLeft: 6, lineHeight: 1.6, display: 'flex', gap: 8, marginBottom: 6, fontWeight: 500 }}>
              <span style={{ color: 'var(--risk-high)' }}>•</span> {f}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Application Layout ─────────────────────────────────────────

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
      setError('Please provide origin and destination.')
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
      setError(err.message || 'Routing engine error. Try valid locations.')
    } finally {
      setLoading(false)
    }
  }

  const TABS = [
    { id: 'recommendation', label: '✅ AI Route' },
    { id: 'routes', label: '🗺 Alternatives' },
    { id: 'risk', label: '📊 Threat Map' },
    { id: 'explain', label: '⚠ Insights' },
  ]

  return (
    <div className="app-container">
      
      {/* Dynamic TopBar */}
      <nav className="app-navbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontSize: 24 }}>🛣️</div>
          <div style={{ fontFamily: 'Inter', fontWeight: 800, fontSize: 18, letterSpacing: -0.5, color: 'var(--text-main)' }}>
            SafeRoute <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>| Peddapalli</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {weather && <WeatherBadge weather={weather} />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--risk-low-glow)', color: 'var(--risk-low)', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: '1px solid var(--risk-low)' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--risk-low)', display: 'inline-block' }}></span>
            API Ready
          </div>
        </div>
      </nav>

      {/* Main Split Interface */}
      <div className="app-content">
        
        {/* Left Panel: Journey Planner */}
        <div className="app-sidebar">
          <div className="app-sidebar-sticky">
            <div className="glass-panel" style={{ padding: 32 }}>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', color: 'var(--text-main)' }}>Journey Config</h2>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
                  Enter parameters to let the machine learning router evaluate 550+ segments for safety.
                </p>
              </div>

              <div className="input-group">
                <label className="input-label">📍 Origin</label>
                <input
                  className="glass-input"
                  value={source}
                  onChange={e => setSource(e.target.value)}
                  onFocus={() => setActiveField('source')}
                  placeholder="e.g. Peddapalli Town"
                />
              </div>

              <div className="input-group">
                <label className="input-label">🏁 Destination</label>
                <input
                  className="glass-input"
                  value={dest}
                  onChange={e => setDest(e.target.value)}
                  onFocus={() => setActiveField('dest')}
                  placeholder="e.g. Ramagundam"
                />
              </div>

              <div className="input-group" style={{ marginBottom: 32 }}>
                <label className="input-label">⏱ Depart At</label>
                <input
                  className="glass-input"
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  placeholder="8:30 · 14:00 · now"
                />
              </div>

              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={loading}
                style={{ animation: loading ? 'pulseGlow 1.5s infinite' : 'none' }}
              >
                {loading ? '⏳ Computing Safest Paths...' : 'Generate Route'}
              </button>

              {error && (
                <div className="animate-fade-in inner-box" style={{
                  marginTop: 20, background: 'var(--risk-high-glow)', color: 'var(--risk-high)', 
                  border: '1px solid var(--risk-high)', fontWeight: 600
                }}>
                  🚨 {error}
                </div>
              )}

              {/* Quick Select Tool */}
              <div style={{ marginTop: 32, borderTop: '1px solid var(--glass-border)', paddingTop: 24 }}>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Suggested Nodes
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
          </div>
        </div>

        {/* Right Panel: Insights & Dashboard */}
        <div className="app-main">
          
          {!result && !loading && (
            <div className="glass-panel animate-fade-in" style={{ height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyItems: 'center', textAlign: 'center', padding: 40, border: '2px dashed var(--glass-border)', background: 'transparent', justifyContent: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 24, opacity: 0.9 }}>📡</div>
              <h2 className="text-gradient" style={{ fontSize: 32, fontWeight: 800, marginBottom: 16, maxWidth: 400 }}>System Awaiting Telemetry Data</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 480, lineHeight: 1.6, fontWeight: 500 }}>
                The AI predictive engine uses 14 variable features including live weather, topological complexity, and accident density arrays to map the absolute safest trajectory.
              </p>
            </div>
          )}

          {loading && (
            <div className="glass-panel animate-fade-in" style={{ height: '100%', minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid var(--accent-glow)', borderTopColor: 'var(--accent-blue)', animation: 'spin 1s linear infinite', marginBottom: 24 }}></div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              <h3 style={{ color: 'var(--text-main)', fontSize: 20, marginBottom: 8, fontWeight: 800 }}>Computing Matrices...</h3>
              <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Evaluating graph edge risks globally</p>
            </div>
          )}

          {result && (
            <div className="animate-slide-up">
              
              {/* Dashboard Result Header */}
              <div className="glass-panel" style={{ marginBottom: 24, padding: '32px 40px', background: 'var(--inner-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
                  <div>
                    <div style={{ fontSize: 13, color: 'var(--accent-blue)', fontWeight: 800, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                      Route Analysis Complete
                    </div>
                    <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-main)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 16 }}>
                      {result.source} 
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="3" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg> 
                      {result.destination}
                    </h2>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--text-accent)', fontWeight: 700 }}>
                      <span style={{ background: '#fff', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--inner-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>🗺 Evaluated {result.routes?.length} paths</span>
                      <span style={{ background: '#fff', padding: '6px 14px', borderRadius: 20, border: '1px solid var(--inner-border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>📏 ~{result.direct_km}km direct flight</span>
                    </div>
                  </div>
                  
                  {result.recommendation?.risk_cut_pct > 0 && (
                    <div style={{ background: 'var(--risk-low-glow)', border: '1px solid var(--risk-low)', borderRadius: 16, padding: '16px 24px', textAlign: 'center' }}>
                      <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--risk-low)', marginBottom: 4 }}>{result.recommendation.risk_cut_pct}%</div>
                      <div style={{ fontSize: 12, color: 'var(--risk-low)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.5 }}>Safer than worst</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs Integration */}
              <div className="segmented-control">
                {TABS.map(tab => (
                  <div key={tab.id} className={`segment-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                    {tab.label}
                  </div>
                ))}
              </div>

              {/* DYNAMIC TAB OUTLET */}
              <div className="glass-panel" style={{ minHeight: 400, padding: 32 }}>
                
                {activeTab === 'recommendation' && result.recommendation && (
                  <div className="animate-fade-in">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                      <h3 style={{ margin: 0, fontSize: 22, color: 'var(--text-main)', fontWeight: 800 }}>Safest Generated Trajectory</h3>
                    </div>
                    
                    <RouteCard route={result.recommendation.route} isRecommended={true} />
                    
                    {result.recommendation.why && (
                      <div className="inner-box" style={{
                        background: 'var(--accent-glow)', border: '1px solid var(--accent-blue)',
                        fontSize: 15, color: 'var(--text-accent)', fontWeight: 500,
                        marginTop: 20, lineHeight: 1.6, display: 'flex', gap: 16, alignItems: 'flex-start'
                      }}>
                        <div style={{ fontSize: 24 }}>🧠</div>
                        <div><strong style={{ color: 'var(--text-main)', fontWeight: 800 }}>AI Reasoning:</strong> {result.recommendation.why}</div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'routes' && (
                  <div className="animate-fade-in">
                    <h3 style={{ margin: '0 0 24px', fontSize: 22, color: 'var(--text-main)', fontWeight: 800 }}>Comparative Routing Maps</h3>
                    {result.routes?.map((route, i) => (
                      <RouteCard key={i} route={route} isRecommended={i === 0} isAvoid={i === result.routes.length - 1 && result.routes.length > 1} />
                    ))}
                  </div>
                )}

                {activeTab === 'risk' && (
                  <div className="animate-fade-in">
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ margin: '0 0 8px', fontSize: 22, color: 'var(--text-main)', fontWeight: 800 }}>Topology Threat Scan</h3>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>Global scan of elevated risk zones crossing evaluated paths.</p>
                    </div>
                    {result.top_risk_segments?.length > 0 ? (
                      result.top_risk_segments.map((seg, i) => (
                        <SegmentFactorCard key={i} seg={seg} weather={result.weather} />
                      ))
                    ) : (
                      <div className="inner-box" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>✔️</div>
                        No acute risk segments discovered on graph traversal.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'explain' && (
                  <div className="animate-fade-in">
                    <div style={{ marginBottom: 24 }}>
                      <h3 style={{ margin: '0 0 8px', fontSize: 22, color: 'var(--text-main)', fontWeight: 800 }}>Safety Audit (Recommended Route)</h3>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 14, fontWeight: 500 }}>Deep dive into any flagged anomalies on your selected path.</p>
                    </div>

                    {result.recommendation?.route?.segments?.filter(s => s.risk_score >= 0.35)?.length > 0 ? (
                      result.recommendation.route.segments.filter(s => s.risk_score >= 0.35).slice(0, 6).map((seg, i) => (
                        <div key={i} className="inner-box" style={{ borderLeft: `5px solid ${getRiskColor(seg.risk_score)}`, marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                            <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: 18, fontWeight: 800 }}>{seg.name}</h4>
                            <span style={{ background: getRiskBg(seg.risk_score), color: getRiskColor(seg.risk_score), padding: '4px 10px', borderRadius: 12, marginLeft: 'auto', fontSize: 12, fontWeight: 800 }}>
                              {(seg.risk_score * 100).toFixed(0)}% VOLATILITY
                            </span>
                          </div>
                          {seg.factors?.map((f, j) => (
                            <div key={j} style={{ color: 'var(--text-accent)', paddingLeft: 8, lineHeight: 1.6, marginBottom: 6, fontSize: 14, display: 'flex', gap: 8, fontWeight: 500 }}>
                              <span style={{ color: 'var(--accent-blue)', fontWeight: 800 }}>•</span> {f}
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="inner-box" style={{ borderColor: 'var(--risk-low)', background: 'var(--risk-low-glow)', color: 'var(--risk-low)', padding: 32, textAlign: 'center', fontSize: 16, fontWeight: 700 }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>🛡️</div>
                        All nodes on the designated optimal path have passed safety audits gracefully!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}