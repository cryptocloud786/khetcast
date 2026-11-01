import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { plan, sprayWindows, irrigationAdvice, hazards, sowingAdvice, fertilizerAdvice, daySummary, groupByDay, CROPS } from '../src/engine.js';
import { fromOpenMeteo, fromMetNo, forecast } from '../src/weather.js';
import { actionText, shareText, fmtDate, UI } from '../src/i18n.js';
import { answer, parseQuestion } from '../src/ask.js';

// --- synthetic weather: 7 days, calm dry mornings, configurable overrides ---
function week({ startDate = '2026-11-02', days = 7, base = {}, override = () => ({}) } = {}) {
  const rows = [];
  const d0 = Date.UTC(+startDate.slice(0, 4), +startDate.slice(5, 7) - 1, +startDate.slice(8, 10));
  for (let d = 0; d < days; d++) {
    const date = new Date(d0 + d * 86400e3).toISOString().slice(0, 10);
    for (let h = 0; h < 24; h++) {
      const t = `${date}T${String(h).padStart(2, '0')}:00`;
      const r = { t, temp: 14 + 8 * Math.sin(((h - 8) / 24) * 2 * Math.PI), rh: 60, rain: 0, pop: 0, wind: 8, gust: 14,
        et0: h >= 7 && h < 18 ? 0.35 : 0.02, sm: 0.28, isDay: h >= 7 && h < 18 ? 1 : 0, ...base };
      Object.assign(r, override(d, h, r));
      rows.push(r);
    }
  }
  return rows;
}

test('groupByDay and daySummary', () => {
  const days = groupByDay(week());
  assert.equal(days.length, 7);
  const s = daySummary(days[0]);
  assert.equal(s.rain, 0);
  assert.ok(s.tmax > s.tmin);
  assert.ok(s.et0 > 3 && s.et0 < 5);
});

test('spray: calm dry day gives a full daylight go window', () => {
  const sw = sprayWindows(week());
  assert.equal(sw[0].best.level, 'go');
  assert.equal(sw[0].best.start, '07:00');
  assert.equal(sw[0].best.end, '18:00');
});

test('spray: rain at 13:00 blocks the 6 hours before it', () => {
  const rows = week({ override: (d, h) => (d === 0 && h === 13 ? { rain: 2 } : {}) });
  const day = sprayWindows(rows)[0];
  // hours 08..13 see the rain within h..h+5 -> only 07:00 is clean before, 14:00-18:00 after
  assert.equal(day.best.start, '14:00');
  assert.ok(day.blockers.rain_soon >= 5);
});

test('spray: strong wind blocks, light wind is caution', () => {
  const windy = sprayWindows(week({ base: { wind: 24, gust: 35 } }))[0];
  assert.equal(windy.best, null);
  assert.ok(windy.blockers.wind_high > 0);
  const calm = sprayWindows(week({ base: { wind: 2.2, gust: 5 } }))[0];
  assert.equal(calm.best.level, 'caution');
});

test('irrigation: dry soil with no rain -> irrigate; big rain -> hold', () => {
  const dry = irrigationAdvice(week({ base: { sm: 0.18 } }), 'wheat', 'vegetative');
  assert.equal(dry.decision, 'irrigate');
  assert.equal(dry.critical, true);
  const wet = irrigationAdvice(week({ base: { sm: 0.18 }, override: (d, h) => (d === 1 && h < 8 ? { rain: 3 } : {}) }), 'wheat', 'vegetative');
  assert.equal(wet.decision, 'hold_rain');
  assert.equal(wet.waterSavedMm, 50);
});

test('irrigation: estimates depletion when soil moisture is missing', () => {
  const r = irrigationAdvice(week({ base: { sm: null } }), 'mustard', 'flowering', { soil: 'loam', lastIrrigationDays: 20 });
  assert.equal(r.estimated, true);
  assert.equal(r.decision, 'irrigate');
});

test('hazards: frost for mustard, heat for wheat at grain fill, heavy rain', () => {
  const cold = hazards(week({ override: (d, h) => (d === 2 && h === 5 ? { temp: 1.5 } : {}) }), 'mustard', 'flowering');
  assert.ok(cold.some((x) => x.type === 'frost' && x.level === 'stop'));
  const hot = hazards(week({ override: (d, h) => (d === 1 && h === 14 ? { temp: 34 } : {}) }), 'wheat', 'grain_fill');
  assert.ok(hot.some((x) => x.type === 'heat' && x.level === 'stop'));
  const notStage = hazards(week({ override: (d, h) => (d === 1 && h === 14 ? { temp: 34 } : {}) }), 'wheat', 'vegetative');
  assert.ok(!notStage.some((x) => x.type === 'heat'));
  const flood = hazards(week({ override: (d, h) => (d === 3 && h < 10 ? { rain: 8 } : {}) }), 'paddy', 'vegetative');
  assert.ok(flood.some((x) => x.type === 'heavy_rain' && x.level === 'stop'));
});

test('hazards: late blight only for potato/tomato, needs two humid mild days for stop', () => {
  const humid = (d, h) => (d < 2 ? { temp: 12 + (h % 5), rh: h < 8 || h > 20 ? 95 : 80 } : {});
  const potato = hazards(week({ override: humid }), 'potato', 'tuber').filter((x) => x.type === 'late_blight');
  assert.deepEqual(potato.map((x) => x.level), ['caution', 'stop']);
  const wheat = hazards(week({ override: humid }), 'wheat', 'vegetative');
  assert.ok(!wheat.some((x) => x.type === 'late_blight'));
});

test('sowing and fertilizer advice', () => {
  assert.equal(sowingAdvice(week({ override: (d, h, r) => ({ temp: r.temp + 4 }) }), 'wheat').verdict, 'sow');
  assert.equal(sowingAdvice(week({ override: (d, h, r) => ({ temp: r.temp + 14 }) }), 'wheat').verdict, 'wait');
  assert.equal(sowingAdvice(week(), 'cotton'), null);
  assert.equal(fertilizerAdvice(week({ override: (d, h) => (d === 0 && h < 5 ? { rain: 5 } : {}) })).verdict, 'hold');
  assert.equal(fertilizerAdvice(week()).verdict, 'go');
});

test('plan: ranks stop hazards first and explains itself', () => {
  const rows = week({ base: { sm: 0.18 }, override: (d, h) => (d === 1 && h === 5 ? { temp: 1 } : {}) });
  const p = plan(rows, { crop: 'mustard', stage: 'flowering' });
  assert.equal(p.actions[0].kind, 'hazard');
  assert.equal(p.actions[0].type, 'frost');
  assert.ok(p.trace.length >= 5);
  assert.throws(() => plan([], { crop: 'wheat', stage: 'sowing' }), /no data/);
  for (const c of Object.keys(CROPS)) for (const s of CROPS[c].stages) plan(rows, { crop: c, stage: s.id });
});

test('plan: evening run points to the next window instead of a stop', () => {
  const rows = week().filter((r) => r.t >= '2026-11-02T19:00');
  const p = plan(rows, { crop: 'wheat', stage: 'vegetative' });
  const spray = p.actions.find((a) => a.kind === 'spray');
  assert.equal(spray.type, 'next_window');
  assert.equal(spray.next.date, '2026-11-03');
});

test('real Open-Meteo fixture (Karnal, 1 Nov 2026) runs end-to-end in both languages', () => {
  const json = JSON.parse(fs.readFileSync(new URL('../fixtures/karnal-2026-11-01.openmeteo.json', import.meta.url)));
  const rows = fromOpenMeteo(json);
  assert.equal(rows.length, 192);
  const p = plan(rows, { crop: 'wheat', stage: 'sowing' });
  for (const lang of ['en', 'hi']) {
    for (const a of p.actions) {
      const { title, why } = actionText(a, lang);
      assert.ok(title && why, `missing text for ${a.kind}/${a.type} in ${lang}`);
      assert.ok(!/undefined|NaN|\{/.test(title + why), `bad text: ${title} ${why}`);
    }
    const msg = shareText(p, 'Karnal', lang);
    assert.ok(msg.includes('khetcast'));
    assert.ok(UI[lang].title);
  }
});

test('MET Norway adapter converts UTC to IST and m/s to km/h', () => {
  const rows = fromMetNo({ properties: { timeseries: [
    { time: '2026-11-02T03:00:00Z', data: { instant: { details: { air_temperature: 15, relative_humidity: 70, wind_speed: 2 } }, next_1_hours: { details: { precipitation_amount: 0.4 } } } },
  ] } });
  assert.equal(rows[0].t, '2026-11-02T08:00');
  assert.equal(rows[0].wind, 7.2);
  assert.equal(rows[0].isDay, 1);
});

test('forecast() falls back to the next provider when one fails', async () => {
  const json = JSON.parse(fs.readFileSync(new URL('../fixtures/karnal-2026-11-01.openmeteo.json', import.meta.url)));
  let calls = 0;
  const fakeFetch = async (url) => {
    calls++;
    if (url.startsWith('https://api.open-meteo.com')) return { ok: false, status: 429, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => json };
  };
  const out = await forecast(29.69, 76.98, { fetchImpl: fakeFetch, now: new Date('2026-11-01T06:30:00Z') });
  assert.equal(out.source, 'Open-Meteo (archive endpoint)');
  assert.equal(out.rows[0].t, '2026-11-01T12:00');
  assert.equal(calls, 2);
});

test('ask: answers spray / irrigation / frost questions in Hindi and English', () => {
  const p = plan(week(), { crop: 'wheat', stage: 'vegetative' });
  assert.equal(parseQuestion('कल छिड़काव कर सकते हैं?').dayOffset, 1);
  const a = answer(p, 'Can I spray tomorrow?');
  assert.equal(a.intent, 'spray');
  assert.equal(a.date, '2026-11-03');
  assert.match(a.text, /07:00/);
  const h = answer(p, 'kya aaj sinchai karu?');
  assert.equal(h.lang, 'hi');
  assert.equal(h.intent, 'irrigate');
  assert.equal(fmtDate('2026-11-02', 'en'), 'Mon 2 Nov');
});
