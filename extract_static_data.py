"""
Extract static data from peddapalli_road_risk.py for frontend-only deployment.
Outputs: src/data/road_network.json
"""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))

# Patch asynccontextmanager to skip model training
import contextlib
_real = contextlib.asynccontextmanager
def _skip_lifespan(fn):
    async def dummy(app):
        yield
    class CM:
        def __init__(self): pass
        def __call__(self, app): return dummy(app)
    return CM()

# We import the module directly and extract data
# Read the file with utf-8 encoding
with open('peddapalli_road_risk.py', 'r', encoding='utf-8') as f:
    src = f.read()

# Extract SEGMENT_DATA and EDGE_LIST via exec
ns = {}
# Find the SEGMENT_DATA and EDGE_LIST definitions
seg_start = src.index('SEGMENT_DATA = {')
edge_start = src.index('EDGE_LIST = [')

# Extract SEGMENT_DATA block
seg_block = src[seg_start:]
# Find the closing brace (it's a one-liner dict)
seg_end = seg_block.index('\n\n')
seg_code = seg_block[:seg_end].strip()

# Extract EDGE_LIST block
edge_block = src[edge_start:]
edge_end_idx = edge_block.index('\n\n')
edge_code = edge_block[:edge_end_idx].strip()

exec(seg_code, ns)
exec(edge_code, ns)

SEGMENT_DATA = ns['SEGMENT_DATA']
EDGE_LIST = ns['EDGE_LIST']

print(f"Segments: {len(SEGMENT_DATA)}")
print(f"Edges: {len(EDGE_LIST)}")

# Risk scoring parameters (from Python source)
ROAD_RISK_MAP = {"highway": 4, "junction": 3, "urban road": 2, "rural road": 2}
ROAD_TYPE_ENC = {"highway": 3, "junction": 2, "urban road": 1, "rural road": 2}
WEATHER_ENC = {"clear": 0, "rainy": 1, "foggy": 2, "cloudy": 3}
CAUSE_CAT_ENC = {"speed": 0, "junction": 1, "road_design": 2, "other": 3}
MANDAL_SEVERITY_BASE = {
    "Ramagundam": 0.45, "Peddapalli": 0.40, "Manthani": 0.38, "Kamanpur": 0.36,
    "Anthergaon": 0.32, "Palakurthy": 0.30, "Dharmaram": 0.28, "Ramagiri": 0.35,
    "Mutharam": 0.25, "Odela": 0.28, "Julapalli": 0.30, "Eligaid": 0.27,
    "Sultanabad": 0.35, "Srirampur": 0.30
}

# Historical incident count approximation (from dataset pattern)
import re
hist_pattern = re.compile(r'(\d+),([^,]+),([^,]+),')
hist_cnt_map = {}
for m in hist_pattern.finditer(src[:seg_start]):
    mandal = m.group(2).strip()
    seg = m.group(3).strip()
    if seg in SEGMENT_DATA:
        hist_cnt_map[seg] = hist_cnt_map.get(seg, 0) + 1

# Simple risk scoring (deterministic, no sklearn needed)
def risk_score(seg_name, road_type, mandal, weather):
    base = ROAD_RISK_MAP.get(road_type, 2) / 5.0
    m_sev = MANDAL_SEVERITY_BASE.get(mandal, 0.30)
    h_cnt = hist_cnt_map.get(seg_name, 1)
    h_factor = min(h_cnt / 12.0, 0.5)
    weather_mult = {"rainy": 1.18, "foggy": 1.22, "cloudy": 1.08, "clear": 1.0}.get(weather, 1.0)
    # Junction and curve bonus
    name_l = seg_name.lower()
    geo_bonus = 0
    if any(x in name_l for x in ['curve', 'bend', 'turn']): geo_bonus = 0.08
    elif any(x in name_l for x in ['junction', 'x road', 'crossroad', 'chowrasta']): geo_bonus = 0.06
    elif any(x in name_l for x in ['bridge', 'culvert', 'flyover']): geo_bonus = 0.05
    score = (base * 0.4 + m_sev * 0.35 + h_factor * 0.25 + geo_bonus) * weather_mult
    return round(min(score, 1.0), 4)

def risk_label(s):
    return "High" if s >= 0.65 else "Medium" if s >= 0.35 else "Low"

def risk_color(s):
    return "#e53935" if s >= 0.65 else "#fb8c00" if s >= 0.35 else "#43a047"

def get_factors(road_type, weather, seg_name, hist_count):
    factors = []
    if weather == "foggy": factors.append("Fog — severely reduced visibility")
    if weather == "rainy": factors.append("Rainfall / wet roads")
    if weather == "cloudy": factors.append("Cloudy — reduced visibility")
    n = seg_name.lower()
    if road_type in ("highway", "junction") and any(x in n for x in ["coal", "nh", "sh"]):
        factors.append("Active coal truck corridor")
    if "curve" in n or "bend" in n: factors.append("Road curvature")
    if hist_count > 5: factors.append(f"Elevated accident history: {hist_count} incidents")
    if "junction" in n or "x road" in n: factors.append("Junction design — multiple conflict points")
    if any(x in n for x in ["market", "bus stand", "bazaar", "hospital"]): factors.append("Near market area — high pedestrian activity")
    if not factors: factors.append("No dominant single factor — moderate combined conditions")
    return factors

# Build segment risk for all 4 weather conditions
segments = {}
for seg, info in SEGMENT_DATA.items():
    rt = info['road_type']
    mandal = info['mandal']
    h = hist_cnt_map.get(seg, 1)
    risk_by_weather = {}
    for w in ['clear', 'rainy', 'foggy', 'cloudy']:
        rs = risk_score(seg, rt, mandal, w)
        risk_by_weather[w] = {
            "risk_score": rs,
            "risk_label": risk_label(rs),
            "risk_color": risk_color(rs),
            "factors": get_factors(rt, w, seg, h)
        }
    segments[seg] = {
        "mandal": mandal,
        "lat": info['lat'],
        "lon": info['lon'],
        "road_type": rt,
        "hist_count": h,
        "risk": risk_by_weather
    }

# Build adjacency list
edges = []
for e in EDGE_LIST:
    if len(e) >= 5:
        u, v, dist, time_, rt = e[0], e[1], e[2], e[3], e[4]
        edges.append({"u": u, "v": v, "dist": dist, "time": time_, "type": rt})

# Location aliases (what frontend chips map to)
LOCATION_ALIASES = {
    "Peddapalli Town": ["Rangampalli (Rajiv Rahadari)", "Bus Stand Area", "Peddapalli Flyover", "Subash Nagar Market"],
    "Ramagundam": ["Godavarikhani Chowrasta", "FCI Main Gate Junction", "GM Office Circle", "Rajiv Rahadari (FCI Cross)"],
    "Godavarikhani": ["Godavarikhani Chowrastha", "Godavarikhani-Ramagundam Rd", "GM Office Circle"],
    "Manthani": ["Manthani Bus Stand", "Manthani Town Circle", "Ambedkar Statue Centre"],
    "Sultanabad": ["Sultanabad X Road", "Sultanabad Market Area"],
    "Kamanpur": ["Kamanpur Cross Road", "Kaman Centre (Town)", "Kamanpur Main Road Jn"],
    "Mutharam": ["Parupalli X Road", "Mutharam Main Road Curve"],
    "Ramagiri": ["Centenary Colony X Road", "Mining Area Entry Gate"],
    "Dharmaram": ["Dharmaram X Road", "Dharmaram Main Market"],
    "Kataram": ["Manthani-Kataram Main Rd", "Soorayyapally Junction"],
    "Odela": ["Odela X Road", "Odela Railway Gate"],
    "Julapally": ["Julapalli X Road", "Julapalli Main Market"],
    "Gangadhara": ["Manthani-Gangapuri Junction", "Gangapuri Road"],
    "Metpally": ["Mallaram Forest Stretch", "Kuchirajupalli Curve"],
    "Boinpally": ["Boinpeta-Gangapuri Stretch"],
    "Konaraopet": ["Putti Road Junction"],
    "Vempally": ["Venkatraopalli Cross"],
    "Eligaid": ["Eligaid X Road"],
    "Palimela": ["Palakurthy X Road", "Palakurthy Market Area"],
    "Peddapalli Hospital": ["Government Hospital Jn", "Govt Hospital Area"],
    "Peddapalli Bus Stand": ["Bus Stand Area", "Bus Stand Main Gate"],
    "Peddapalli Railway Station": ["Railway Station Road", "Railway Station Rd"],
    "Peddapalli Collectorate": ["Court Area Road", "MRO Office Junction"],
    "Godavarikhani Bus Stand": ["Old Bus Stand GDK", "Godavarikhani Chowrastha"],
    "NTPC Colony": ["NTPC TTS Main Gate", "NTPC Power House Curve"],
    "Ramagundam Power Plant": ["NTPC Power House Road", "NTPC TTS Main Gate"],
    "Godavari Bridge": ["Godavari Bridge Approach", "Godavari Pushkar Ghat"],
    "Sabbitham Waterfall": ["Sabitham Waterfall Rd", "Sabitham Village Entry"],
    "SH7 Kamanpur Junction": ["Kamanpur Main Road Jn", "Pannur Stage"],
    "Karimnagar Road Bypass": ["Karimnagar Road Outskirts", "Karimnagar Highway km 162"],
    "Jagtial Road": ["Mallaram Forest Stretch"],
    "Manthani Bypass": ["Manthani-Peddapalli Highway", "Mallaram Forest Stretch"],
}

output = {
    "segments": segments,
    "edges": edges,
    "location_aliases": LOCATION_ALIASES,
    "mandal_severity": MANDAL_SEVERITY_BASE
}

os.makedirs('src/data', exist_ok=True)
with open('src/data/road_network.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, separators=(',', ':'))

size_kb = os.path.getsize('src/data/road_network.json') / 1024
print(f"\nDone! Wrote src/data/road_network.json ({size_kb:.0f} KB)")
print(f"Segments: {len(segments)}, Edges: {len(edges)}")
