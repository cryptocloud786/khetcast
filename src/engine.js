/*
Engine for KhetCast (field-action agent)
Sources & thresholds (one-line each):
- FAO-56: crop coefficients (Kc), root-zone depletion, TAW/RAW, and irrigation scheduling guidance.
- IMD rainfall: heavy rain thresholds used (35 mm/day caution; 64.5 mm/day heavy/very heavy).
- Hutton/Smith (relaxed) for late blight: tmin >=10 and >=6 hours RH>=90 as risk indicator (two consecutive -> high).
- Hargreaves approximation used when ET0 missing: ET0 = 0.0023*(Tmean+17.8)*sqrt(Tmax-Tmin)*Ra (Ra ~ 12 mm/day used here).
- Spray windows: operational thresholds for wind, gust, rain, POP, temperature, RH common in IPM/spray guidance.
All numeric outputs rounded to 1 decimal.
*/

export const CROPS = {
  wheat: {
    id: 'wheat',
    stages: [
      { id: 'sowing', kc: 0.4 },
      { id: 'vegetative', kc: 0.75 },
      { id: 'flowering', kc: 1.15 },
      { id: 'grain_fill', kc: 1.1 },
      { id: 'maturity', kc: 0.4 }
    ],
    sensitive: {
      frostC: null,
      heatC: 32,
      heatStages: ['flowering','grain_fill'],
      disease: 'yellow_rust'
    }
  },
  mustard: {
    id: 'mustard',
    stages: [
      { id: 'sowing', kc: 0.35 },
      { id: 'vegetative', kc: 0.8 },
      { id: 'flowering', kc: 1.05 },
      { id: 'grain_fill', kc: 1.0 },
      { id: 'maturity', kc: 0.35 }
    ],
    sensitive: {
      frostC: 3,
      heatC: 32,
      heatStages: ['flowering'],
      disease: 'white_rust'
    }
  },
  chickpea: {
    id: 'chickpea',
    stages: [
      { id: 'sowing', kc: 0.4 },
      { id: 'vegetative', kc: 0.7 },
      { id: 'flowering', kc: 1.0 },
      { id: 'grain_fill', kc: 0.9 },
      { id: 'maturity', kc: 0.35 }
    ],
    sensitive: {
      frostC: 2,
      heatC: 32,
      heatStages: ['flowering'],
      disease: null
    }
  },
  potato: {
    id: 'potato',
    stages: [
      { id: 'sowing', kc: 0.5 },
      { id: 'vegetative', kc: 0.8 },
      { id: 'tuber', kc: 1.15 },
      { id: 'maturity', kc: 0.75 }
    ],
    sensitive: {
      frostC: 2,
      heatC: 30,
      heatStages: ['tuber'],
      disease: 'late_blight'
    }
  },
  paddy: {
    id: 'paddy',
    stages: [
      { id: 'sowing', kc: 1.05 },
      { id: 'vegetative', kc: 1.1 },
      { id: 'flowering', kc: 1.2 },
      { id: 'grain_fill', kc: 1.0 },
      { id: 'maturity', kc: 0.9 }
    ],
    sensitive: {
      frostC: null,
      heatC: 35,
      heatStages: ['flowering'],
      disease: 'blast'
    }
  },
  cotton: {
    id: 'cotton',
    stages: [
      { id: 'sowing', kc: 0.35 },
      { id: 'vegetative', kc: 0.7 },
      { id: 'flowering', kc: 1.15 },
      { id: 'boll', kc: 1.0 },
      { id: 'maturity', kc: 0.7 }
    ],
    sensitive: {
      frostC: null,
      heatC: 38,
      heatStages: ['flowering'],
      disease: 'bollworm'
    }
  },
  sugarcane: {
    id: 'sugarcane',
    stages: [
      { id: 'sowing', kc: 0.4 },
      { id: 'vegetative', kc: 0.8 },
      { id: 'flowering', kc: 1.25 },
      { id: 'maturity', kc: 0.75 }
    ],
    sensitive: {
      frostC: null,
      heatC: 40,
      heatStages: [],
      disease: null
    }
  },
  tomato: {
    id: 'tomato',
    stages: [
      { id: 'sowing', kc: 0.6 },
      { id: 'vegetative', kc: 0.8 },
      { id: 'fruiting', kc: 1.15 },
      { id: 'maturity', kc: 0.8 }
    ],
    sensitive: {
      frostC: 3,
      heatC: 35,
      heatStages: ['flowering','fruiting'],
      disease: 'late_blight'
    }
  }
};

export const SOILS = {
  sandy: { fc: 0.17, wp: 0.07 },
  loam: { fc: 0.30, wp: 0.13 },
  clay: { fc: 0.38, wp: 0.22 }
};

// Helper utilities
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);
const sum = (arr) => arr.reduce((a,b)=>a+(b||0),0);
const mean = (arr) => arr.length ? sum(arr)/arr.length : null;
const take = (arr, n) => arr.slice(0,n);

// Parse date strings
const dateOf = (t) => t.slice(0,10);
const hourOf = (t) => parseInt(t.slice(11,13),10);

// Group rows by local date (YYYY-MM-DD)
export function groupByDay(rows) {
  const groups = [];
  for (let r of rows) {
    const d = dateOf(r.t);
    if (!groups.length || groups[groups.length-1].date !== d) {
      groups.push({ date: d, rows: [r] });
    } else {
      groups[groups.length-1].rows.push(r);
    }
  }
  return groups;
}

// Day summary: expects {date, rows}
export function daySummary(day) {
  const rows = day.rows || [];
  if (!rows.length) {
    return {
      date: day.date,
      tmin: null, tmax: null, tmean: null,
      rain: 0, popMax: null, windMax: null, gustMax: null,
      et0: null, rhHours90: 0, rhHours85: 0
    };
  }
  const temps = rows.map(r=>r.temp).filter(v=>v!=null);
  const tmin = Math.min(...temps);
  const tmax = Math.max(...temps);
  const tmean = mean(temps);
  const rain = sum(rows.map(r=>r.rain||0));
  const popVals = rows.map(r=>r.pop).filter(v=>v!=null);
  const popMax = popVals.length ? Math.max(...popVals) : null;
  const windMax = rows.map(r=>r.wind||0).reduce((a,b)=>Math.max(a,b),0);
  const gustVals = rows.map(r=>r.gust).filter(v=>v!=null);
  const gustMax = gustVals.length ? Math.max(...gustVals) : null;
  const et0vals = rows.map(r=>r.et0).filter(v=>v!=null);
  let et0sum = null;
  if (et0vals.length === rows.length && et0vals.length>0) {
    et0sum = sum(et0vals);
  } else if (et0vals.length>0 && et0vals.length<rows.length) {
    // partial data: sum known and estimate missing hourly as proportion of daily Hargreaves
    const harg = hargreavesDay(tmean, tmax, tmin);
    et0sum = sum(et0vals);
    const missing = rows.length - et0vals.length;
    // distribute remaining as (harg * missing / rows.length)
    et0sum += harg * (missing/rows.length);
  } else {
    // all null -> estimate with Hargreaves
    et0sum = hargreavesDay(tmean, tmax, tmin);
  }
  const rhHours90 = rows.filter(r=>r.rh>=90).length;
  const rhHours85 = rows.filter(r=>r.rh>=85).length;
  return {
    date: day.date,
    tmin: round1(tmin),
    tmax: round1(tmax),
    tmean: round1(tmean),
    rain: round1(rain),
    popMax: popMax == null ? null : round1(popMax),
    windMax: round1(windMax),
    gustMax: gustMax == null ? null : round1(gustMax),
    et0: round1(et0sum),
    rhHours90,
    rhHours85
  };
}

// Hargreaves daily estimate using Ra=12 mm/day approx
function hargreavesDay(tmean, tmax, tmin) {
  const Ra = 12;
  if (tmean == null || tmax == null || tmin == null) return 0;
  const dt = Math.max(tmax - tmin, 0);
  const val = 0.0023 * (tmean + 17.8) * Math.sqrt(dt) * Ra;
  return val;
}

// Spray windows: rows array and options unused now
export function sprayWindows(rows, opts={}) {
  // Precompute
  const N = rows.length;
  const meta = rows.map((r,i) => {
    // Look ahead 6 hours h..h+5
    const window = rows.slice(i, i+6);
    const rainNow = (r.rain||0);
    const rainAhead = sum(window.map(x=>x.rain||0));
    const popVals = window.map(x=>x.pop).filter(v=>v!=null);
    const popMax = popVals.length ? Math.max(...popVals) : null;
    const gustNow = r.gust;
    // Primary GOOD criteria
    let good = true;
    let reason = null;
    // isDay
    if (r.isDay !== 1) { good = false; reason = 'night'; }
    // rain now
    if (good && rainNow >= 0.1) { good = false; reason = 'rain_now'; }
    // rain soon
    if (good && rainAhead >= 0.5) { good = false; reason = 'rain_soon'; }
    // pop soon
    if (good && popMax != null && popMax >= 40) { good = false; reason = 'rain_soon'; }
    // gust
    if (good && gustNow != null && gustNow >= 25) { good = false; reason = 'wind_high'; }
    // wind / temperature / humidity: hard limits first, then the caution bands
    let caution = false;
    if (good) {
      const w = r.wind;
      if (w == null || w > 19) { good = false; reason = 'wind_high'; }
      else if (w < 1.5) { good = false; reason = 'wind_calm'; }
      else if (r.temp > 32) { good = false; reason = 'hot'; }
      else if (r.temp < 10) { good = false; reason = 'cold'; }
      else if (r.rh < 30) { good = false; reason = 'dry_air'; }
      else if (w < 3 || w > 15 || r.temp > 30 || r.rh < 40) { caution = true; }
    }
    return {
      index: i,
      t: r.t,
      date: dateOf(r.t),
      hour: hourOf(r.t),
      isDay: r.isDay,
      wind: r.wind || 0,
      temp: r.temp,
      rh: r.rh,
      rainNow,
      rainAhead,
      popMax,
      good,
      caution,
      bad: !good,
      reason
    };
  });

  // Group by day
  const days = groupByDay(rows);
  const result = [];
  for (let d of days) {
    const dayMeta = meta.filter(m=>m.date===d.date);
    // Build blockers: count of daylight hours by reason
    const blockers = {};
    for (let m of dayMeta) {
      if (m.isDay===1 && m.bad) {
        blockers[m.reason] = (blockers[m.reason]||0)+1;
      }
    }
    // Build windows: runs of consecutive hours where not bad (good or caution)
    const windows = [];
    let run = null;
    for (let i=0;i<dayMeta.length;i++) {
      const m = dayMeta[i];
      if (m.isDay !== 1) {
        // treat as break
        if (run) { // finalize
          if (run.hours.length >= 2) windows.push(run);
          run = null;
        }
        continue;
      }
      if (!m.bad) {
        if (!run) {
          run = { startIdx: i, hours: [m], cautionHours: m.caution?1:0 };
        } else {
          run.hours.push(m);
          if (m.caution) run.cautionHours++;
        }
      } else {
        // finalize existing run
        if (run) {
          if (run.hours.length >= 2) windows.push(run);
          run = null;
        }
      }
    }
    if (run) {
      if (run.hours.length >= 2) windows.push(run);
      run = null;
    }

    // Map windows to required shape
    const mapped = windows.map(w => {
      const startHour = w.hours[0].hour;
      const endHour = w.hours[w.hours.length-1].hour + 1; // exclusive
      const hours = w.hours.length;
      const cautionHours = w.cautionHours;
      const meanWind = mean(w.hours.map(h=>h.wind)) || 0;
      const level = cautionHours>0 ? 'caution' : 'go';
      const score = round1(hours*10 - cautionHours*5 - meanWind);
      return {
        start: String(startHour).padStart(2,'0') + ':00',
        end: String(endHour).padStart(2,'0') + ':00',
        hours,
        level,
        cautionHours,
        meanWind: round1(meanWind),
        score
      };
    });

    // Select best window: highest score preferring 'go' over 'caution'
    let best = null;
    for (let w of mapped) {
      if (!best) { best = w; continue; }
      if (w.score > best.score) best = w;
      else if (w.score === best.score) {
        if (best.level === 'caution' && w.level === 'go') best = w;
      }
    }
    result.push({
      date: d.date,
      windows: mapped,
      best: best || null,
      blockers
    });
  }
  return result;
}

// irrigationAdvice
export function irrigationAdvice(rows, cropId, stageId, opts={ soil:'loam', lastIrrigationDays: 10 }) {
  // FAO-56 checkbook method simplified
  if (!rows || rows.length === 0) throw new Error('no data');
  const soilKey = opts.soil || 'loam';
  const soil = SOILS[soilKey] || SOILS.loam;
  const crop = CROPS[cropId];
  if (!crop) throw new Error('unknown crop');

  const rootDepth = (cropId === 'paddy') ? 0.3 : 0.6; // m
  const taw = (soil.fc - soil.wp) * 1000 * rootDepth; // mm
  const p = (cropId === 'paddy') ? 0.2 : 0.5;
  const raw = p * taw;

  // kc for stageId
  let kc = null;
  if (stageId) {
    const st = (crop.stages||[]).find(s=>s.id===stageId);
    if (st) kc = st.kc;
  }
  if (kc == null) {
    // fallback to mean of stages
    kc = mean((crop.stages||[]).map(s=>s.kc)) || 1;
  }

  // rain72: sum first 72 hours
  const rain72 = round1(sum(take(rows,72).map(r=>r.rain||0)));

  // group days and prepare day summaries for up to 7 days
  const days = groupByDay(rows).slice(0,7);
  const daySums = days.map(daySummary);

  // etc7: sum of et0_day * kc for 7 days
  const etc7 = round1(sum(daySums.map(d=> (d.et0||0) * kc )));

  // ETc next 3 days
  const etc3 = sum(daySums.slice(0,3).map(d=> (d.et0||0) * kc ));

  // effective rain per day
  const effRainDays = daySums.map(d => (d.rain >= 5 ? 0.8 * d.rain : 0));

  // sm: first non-null soil moisture in hourly rows
  const firstSmRow = rows.find(r=> r.sm != null);
  let depletionMm = null;
  let estimated = false;
  if (firstSmRow && firstSmRow.sm != null) {
    const sm = firstSmRow.sm;
    const fc = soil.fc;
    depletionMm = Math.max(0, (fc - sm)) * 1000 * rootDepth; // mm
  } else {
    // estimate from lastIrrigationDays * mean daily ETc (use kc)
    estimated = true;
    const meanEtcPerDay = mean(daySums.map(d=> (d.et0||0) * kc )) || 2; // fallback 2 mm/day
    depletionMm = opts.lastIrrigationDays * meanEtcPerDay;
  }
  depletionMm = round1(depletionMm);
  const tawMm = round1(taw);
  const rawMm = round1(raw);

  // Decision logic
  let decision = 'ok';
  let daysUntil = null;
  if (cropId === 'paddy') {
    if (rain72 >= 20) {
      decision = 'hold_rain';
    } else if (firstSmRow && firstSmRow.sm != null && firstSmRow.sm < (soil.fc - 0.02)) {
      decision = 'irrigate';
    } else {
      decision = 'ok';
    }
  } else {
    if (rain72 >= 15) {
      decision = 'hold_rain';
    } else if (depletionMm >= raw) {
      decision = 'irrigate';
    } else {
      // simulate next days to see if soon
      let Dr = (depletionMm || 0);
      let crossed = false;
      const lookDays = Math.min(7, daySums.length);
      for (let i=0;i<lookDays;i++) {
        const etci = (daySums[i].et0||0) * kc;
        const eff = effRainDays[i] || 0;
        Dr += etci - eff;
        if (Dr >= raw) {
          daysUntil = i+1;
          decision = 'irrigate_soon';
          crossed = true;
          break;
        }
      }
      if (!crossed) {
        decision = 'ok';
      }
    }
  }

  // waterSavedMm typical values
  let waterSavedMm = 0;
  if (decision === 'hold_rain') {
    waterSavedMm = (cropId === 'paddy') ? 75 : 50;
  }

  // stage-critical
  let critical = false;
  if (cropId === 'wheat' && (stageId === 'vegetative' || stageId === 'flowering')) critical = true;

  return {
    decision,
    depletionMm: round1(depletionMm),
    rawMm: round1(raw),
    tawMm: round1(taw),
    rain72: round1(rain72),
    etc7: round1(etc7),
    kc: round1(kc),
    daysUntil: daysUntil == null ? null : daysUntil,
    estimated,
    critical,
    waterSavedMm: round1(waterSavedMm)
  };
}

export function hazards(rows, cropId, stageId) {
  if (!rows || rows.length === 0) return [];
  const crop = CROPS[cropId] || null;
  const days = groupByDay(rows);
  const summaries = days.map(daySummary);

  const hazardsOut = [];
  // Helpers for disease consecutive logic
  const consec = {
    late_blight: 0,
    yellow_rust: 0,
    white_rust: 0,
    blast: 0
  };

  for (let i=0;i<summaries.length;i++) {
    const d = summaries[i];
    const dayRows = days[i].rows || [];
    const tmin = d.tmin;
    const tmax = d.tmax;
    const tmean = d.tmean;
    const rain = d.rain;
    const gust = d.gustMax || 0;
    // frost
    if (tmin != null) {
      if (tmin <= 0) {
        hazardsOut.push({ date: d.date, type: 'frost', level: 'stop', value: round1(tmin), threshold: 0 });
      } else if (crop && crop.sensitive && crop.sensitive.frostC != null) {
        const fc = crop.sensitive.frostC;
        if (tmin <= fc) hazardsOut.push({ date: d.date, type: 'frost', level: 'stop', value: round1(tmin), threshold: fc });
        else if (tmin <= fc + 2) hazardsOut.push({ date: d.date, type: 'frost', level: 'caution', value: round1(tmin), threshold: fc + 2 });
      }
    }

    // heat (only if stage in heatStages)
    if (crop && crop.sensitive && Array.isArray(crop.sensitive.heatStages) && crop.sensitive.heatStages.length>0) {
      const hs = crop.sensitive.heatStages;
      if (stageId && hs.includes(stageId) && tmax != null) {
        const heatC = crop.sensitive.heatC;
        if (tmax >= heatC) hazardsOut.push({ date: d.date, type: 'heat', level: 'stop', value: round1(tmax), threshold: heatC });
        else if (tmax >= heatC - 2) hazardsOut.push({ date: d.date, type: 'heat', level: 'caution', value: round1(tmax), threshold: heatC - 2 });
      }
    }

    // heavy_rain
    if (rain != null) {
      if (rain >= 64.5) hazardsOut.push({ date: d.date, type: 'heavy_rain', level: 'stop', value: round1(rain), threshold: 64.5 });
      else if (rain >= 35) hazardsOut.push({ date: d.date, type: 'heavy_rain', level: 'caution', value: round1(rain), threshold: 35 });
    }

    // strong_wind
    if (gust != null) {
      if (gust >= 50) hazardsOut.push({ date: d.date, type: 'strong_wind', level: 'stop', value: round1(gust), threshold: 50 });
      else if (gust >= 40) hazardsOut.push({ date: d.date, type: 'strong_wind', level: 'caution', value: round1(gust), threshold: 40 });
    }

    // Disease rules (risk indicators)
    // late_blight: tmin >=10 and rhHours90 >=6 (relaxed) -> one day caution, two consecutive -> stop
    const dz = crop && crop.sensitive ? crop.sensitive.disease : null;
    if (dz === 'late_blight') {
      // We always evaluate late_blight as a general risk indicator for potato/tomato etc. Check for criteria
      const lb_cond = (tmin != null && tmin >= 10 && d.rhHours90 >= 6);
      if (lb_cond) consec.late_blight += 1;
      else consec.late_blight = 0;
      if (consec.late_blight >= 2) {
        hazardsOut.push({ date: d.date, type: 'late_blight', level: 'stop', value: d.rhHours90, threshold: 6 });
      } else if (consec.late_blight === 1) {
        hazardsOut.push({ date: d.date, type: 'late_blight', level: 'caution', value: d.rhHours90, threshold: 6 });
      }
    }

    // yellow_rust: tmean 10-20 and rhHours85 >=8
    if (dz === 'yellow_rust') {
    const yr_cond = (tmean != null && tmean >= 10 && tmean <= 20 && d.rhHours85 >= 8);
    if (yr_cond) consec.yellow_rust += 1; else consec.yellow_rust = 0;
    if (consec.yellow_rust >= 2) {
      hazardsOut.push({ date: d.date, type: 'yellow_rust', level: 'stop', value: d.rhHours85, threshold: 8 });
    } else if (consec.yellow_rust === 1) {
      hazardsOut.push({ date: d.date, type: 'yellow_rust', level: 'caution', value: d.rhHours85, threshold: 8 });
    }
    }

    // white_rust: tmean 10-20 and rhHours90 >=6
    if (dz === 'white_rust') {
    const wr_cond = (tmean != null && tmean >= 10 && tmean <= 20 && d.rhHours90 >= 6);
    if (wr_cond) consec.white_rust += 1; else consec.white_rust = 0;
    if (consec.white_rust >= 2) {
      hazardsOut.push({ date: d.date, type: 'white_rust', level: 'stop', value: d.rhHours90, threshold: 6 });
    } else if (consec.white_rust === 1) {
      hazardsOut.push({ date: d.date, type: 'white_rust', level: 'caution', value: d.rhHours90, threshold: 6 });
    }
    }

    // blast: tmin between 20 and 26 and rhHours90 >=10
    if (dz === 'blast') {
    const bl_cond = (tmin != null && tmin >= 20 && tmin <= 26 && d.rhHours90 >= 10);
    if (bl_cond) consec.blast += 1; else consec.blast = 0;
    if (consec.blast >= 2) {
      hazardsOut.push({ date: d.date, type: 'blast', level: 'stop', value: d.rhHours90, threshold: 10 });
    } else if (consec.blast === 1) {
      hazardsOut.push({ date: d.date, type: 'blast', level: 'caution', value: d.rhHours90, threshold: 10 });
    }
    }

    // bollworm: no rule (return nothing)
  }

  // Deduplicate: ensure at most one hazard per day per type (we might have duplicates from generic checks)
  const unique = [];
  const seen = new Set();
  for (const h of hazardsOut) {
    const key = `${h.date}|${h.type}`;
    if (!seen.has(key)) {
      seen.add(key);
      // ensure numeric values rounded
      unique.push({
        date: h.date,
        type: h.type,
        level: h.level,
        value: h.value == null ? null : round1(h.value),
        threshold: h.threshold == null ? null : round1(h.threshold)
      });
    }
  }
  return unique;
}

export function sowingAdvice(rows, cropId) {
  if (!rows || rows.length === 0) throw new Error('no data');
  const allowed = ['wheat','mustard','chickpea','potato'];
  if (!allowed.includes(cropId)) return null;
  const days = groupByDay(rows).slice(0,5);
  const sums = days.map(daySummary);
  const tmean5 = round1(mean(sums.map(d=>d.tmean).filter(v=>v!=null)) || null);
  // rain next 48h
  const rain48 = round1(sum(take(rows,48).map(r=>r.rain||0)));
  // ideal ranges and too-warm thresholds
  const ranges = {
    wheat: { min:16, max:22, tooWarm:25 },
    mustard: { min:18, max:25, tooWarm:28 },
    chickpea: { min:18, max:26, tooWarm:30 },
    potato: { min:15, max:25, tooWarm:30 }
  };
  const r = ranges[cropId];
  if (rain48 >= 20) {
    return { verdict: 'wait', tmean5, reason: 'heavy_rain' };
  }
  if (tmean5 == null) return { verdict: 'wait', tmean5, reason: 'no_temp' };
  if (tmean5 >= r.min && tmean5 <= r.max) {
    return { verdict: 'sow', tmean5, reason: 'within_range' };
  }
  if (tmean5 < r.min) {
    return { verdict: 'cold', tmean5, reason: 'too_cold' };
  }
  // tmean5 > r.max
  if (tmean5 > r.tooWarm) {
    return { verdict: 'wait', tmean5, reason: 'too_warm' };
  }
  return { verdict: 'marginal', tmean5, reason: 'marginally_warm' };
}

export function fertilizerAdvice(rows) {
  if (!rows || rows.length === 0) throw new Error('no data');
  const rain48 = round1(sum(take(rows,48).map(r=>r.rain||0)));
  if (rain48 >= 20) {
    return { verdict: 'hold', reason: 'heavy_rain_next_48h' };
  }
  return { verdict: 'go', reason: 'safe_to_topdress; if no rain, irrigate lightly after urea to reduce volatilization' };
}

const SEVERITY = { stop: 0, caution: 1, go: 2, info: 3 };

/**
 * The agent's decision step: observe the forecast, run every rule, and rank
 * the resulting actions for today. Returns structured actions (codes + numbers)
 * so the UI can render them in any language, plus a reasoning trace.
 */
export function plan(rows, { crop, stage, soil = 'loam', lastIrrigationDays = 10 } = {}) {
  if (!rows || rows.length === 0) throw new Error('no data');
  if (!CROPS[crop]) throw new Error('unknown crop');
  const generatedFrom = rows[0].t;
  const days = groupByDay(rows);
  const spray = sprayWindows(rows);
  const irrigation = irrigationAdvice(rows, crop, stage, { soil, lastIrrigationDays });
  const hazardsAll = hazards(rows, crop, stage);
  const sowing = stage === 'sowing' ? sowingAdvice(rows, crop) : null;
  const fertilizer = fertilizerAdvice(rows);

  const daysOut = days.map((d) => ({
    date: d.date,
    summary: daySummary(d),
    spray: spray.find((s) => s.date === d.date) || { date: d.date, windows: [], best: null, blockers: {} },
    hazards: hazardsAll.filter((h) => h.date === d.date),
  }));

  // ---- today's ranked actions ----
  const today = daysOut[0];
  const actions = [];
  // hazards in the next 3 days are actionable today (prepare in advance)
  for (const h of hazardsAll.filter((h) => daysOut.slice(0, 3).some((d) => d.date === h.date))) {
    actions.push({ kind: 'hazard', type: h.type, level: h.level, date: h.date, value: h.value, threshold: h.threshold });
  }
  const irrLevel = { irrigate: 'caution', irrigate_soon: 'info', hold_rain: 'go', ok: 'go' }[irrigation.decision] || 'info';
  actions.push({ kind: 'irrigation', type: irrigation.decision, level: irrLevel, ...irrigation });
  // spray: today's best window, else the next day that has one
  const nextSpray = daysOut.find((d) => d.spray.best);
  if (today.spray.best) {
    actions.push({ kind: 'spray', type: 'window', level: today.spray.best.level, date: today.date, ...today.spray.best });
  } else if (!rows.some((r) => r.t.slice(0, 10) === today.date && r.isDay === 1)) {
    // no daylight left today (evening/night): point to the next good window instead of a "stop"
    actions.push({ kind: 'spray', type: 'next_window', level: nextSpray ? nextSpray.spray.best.level : 'info', date: today.date,
      next: nextSpray ? { date: nextSpray.date, ...nextSpray.spray.best } : null });
  } else {
    const blockers = Object.entries(today.spray.blockers).sort((a, b) => b[1] - a[1]);
    actions.push({ kind: 'spray', type: 'no_window', level: 'stop', date: today.date,
      reason: blockers.length ? blockers[0][0] : 'night',
      next: nextSpray ? { date: nextSpray.date, ...nextSpray.spray.best } : null });
  }
  actions.push({ kind: 'fertilizer', type: fertilizer.verdict, level: fertilizer.verdict === 'hold' ? 'caution' : 'go' });
  if (sowing) actions.push({ kind: 'sowing', type: sowing.verdict, level: sowing.verdict === 'sow' ? 'go' : 'caution', tmean5: sowing.tmean5, reason: sowing.reason });
  actions.sort((a, b) => (SEVERITY[a.level] ?? 9) - (SEVERITY[b.level] ?? 9));

  // ---- reasoning trace ----
  const rainTotal = round1(sum(rows.map((r) => r.rain || 0)));
  const goodHours = spray.reduce((a, s) => a + s.windows.reduce((b, w) => b + w.hours, 0), 0);
  const trace = [
    { step: 'observe', detail: `${rows.length} hourly rows over ${daysOut.length} days from ${generatedFrom}; rain total ${rainTotal} mm; Tmin ${Math.min(...daysOut.map((d) => d.summary.tmin))}°C, Tmax ${Math.max(...daysOut.map((d) => d.summary.tmax))}°C` },
    { step: 'context', detail: `crop ${crop}, stage ${stage}, soil ${soil}; Kc ${irrigation.kc}; root-zone TAW ${irrigation.tawMm} mm, RAW ${irrigation.rawMm} mm` },
    { step: 'rule', detail: `spray: ${goodHours} usable daylight hours in ${spray.filter((s) => s.best).length}/${spray.length} days; today ${today.spray.best ? today.spray.best.start + '-' + today.spray.best.end + ' (' + today.spray.best.level + ')' : 'no window'}` },
    { step: 'rule', detail: `irrigation: depletion ${irrigation.depletionMm} mm${irrigation.estimated ? ' (estimated)' : ''} vs RAW ${irrigation.rawMm} mm; rain next 72 h ${irrigation.rain72} mm; 7-day crop water use ${irrigation.etc7} mm` },
    { step: 'rule', detail: `hazards: ${hazardsAll.length ? hazardsAll.map((h) => `${h.type}/${h.level} on ${h.date}`).join(', ') : 'none in the forecast window'}` },
    { step: 'decide', detail: `top action: ${actions[0].kind}:${actions[0].type} (${actions[0].level})` },
  ];

  return { crop, stage, soil, generatedFrom, days: daysOut, irrigation, sowing, fertilizer, actions, trace };
}
