"""Download the inputs for the KhetCast backtest (run once; results are committed in data/).
Forecasts: Open-Meteo Previous Runs API (what the models predicted 1 and 2 days ahead).
Actuals:   Open-Meteo Historical Weather API (ERA5 reanalysis)."""
import json, os, time, urllib.request
LOCS = {
  'karnal-hr': (29.69, 76.98), 'ludhiana-pb': (30.90, 75.85), 'meerut-up': (28.98, 77.71), 'hisar-hr': (29.15, 75.72),
  'indore-mp': (22.72, 75.86), 'jaipur-rj': (26.91, 75.79), 'patna-br': (25.59, 85.14), 'nashik-mh': (20.00, 73.79),
  'guntur-ap': (16.31, 80.44), 'bardhaman-wb': (23.23, 87.86), 'rajkot-gj': (22.30, 70.80), 'belagavi-ka': (15.85, 74.50),
}
START, END = '2025-06-01', '2026-03-31'
V = ['temperature_2m', 'relative_humidity_2m', 'precipitation', 'wind_speed_10m']
FC = ','.join(f'{v}_previous_day{d}' for d in (1, 2) for v in V)
def get(url):
    for i in range(4):
        try:
            with urllib.request.urlopen(url, timeout=90) as r: return json.load(r)
        except Exception as e:
            print('retry', i, e); time.sleep(5 * (i + 1))
    raise SystemExit('failed ' + url)
for k, (la, lo) in LOCS.items():
    for kind, url in [
        ('forecast', f'https://previous-runs-api.open-meteo.com/v1/forecast?latitude={la}&longitude={lo}&start_date={START}&end_date={END}&hourly={FC}&timezone=Asia/Kolkata'),
        ('actual', f'https://archive-api.open-meteo.com/v1/archive?latitude={la}&longitude={lo}&start_date={START}&end_date={END}&hourly={",".join(V)}&timezone=Asia/Kolkata'),
    ]:
        out = f'data/{k}.{kind}.json'
        if os.path.exists(out): continue
        j = get(url)
        assert 'hourly' in j, j
        json.dump({'latitude': j['latitude'], 'longitude': j['longitude'], 'hourly': j['hourly']}, open(out, 'w'))
        print(out, len(j['hourly']['time']))
