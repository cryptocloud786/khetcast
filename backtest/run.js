// KhetCast backtest: would following the agent have avoided wasted sprays and irrigations?
//
// Data (downloaded by fetch_data.py, committed in data/):
//   forecast = Open-Meteo Previous Runs API: the forecast for each hour as issued 1 day
//              (previous_day1) and 2 days (previous_day2) earlier — what a farmer would have seen.
//   actual   = Open-Meteo Historical Weather API (ERA5 reanalysis) — what really happened.
// 12 farming districts, Kharif 2025 (15 Jun–15 Oct) and Rabi 2025-26 (1 Nov–31 Mar).
//
// Experiment A — spraying. Every week the farmer plans one spray on a fixed day D.
//   Baseline: spray at 10:00 on D.
//   KhetCast: the evening before, run the SAME engine (sprayWindows) on the forecast for D
//             (1-day-ahead) and D+1 (2-day-ahead); spray at the start of D's best window,
//             else D+1's, else postpone to next week.
//   A spray FAILS if, in reality, >= 1 mm of rain fell in the 6 hours from the spray hour
//   (wash-off) or the wind at the spray hour was > 15 km/h (drift).
// Experiment B — wheat irrigation (Rabi). Wheat sown 10 Nov; baseline irrigates on the
//   PAU-style calendar (21, 42, 63, 84, 105 days after sowing). KhetCast runs
//   irrigationAdvice-style rain check: if the 1–2-day-ahead forecast shows >= 15 mm in the
//   next 48 h it holds the irrigation. An irrigation is WASTED if >= 20 mm of real rain
//   fell within 72 h after it (water + diesel/electricity spent for nothing, waterlogging risk).
import fs from 'node:fs';
import { sprayWindows } from '../src/engine.js';

const dir = new URL('./data/', import.meta.url);
const locs = [...new Set(fs.readdirSync(dir).map((f) => f.split('.')[0]))].sort();
const SEASONS = { kharif2025: ['2025-06-15', '2025-10-15'], rabi2025_26: ['2025-11-01', '2026-03-31'] };

const load = (k, kind) => JSON.parse(fs.readFileSync(new URL(`${k}.${kind}.json`, dir))).hourly;
const addDays = (date, n) => new Date(Date.parse(date + 'T00:00Z') + n * 86400e3).toISOString().slice(0, 10);

function fcRows(fc, idx, lead) {
  return idx.map((i) => {
    const h = +fc.time[i].slice(11, 13);
    return { t: fc.time[i], temp: fc[`temperature_2m_previous_day${lead}`][i], rh: fc[`relative_humidity_2m_previous_day${lead}`][i],
      rain: fc[`precipitation_previous_day${lead}`][i] ?? 0, pop: null, wind: fc[`wind_speed_10m_previous_day${lead}`][i],
      gust: null, et0: null, sm: null, isDay: h >= 7 && h < 18 ? 1 : 0 };
  });
}

function sprayFails(act, iHour) {
  let rain = 0;
  for (let k = iHour; k < iHour + 6 && k < act.time.length; k++) rain += act.precipitation[k] || 0;
  const wind = act.wind_speed_10m[iHour];
  return { fail: rain >= 1 || wind > 15, wash: rain >= 1, drift: wind > 15 };
}

const results = { spray: {}, irrigation: {}, meta: { locations: locs, seasons: SEASONS, generated: new Date().toISOString() } };

for (const [season, [s0, s1]] of Object.entries(SEASONS)) {
  const agg = { plans: 0, base: { fail: 0, wash: 0, drift: 0 }, agent: { sprays: 0, fail: 0, wash: 0, drift: 0, postponed: 0, movedToNextDay: 0 } };
  for (const k of locs) {
    const fc = load(k, 'forecast'), act = load(k, 'actual');
    const pos = new Map(fc.time.map((t, i) => [t, i]));
    // planned spray day: every Monday... use every 7th day from season start
    for (let D = s0; D <= s1; D = addDays(D, 7)) {
      const iD = pos.get(D + 'T00:00');
      if (iD == null || iD + 72 >= fc.time.length) continue;
      agg.plans++;
      // baseline: 10:00 on D
      const b = sprayFails(act, iD + 10);
      agg.base.fail += b.fail; agg.base.wash += b.wash; agg.base.drift += b.drift;
      // agent: forecast for D (lead 1) + D+1 (lead 2), engine needs the look-ahead hours
      const idx = Array.from({ length: 54 }, (_, j) => iD + j); // D 00:00 .. D+2 05:00
      const rowsD = [...fcRows(fc, idx.slice(0, 24), 1), ...fcRows(fc, idx.slice(24), 2)];
      const days = sprayWindows(rowsD);
      let pick = null;
      if (days[0]?.best) pick = days[0].best.start;
      else if (days[1]?.best) { pick = days[1].best.start; agg.agent.movedToNextDay++; }
      if (!pick) { agg.agent.postponed++; continue; }
      const day = days[0]?.best ? D : addDays(D, 1);
      const iS = pos.get(`${day}T${pick}`);
      const a = sprayFails(act, iS);
      agg.agent.sprays++; agg.agent.fail += a.fail; agg.agent.wash += a.wash; agg.agent.drift += a.drift;
    }
  }
  agg.base.failRate = +(100 * agg.base.fail / agg.plans).toFixed(1);
  agg.agent.failRate = +(100 * agg.agent.fail / agg.agent.sprays).toFixed(1);
  agg.agent.failRateVsPlans = +(100 * agg.agent.fail / agg.plans).toFixed(1);
  agg.failedSpraysAvoided = agg.base.fail - agg.agent.fail;
  agg.relativeReduction = +(100 * (agg.base.fail - agg.agent.fail) / agg.base.fail).toFixed(1);
  results.spray[season] = agg;
}

// ---- Experiment B: wheat irrigation, Rabi 2025-26 ----
{
  const sow = '2025-11-10', DAS = [21, 42, 63, 84, 105];
  const agg = { events: 0, baseWasted: 0, agentWasted: 0, agentHeld: 0, heldCorrect: 0, heldWrong: 0, perLocation: {} };
  for (const k of locs) {
    const fc = load(k, 'forecast'), act = load(k, 'actual');
    const pos = new Map(fc.time.map((t, i) => [t, i]));
    const per = { baseWasted: 0, agentHeld: 0 };
    for (const das of DAS) {
      const day = addDays(sow, das);
      const i = pos.get(day + 'T08:00');
      if (i == null) continue;
      agg.events++;
      let actual72 = 0; for (let j = i; j < i + 72; j++) actual72 += act.precipitation[j] || 0;
      // forecast seen the evening before: next 48 h = day (lead 1) + day+1 (lead 2)
      let fc48 = 0; for (let j = i - 8; j < i + 16; j++) fc48 += fc.precipitation_previous_day1[j] || 0;
      for (let j = i + 16; j < i + 40; j++) fc48 += fc.precipitation_previous_day2[j] || 0;
      const wasted = actual72 >= 20;
      if (wasted) { agg.baseWasted++; per.baseWasted++; }
      if (fc48 >= 15) {
        agg.agentHeld++; per.agentHeld++;
        if (actual72 >= 10) agg.heldCorrect++; else agg.heldWrong++;
      } else if (wasted) agg.agentWasted++;
    }
    agg.perLocation[k] = per;
  }
  agg.waterSavedMmPerAcreEvent = 50;
  agg.litresSavedPerAcre = Math.round((agg.baseWasted - agg.agentWasted) * 50 / 1000 * 4046.86 * 1000);
  results.irrigation.wheat_rabi2025_26 = agg;
}

fs.writeFileSync(new URL('./results.json', import.meta.url), JSON.stringify(results, null, 2));
const sp = results.spray;
console.log('KhetCast backtest — 12 districts, forecasts as issued vs ERA5 actuals');
for (const [s, a] of Object.entries(sp)) {
  console.log(`\n[${s}] planned sprays: ${a.plans}`);
  console.log(`  baseline (10:00 on planned day): ${a.base.fail} failed (${a.base.failRate}%) — wash-off ${a.base.wash}, drift ${a.base.drift}`);
  console.log(`  KhetCast: ${a.agent.sprays} sprays, ${a.agent.fail} failed (${a.agent.failRate}%) — wash-off ${a.agent.wash}, drift ${a.agent.drift}; moved to next day ${a.agent.movedToNextDay}, postponed ${a.agent.postponed}`);
  console.log(`  failed sprays avoided: ${a.failedSpraysAvoided} (${a.relativeReduction}% fewer)`);
}
const ir = results.irrigation.wheat_rabi2025_26;
console.log(`\n[wheat irrigation, Rabi 2025-26] ${ir.events} scheduled irrigations; baseline wasted ${ir.baseWasted}; KhetCast held ${ir.agentHeld} (rain did come: ${ir.heldCorrect}, false alarm: ${ir.heldWrong}); still wasted ${ir.agentWasted}`);
