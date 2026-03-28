import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

// Colour helpers
const riskColor = (score) => {
  if (score >= 0.65) return '#e53935'
  if (score >= 0.35) return '#fb8c00'
  return '#43a047'
}
const riskBg = (score) => {
  if (score >= 0.65) return '#fdecea'
  if (score >= 0.35) return '#fff3e0'
  return '#e8f5e9'
}
const riskLabel = (score) => {
  if (score >= 0.65) return 'High'
  if (score >= 0.35) return 'Medium'
  return 'Low'
}

// Static location chips
const CHIPS = [
  { label: '🏘 Peddapalli Town',        val: 'Peddapalli Town' },
  { label: '⛏ Godavarikhani',           val: 'Godavarikhani' },
  { label: '🏭 Ramagundam',             val: 'Ramagundam' },
  { label: '🌿 Manthani',               val: 'Manthani' },
  { label: '🏘 Sultanabad',             val: 'Sultanabad' },
  { label: '🌾 Kamanpur',               val: 'Kamanpur' },
  { label: '🌾 Mutharam',               val: 'Mutharam' },
  { label: '🌾 Ramagiri',               val: 'Ramagiri' },
  { label: '🏘 Dharmapuri',             val: 'Dharmaram' },
  { label: '🌳 Kataram',                val: 'Kataram' },
  { label: '🌳 Odela',                  val: 'Odela' },
  { label: '🌾 Julapally',              val: 'Julapalli' },
  { label: '🌾 Gangadhara',             val: 'Eligaid' },
  { label: '🏘 Metpally',               val: 'Palakurthy' },
  { label: '🌾 Boinpally',              val: 'Mutharam' },
  { label: '🌳 Konaraopet',             val: 'Odela' },
  { label: '🌳 Vempally',               val: 'Ramagiri' },
  { label: '🌳 Eligaid',                val: 'Eligaid' },
  { label: '🌾 Palimela',               val: 'Palakurthy' },
  { label: '🏥 Peddapalli Hospital',    val: 'Peddapalli Hospital' },
  { label: '🚌 Peddapalli Bus Stand',   val: 'Peddapalli Bus Stand' },
  { label: '🚂 Peddapalli Railway Station', val: 'Peddapalli Railway Station' },
  { label: '🏛 Peddapalli Collectorate',val: 'Peddapalli Collectorate' },
  { label: '🚌 Godavarikhani Bus Stand',val: 'Godavarikhani Bus Stand' },
  { label: '🏭 NTPC Colony',            val: 'NTPC Colony' },
  { label: '⚡ Ramagundam Power Plant', val: 'Ramagundam Power Plant' },
  { label: '🌉 Godavari Bridge',        val: 'Godavari Bridge' },
  { label: '💧 Sabbitham Waterfall',    val: 'Sabbitham Waterfall' },
  { label: '⚠ SH7 Kamanpur Junction',  val: 'SH7 Kamanpur Junction' },
  { label: '🏗 Karimnagar Road Bypass', val: 'Karimnagar Road Bypass' },
  { label: '🏗 Jagtial Road',           val: 'Jagtial Road' },
  { label: '⚠ Manthani Bypass',        val: 'Manthani Bypass' },
]

// Subcomponents

function WeatherBadge({ weather }) {
  if (!weather) return null
  const icons = { clear: '☀️', rainy: '🌧️', foggy: '🌫️', cloudy: '☁️' }
  return (
    <span style={{
      background: '#e3f2fd', color: '#1565c0',
      borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 500
    }}>
      {icons[weather.weather_condition] || '🌤'} {weather.weather_condition?.toUpperCase()}
    </span>
  )
}

function RiskDot({ score, size = 10 }) {
  return (
    <span style={{
      display: 'inline-block', width: size, height: size,
      borderRadius: '50%', background: riskColor(score),
      marginRight: 6, flexShrink: 0
    }} />
  )
}

function RiskBadge({ score }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: riskBg(score), color: riskColor(score),
      borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600,
      border: `1px solid ${riskColor(score)}30`
    }}>
      <RiskDot score={score} size={8} />
      {riskLabel(score)}
    </span>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div style={{
      background: '#f8f9fa', borderRadius: 12, padding: '10px 14px',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1
    }}>
      <span style={{ fontSize: 22 }}>{icon}</span>
      <span style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e' }}>{value}</span>
      <span style={{ fontSize: 11, color: '#666' }}>{label}</span>
    </div>
  )
}

function RouteCard({ route, isRecommended, isAvoid }) {
  const [expanded, setExpanded] = useState(false)
  const borderColor = isAvoid ? '#e5393530' : isRecommended ? '#43a04730' : '#e0e0e0'
  const bg = isAvoid ? '#fff5f5' : isRecommended ? '#f0fdf4' : '#fff'

  return (
    <div style={{
      border: `1.5px solid ${borderColor}`,
      borderRadius: 16, padding: 16, background: bg, marginBottom: 12
    }}>
      {isAvoid && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ color: '#e53935', fontSize: 12, fontWeight: 700 }}>
            🔴 AVOID — HIGHEST RISK
          </span>
        </div>
      )}
      {isRecommended && (
        <span style={{
          background: '#e8f5e9', color: '#2e7d32', fontSize: 11,
          fontWeight: 700, borderRadius: 6, padding: '2px 8px', marginBottom: 8, display: 'inline-block'
        }}>✅ Recommended</span>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 4 }}>
            {route.name}
          </div>
          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
            {route.segments?.slice(0, 5).map(s => s.name).join(' → ')}
            {route.segments?.length > 5 ? ` → ...` : ''}
          </div>
        </div>
        <RiskBadge score={route.avg_risk} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <StatCard icon="📏" label="Distance" value={`${route.km} km`} />
        <StatCard icon="⏱" label="Est. Time" value={`${route.mins} min`} />
        <StatCard icon="🎯" label="Risk Score" value={route.avg_risk?.toFixed(3)} />
        <StatCard icon="📍" label="Segments" value={`${route.n_segments} segs`} />
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          marginTop: 10, background: 'none', border: 'none',
          color: '#1565c0', fontSize: 12, cursor: 'pointer', fontWeight: 500
        }}
      >
        {expanded ? '▲ Hide' : '▼ Show all'} {route.segments?.length} road segments
      </button>

      {expanded && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {route.segments?.map((s, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '4px 8px', background: '#f8f9fa', borderRadius: 8, fontSize: 12
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <RiskDot score={s.risk_score} size={8} />
                <span>{s.name}</span>
              </div>
              <span style={{ color: riskColor(s.risk_score), fontWeight: 600 }}>
                {(s.risk_score * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SegmentFactorCard({ seg }) {
  return (
    <div style={{
      border: `1.5px solid ${riskColor(seg.risk_score)}20`,
      borderRadius: 16, padding: 16, background: '#fff', marginBottom: 12
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: 700, fontSize: 14, gap: 6 }}>
          <RiskDot score={seg.risk_score} size={10} />
          {seg.name}
        </div>
        <span style={{ color: riskColor(seg.risk_score), fontWeight: 800, fontSize: 18 }}>
          {(seg.risk_score * 100).toFixed(0)}%
        </span>
      </div>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
        {seg.weather} · day · medium traffic
      </div>
      {seg.factors && seg.factors.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#333' }}>
            Contributing factors (ML detected):
          </div>
          {seg.factors.map((f, i) => (
            <div key={i} style={{ fontSize: 12, color: '#444', paddingLeft: 8, lineHeight: 1.6 }}>
              {f}
            </div>
          ))}
        </>
      )}
    </div>
  )
}

// Main App
export default function App() {
  const [source, setSource]       = useState('')
  const [dest, setDest]           = useState('')
  const [time, setTime]           = useState('now')
  const [loading, setLoading]     = useState(false)
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState(null)
  const [activeTab, setActiveTab] = useState('recommendation')
  const [modelReady, setModelReady] = useState(false)
  const [activeField, setActiveField] = useState(null)
  const sourceRef = useRef(null)
  const destRef   = useRef(null)

  // Poll model readiness
  useEffect(() => {
    const check = async () => {
      try {
        const res = await axios.get(`${API}/api/status`)
        if (res.data.ready) {
          setModelReady(true)
        } else {
          setTimeout(check, 2000)
        }
      } catch {
        setTimeout(check, 3000)
      }
    }
    check()
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
      const res = await axios.post(`${API}/api/route`, {
        source: source.trim(),
        destination: dest.trim(),
        time: time || 'now'
      })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to compute route. Check that the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  const TABS = [
    { id: 'recommendation', label: '✅ Recommendation' },
    { id: 'routes',         label: '🗺 Routes' },
    { id: 'risk',           label: '📊 Risk' },
    { id: 'explain',        label: '⚠ Explain' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#f4f6f8' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1b2a 0%, #1b2a4a 100%)',
        color: '#fff', padding: '28px 20px 24px', textAlign: 'center'
      }}>
        <div style={{ fontSize: 40, marginBottom: 6 }}>🛣️</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 6 }}>
          Peddapalli Road Risk
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 14 }}>
          Full-Stack App · ML Risk Scoring · Dijkstra Graph Routing · 550 Segments
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          {['Random Forest', 'Gradient Boosting', 'Dijkstra Routing', '14-Factor Model'].map(t => (
            <span key={t} style={{
              background: '#ffffff15', border: '1px solid #ffffff25',
              borderRadius: 20, padding: '3px 12px', fontSize: 12, color: '#cbd5e1'
            }}>{t}</span>
          ))}
        </div>
        {!modelReady && (
          <div style={{ marginTop: 12, color: '#fbbf24', fontSize: 12 }}>
            ⏳ Training ML models… please wait
          </div>
        )}
        {modelReady && (
          <div style={{ marginTop: 12, color: '#86efac', fontSize: 12 }}>
            ✅ ML Model Ready
          </div>
        )}
      </div>

      {/* Journey Planner */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
        <div style={{
          background: '#fff', borderRadius: 20, padding: 20,
          marginTop: -10, boxShadow: '0 4px 24px rgba(0,0,0,0.10)'
        }}>
          <h2 style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>
            Plan Your Journey
          </h2>

          {/* Source */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#e53935', marginBottom: 4, display: 'block' }}>
              📍 Your Current Location
            </label>
            <input
              ref={sourceRef}
              value={source}
              onChange={e => setSource(e.target.value)}
              onFocus={() => setActiveField('source')}
              placeholder="e.g. Peddapalli Town, Godavarikhani, Manthani"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${activeField === 'source' ? '#1565c0' : '#e0e0e0'}`,
                fontSize: 14, transition: '0.2s', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Destination */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block' }}>
              🏁 Destination
            </label>
            <input
              ref={destRef}
              value={dest}
              onChange={e => setDest(e.target.value)}
              onFocus={() => setActiveField('dest')}
              placeholder="e.g. Ramagundam, NTPC Colony, Peddapalli"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${activeField === 'dest' ? '#1565c0' : '#e0e0e0'}`,
                fontSize: 14, transition: '0.2s', boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Time */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, display: 'block' }}>
              ⏱ Departure Time
            </label>
            <input
              value={time}
              onChange={e => setTime(e.target.value)}
              placeholder="8:30am · 14:00 · 10:30pm · now"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                border: '1.5px solid #e0e0e0', fontSize: 14, boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !modelReady}
            style={{
              width: '100%', padding: '14px', borderRadius: 14,
              background: modelReady ? 'linear-gradient(90deg, #1565c0, #1976d2)' : '#94a3b8',
              color: '#fff', fontWeight: 700, fontSize: 16,
              border: 'none', cursor: modelReady ? 'pointer' : 'not-allowed',
              boxShadow: '0 4px 14px rgba(21,101,192,0.3)', transition: '0.2s'
            }}
          >
            {loading ? '⏳ Computing Routes...' : '🔍 Get ML Route Recommendation'}
          </button>

          {error && (
            <div style={{
              marginTop: 12, background: '#fdecea', color: '#c62828',
              borderRadius: 10, padding: '10px 14px', fontSize: 13
            }}>
              ❌ {error}
            </div>
          )}

          {/* Location chips */}
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
              Tap a place to fill location or destination:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CHIPS.map(chip => (
                <button
                  key={chip.label}
                  onClick={() => handleChipClick(chip.val)}
                  style={{
                    background: '#f1f5f9', border: '1px solid #e2e8f0',
                    borderRadius: 20, padding: '4px 12px', fontSize: 12,
                    cursor: 'pointer', color: '#334155', fontWeight: 500,
                    transition: '0.15s'
                  }}
                  onMouseEnter={e => e.target.style.background = '#dbeafe'}
                  onMouseLeave={e => e.target.style.background = '#f1f5f9'}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div style={{ marginTop: 16, marginBottom: 32 }}>

            {/* Journey summary header */}
            <div style={{
              background: 'linear-gradient(135deg, #0d1b2a, #1b2a4a)',
              borderRadius: 20, padding: 20, color: '#fff', marginBottom: 12
            }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>
                Peddapalli District · ML Risk Analysis
              </div>
              <h2 style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
                🏘 {result.source} → 🏭 {result.destination}
              </h2>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#cbd5e1' }}>
                <span>🕐 Now</span>
                <span>🌙 {result.time_label}</span>
                <span>📏 ~{result.direct_km} km direct</span>
                <WeatherBadge weather={result.weather} />
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: '#86efac' }}>
                🗺 {result.routes?.length} routes computed
              </div>
            </div>

            {/* Tabs */}
            <div style={{
              background: '#fff', borderRadius: 16,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden'
            }}>
              {/* Tab bar */}
              <div style={{
                display: 'flex', borderBottom: '1px solid #f0f0f0',
                overflowX: 'auto', padding: '0 4px'
              }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{
                      flex: 1, minWidth: 80, padding: '12px 6px',
                      border: 'none', background: 'none',
                      fontWeight: 600, fontSize: 12, cursor: 'pointer',
                      color: activeTab === tab.id ? '#1565c0' : '#888',
                      borderBottom: activeTab === tab.id ? '2.5px solid #1565c0' : '2.5px solid transparent',
                      transition: '0.2s', whiteSpace: 'nowrap'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ padding: 16 }}>

                {/* RECOMMENDATION TAB */}
                {activeTab === 'recommendation' && result.recommendation && (
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                      ML Recommendation
                    </h3>

                    {result.recommendation.best_route && (
                      <RouteCard
                        route={result.recommendation.best_route}
                        isRecommended={true}
                      />
                    )}

                    {result.recommendation.avoid_route && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#e53935', marginBottom: 8 }}>
                          Route to Avoid:
                        </div>
                        <RouteCard
                          route={result.recommendation.avoid_route}
                          isAvoid={true}
                        />
                      </div>
                    )}

                    {result.recommendation.summary && (
                      <div style={{
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: 12, padding: '12px 14px', fontSize: 13, color: '#166534',
                        marginTop: 8, lineHeight: 1.6
                      }}>
                        💡 {result.recommendation.summary}
                      </div>
                    )}
                  </div>
                )}

                {/* ROUTES TAB */}
                {activeTab === 'routes' && (
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                      All Computed Routes
                    </h3>
                    {result.routes?.map((route, i) => (
                      <RouteCard
                        key={i}
                        route={route}
                        isRecommended={route.name === result.recommendation?.best_route?.name}
                        isAvoid={route.name === result.recommendation?.avoid_route?.name}
                      />
                    ))}
                  </div>
                )}

                {/* RISK TAB */}
                {activeTab === 'risk' && (
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                      Segment Risk Breakdown
                    </h3>
                    {result.segment_risks?.length > 0 ? (
                      result.segment_risks.map((seg, i) => (
                        <SegmentFactorCard key={i} seg={seg} />
                      ))
                    ) : (
                      <div style={{ color: '#888', fontSize: 13 }}>
                        No segment risk data available.
                      </div>
                    )}
                  </div>
                )}

                {/* EXPLAIN TAB */}
                {activeTab === 'explain' && (
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>
                      Risk Factors Explained
                    </h3>
                    {result.explanations?.length > 0 ? (
                      result.explanations.map((ex, i) => (
                        <div key={i} style={{
                          background: '#fff8e1', border: '1px solid #ffe082',
                          borderRadius: 12, padding: '12px 14px', marginBottom: 10,
                          fontSize: 13, color: '#5d4037', lineHeight: 1.6
                        }}>
                          {ex}
                        </div>
                      ))
                    ) : (
                      <div style={{ color: '#888', fontSize: 13 }}>
                        No explanation data available.
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}