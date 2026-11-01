// Weather tools for the KhetCast agent. Each tool returns normalized hourly rows
// { t:'YYYY-MM-DDTHH:00' (local, Asia/Kolkata), temp, rh, rain, pop, wind, gust, et0, sm, isDay }
// so the engine never depends on one provider. Order of preference:
//   1. Open-Meteo forecast API (best-match models incl. ECMWF IFS / GFS / ICON)
//   2. Open-Meteo historical-forecast API (same model archive, separate quota)
//   3. MET Norway Locationforecast (independent provider; no ET0/soil -> engine estimates)
// All three are free, need no key and allow browser (CORS) calls.

const HOURLY = 'temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m,wind_gusts_10m,et0_fao_evapotranspiration,soil_moisture_3_to_9cm,is_day';
const TZ = 'Asia/Kolkata';

export function istDate(offsetDays = 0, now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600e3 + offsetDays * 86400e3);
  return ist.toISOString().slice(0, 10);
}
export function istHourKey(now = new Date()) {
  const ist = new Date(now.getTime() + 5.5 * 3600e3);
  return ist.toISOString().slice(0, 13) + ':00';
}

export function fromOpenMeteo(json) {
  const h = json && json.hourly;
  if (!h || !Array.isArray(h.time) || !h.time.length) throw new Error('empty open-meteo response');
  return h.time.map((t, i) => ({
    t,
    temp: h.temperature_2m?.[i] ?? null,
    rh: h.relative_humidity_2m?.[i] ?? null,
    rain: h.precipitation?.[i] ?? 0,
    pop: h.precipitation_probability?.[i] ?? null,
    wind: h.wind_speed_10m?.[i] ?? null,
    gust: h.wind_gusts_10m?.[i] ?? null,
    et0: h.et0_fao_evapotranspiration?.[i] ?? null,
    sm: h.soil_moisture_3_to_9cm?.[i] ?? null,
    isDay: h.is_day?.[i] ?? null,
  })).filter((r) => r.temp != null);
}

// MET Norway: UTC ISO times, wind in m/s, precipitation per next_1_hours.
export function fromMetNo(json) {
  const ts = json?.properties?.timeseries;
  if (!Array.isArray(ts) || !ts.length) throw new Error('empty met.no response');
  const rows = [];
  for (const s of ts) {
    const one = s.data?.next_1_hours;
    if (!one) continue; // only the hourly part of the series (≈ first 2.5 days)
    const d = s.data.instant.details;
    const local = new Date(Date.parse(s.time) + 5.5 * 3600e3).toISOString().slice(0, 13) + ':00';
    const hr = +local.slice(11, 13);
    rows.push({
      t: local, temp: d.air_temperature, rh: d.relative_humidity,
      rain: one.details?.precipitation_amount ?? 0,
      pop: one.details?.probability_of_precipitation ?? null,
      wind: d.wind_speed != null ? Math.round(d.wind_speed * 36) / 10 : null,
      gust: d.wind_speed_of_gust != null ? Math.round(d.wind_speed_of_gust * 36) / 10 : null,
      et0: null, sm: null, isDay: hr >= 7 && hr < 18 ? 1 : 0,
    });
  }
  return rows;
}

async function getJson(url, fetchImpl) {
  const r = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (!r.ok) throw new Error(`${r.status} ${url.split('?')[0]}`);
  const j = await r.json();
  if (j && j.error) throw new Error(j.reason || 'provider error');
  return j;
}

/** Tool: forecast(lat, lon) -> { rows, source, fetchedAt, tried:[...] } */
export async function forecast(lat, lon, { fetchImpl = fetch, now = new Date() } = {}) {
  const la = (+lat).toFixed(3), lo = (+lon).toFixed(3);
  const tried = [];
  const attempts = [
    ['Open-Meteo', `https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&hourly=${HOURLY}&timezone=${TZ}&forecast_days=8`, fromOpenMeteo],
    ['Open-Meteo (archive endpoint)', `https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&hourly=${HOURLY}&timezone=${TZ}&start_date=${istDate(0, now)}&end_date=${istDate(7, now)}`, fromOpenMeteo],
    ['MET Norway', `https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=${(+lat).toFixed(2)}&lon=${(+lon).toFixed(2)}`, fromMetNo],
  ];
  for (const [name, url, parse] of attempts) {
    try {
      const rows = parse(await getJson(url, fetchImpl));
      // keep from the current IST hour onwards: the agent plans the future only
      const key = istHourKey(now);
      const fut = rows.filter((r) => r.t >= key);
      if (fut.length >= 24) return { rows: fut, source: name, fetchedAt: now.toISOString(), tried };
      tried.push(`${name}: too few future hours`);
    } catch (e) {
      tried.push(`${name}: ${e.message}`);
    }
  }
  const err = new Error('all forecast providers failed');
  err.tried = tried;
  throw err;
}

/** Tool: geocode(name) -> [{ name, admin1, admin2, lat, lon }] (India only) */
export async function geocode(name, { fetchImpl = fetch } = {}) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=en&format=json&countryCode=IN`;
  const j = await getJson(url, fetchImpl);
  return (j.results || []).map((r) => ({ name: r.name, admin1: r.admin1 || '', admin2: r.admin2 || '', lat: r.latitude, lon: r.longitude }));
}
