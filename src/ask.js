import { actionText, fmtDate, blockerText } from './i18n.js';

// Helper lists
const HINGLISH_WORDS = ['kal','aaj','parso','kya','kab','karu','karun','sakta','chhidkav','chidkav','paani','pani','sinchai','barish','baarish','pala','buvai','bowai','khad','yuria'];
const INTENTS = [
  ['spray', ['spray','spraying','pesticide','dawai','dawa','chhidkav','chidkav','छिड़काव','छिडकाव','स्प्रे','दवा']],
  ['irrigate', ['irrigat','water the','watering','paani','pani','sinchai','सिंचाई','पानी']],
  ['urea', ['urea','fertili','khad','yuria','यूरिया','खाद']],
  ['frost', ['frost','cold','pala','thand','पाला','ठंड']],
  ['rain', ['rain','barish','baarish','बारिश','बरसात','mausam']],
  ['sow', ['sow','sowing','buvai','bowai','बुवाई','बोना','बोनी']],
  ['heat', ['heat','hot','garmi','गर्मी','लू']]
];

// Weekday maps (0=Sunday)
const EN_WEEKDAYS = { sunday:0, sun:0, monday:1, mon:1, tuesday:2, tue:2, wednesday:3, wed:3, thursday:4, thu:4, friday:5, fri:5, saturday:6, sat:6 };
const HI_WEEKDAYS = { 'रविवार':0,'रवि':0,'सोमवार':1,'सोम':1,'मंगलवार':2,'मंगल':2,'बुधवार':3,'बुध':3,'गुरुवार':4,'गुरु':4,'शुक्रवार':5,'शुक्र':5,'शनिवार':6,'शनि':6 };

// Utility checks
function containsDevanagari(s){
  return /[\u0900-\u097F]/.test(s);
}
function containsAnyWord(s, words){
  const lower = s.toLowerCase();
  return words.some(w => lower.includes(w.toLowerCase()));
}
function firstIntent(text){
  const lower = text.toLowerCase();
  for(const [intent, toks] of INTENTS){
    for(const t of toks){
      if(lower.includes(t.toLowerCase())) return intent;
    }
  }
  return 'summary';
}
function detectWeekday(text){
  const lower = text.toLowerCase();
  for(const k in EN_WEEKDAYS) if(new RegExp('(^|[^a-z])' + k + '([^a-z]|$)').test(lower)) return EN_WEEKDAYS[k];
  for(const k in HI_WEEKDAYS) if(text.includes(k)) return HI_WEEKDAYS[k];
  return null;
}
function detectDayOffset(text){
  const lower = text.toLowerCase();
  // Unicode-aware word boundaries (\b does not work for Devanagari)
  const w = (alts) => new RegExp('(^|[^\\p{L}\\p{M}])(' + alts + ')(?=$|[^\\p{L}\\p{M}])', 'u');
  if(w('day after|parso|parson|परसों').test(lower)) return 2;
  if(w('today|aaj|आज').test(lower)) return 0;
  if(w('tomorrow|kal|कल').test(lower)) return 1; // treat 'कल' as tomorrow
  return null;
}

// parseQuestion: returns { intent, dayOffset, weekday, lang }
export function parseQuestion(text){
  const lang = (containsDevanagari(text) || containsAnyWord(text, HINGLISH_WORDS)) ? 'hi' : 'en';
  const intent = firstIntent(text);
  const weekday = detectWeekday(text);
  let dayOffset = null;
  if(weekday === null){
    dayOffset = detectDayOffset(text);
    if(dayOffset === null) dayOffset = 0;
  } else {
    dayOffset = null;
  }
  return { intent, dayOffset, weekday, lang };
}

// Helper to safely get nested numeric values
function num(v){ return (v === null || v === undefined) ? 0 : v; }

// Resolve day index by weekday or offset
function resolveDayIndex(plan, parsed){
  if(parsed.weekday !== null && parsed.weekday !== undefined){
    for(let i=0;i<plan.days.length;i++){
      const d = plan.days[i].date;
      const wd = new Date(Date.UTC(...d.split('-').map((x,i)=> i===0? +x : +x - (i===1?1:0)) )).getUTCDay();
      // Above Date.UTC usage: need year, month-1, day -> computed manually
      // Simpler: parse components:
    }
  }
  // Re-implement weekday properly:
  if(parsed.weekday !== null && parsed.weekday !== undefined){
    for(let i=0;i<plan.days.length;i++){
      const parts = plan.days[i].date.split('-').map(Number);
      const utc = Date.UTC(parts[0], parts[1]-1, parts[2]);
      const wd = new Date(utc).getUTCDay();
      if(wd === parsed.weekday) return i;
    }
    return plan.days.length - 1;
  }
  // else by offset
  const offset = (parsed.dayOffset === null || parsed.dayOffset === undefined) ? 0 : parsed.dayOffset;
  const idx = Math.min(offset, plan.days.length - 1);
  return idx;
}

// Normalize actionText result to string
function renderAction(obj, lang){
  const res = actionText(obj, lang);
  if(!res && typeof res === 'string') return res;
  if(typeof res === 'string') return res;
  if(res && typeof res === 'object'){
    if(res.title && res.why) return `${res.title}. ${res.why}`;
    if(res.title) return res.title;
    if(res.text) return res.text;
    // fallback stringify
    return JSON.stringify(res);
  }
  return String(res);
}

// Main answer function
export function answer(plan, text, langOverride){
  const parsed = parseQuestion(text);
  const lang = langOverride || parsed.lang || 'en';
  const idx = resolveDayIndex(plan, parsed);
  const day = plan.days[Math.max(0, Math.min(idx, plan.days.length-1))];
  const dateStr = day.date;
  const dateFormatted = fmtDate(dateStr, lang);
  const intent = parsed.intent;

  // Helpers for i18n simple templates
  const en = (s) => s;
  const hiTemplates = {
    spray_yes: `${dateFormatted} पर स्प्रे करें: {start} से {end} (हवा लगभग {meanWind} किमी/घंटा, बाद में 6 घंटे तक बरसात नहीं)।`,
    spray_yes_short: `हाँ — ${dateFormatted} पर स्प्रे करें {start}–{end} (हवा ~{meanWind} km/h).`,
    spray_no: `बेहतर नहीं है ${dateFormatted}: {blocker}.`,
    spray_next: `अगला अच्छा समय: {date} {start}–{end}.`,
    irrigate_rain: `बारिश ${dateFormatted}: {rain} mm.`,
    urea_hold: `बरसात होने के कारण यूरिया रोका जाए।`,
    urea_go: `हाँ — ${dateFormatted} पर यूरिया डालें। बारिश: {rain} mm.`,
    frost_no: `कोई पाला अपेक्षित नहीं है ${dateFormatted}: न्यूनतम {tmin}°C.`,
    rain_line: `${dateFormatted}: {rain} mm बारिश की संभावना{pop}.`,
    sow_none: `बुवाई की सलाह तब दिखाई जाती है जब आप 'Sowing' चरण चुनते हैं।`,
    heat_no: `कोई अधिक गर्मी की चेतावनी नहीं ${dateFormatted}: अधिकतम {tmax}°C.`,
    summary_none: `No actions available.`
  };

  function tpl(t, map){
    return t.replace(/\{([^}]+)\}/g, (_,k)=> (map[k]===undefined?'':String(map[k])));
  }

  let outText = '';

  if(intent === 'spray'){
    const best = day.spray && day.spray.best ? day.spray.best : null;
    if(best){
      const start = best.start || '';
      const end = best.end || '';
      const meanWind = best.meanWind !== undefined && best.meanWind !== null ? best.meanWind : '';
      if(lang === 'hi'){
        let base = tpl(hiTemplates.spray_yes_short, {start,end,meanWind,date:dateFormatted});
        if(best.level === 'caution'){
          base += ' सावधानी आवश्यक है।';
        }
        outText = base;
      } else {
        let base = `Yes — on ${dateFormatted} spray between ${start} and ${end} (wind about ${meanWind} km/h, no rain for 6 hours after).`;
        if(best.level === 'caution') base += ' Caution advised.';
        outText = base;
      }
    } else {
      // top blocker
      let blockerMsg = '';
      if(day.spray && day.spray.blockers){
        const entries = Object.entries(day.spray.blockers);
        if(entries.length){
          entries.sort((a,b)=>b[1]-a[1]);
          const [reason,count] = entries[0];
          blockerMsg = blockerText(reason, count, lang);
        }
      }
      if(lang === 'hi'){
        const base = tpl(hiTemplates.spray_no, {blocker: blockerMsg, date: dateFormatted});
        outText = base;
      } else {
        outText = `Better not on ${dateFormatted}: ${blockerMsg}.`;
      }
      // suggest next good window
      let found = null;
      for(let i=idx+1;i<plan.days.length;i++){
        const b = plan.days[i].spray && plan.days[i].spray.best ? plan.days[i].spray.best : null;
        if(b){ found = {date: plan.days[i].date, start: b.start, end: b.end}; break; }
      }
      if(found){
        const fdate = fmtDate(found.date, lang);
        if(lang === 'hi'){
          outText += ' ' + tpl(hiTemplates.spray_next, {date: fdate, start: found.start, end: found.end});
        } else {
          outText += ` Next good window: ${fdate} ${found.start}–${found.end}.`;
        }
      }
    }
  } else if(intent === 'irrigate'){
    const art = actionText({ kind:'irrigation', type: plan.irrigation.decision, ...plan.irrigation }, lang);
    let title='', why='';
    if(art && typeof art === 'object'){ title = art.title || ''; why = art.why || ''; }
    else { title = art || ''; why = ''; }
    const rain = (day.summary && day.summary.rain !== undefined && day.summary.rain !== null) ? day.summary.rain : '';
    if(typeof title === 'string' && why){
      outText = `${title}. ${why} `;
    } else {
      outText = (title || '');
    }
    const rainLine = (lang==='hi') ? tpl(hiTemplates.irrigate_rain, {rain,date:dateFormatted}) : `Rain on ${dateFormatted}: ${rain} mm.`;
    outText = outText.trim();
    if(outText) outText += ' ';
    outText += rainLine;
  } else if(intent === 'urea'){
    const todayRain = num(day.summary && day.summary.rain);
    const nextDay = plan.days[Math.min(plan.days.length-1, idx+1)];
    const nextRain = nextDay ? num(nextDay.summary && nextDay.summary.rain) : 0;
    if(todayRain + nextRain >= 20){
      outText = (lang==='hi') ? hiTemplates.urea_hold : `Hold urea because heavy rain is expected (${todayRain + nextRain} mm over two days).`;
    } else {
      if(lang === 'hi'){
        outText = tpl(hiTemplates.urea_go, {rain: todayRain});
      } else {
        outText = `Yes — apply urea on ${dateFormatted}. Rain: ${todayRain} mm.`;
      }
    }
  } else if(intent === 'frost'){
    const frost = (day.hazards || []).find(h=>h.type === 'frost');
    if(frost){
      outText = renderAction(frost, lang);
    } else {
      const tmin = day.summary && day.summary.tmin !== undefined ? day.summary.tmin : '';
      if(lang==='hi'){
        outText = tpl(hiTemplates.frost_no, {tmin,date:dateFormatted});
      } else {
        outText = `No frost expected on ${dateFormatted}: lowest ${tmin}°C.`;
      }
    }
  } else if(intent === 'rain'){
    const rain = day.summary && day.summary.rain !== undefined && day.summary.rain !== null ? day.summary.rain : 0;
    const pop = day.summary && day.summary.popMax !== undefined && day.summary.popMax !== null ? day.summary.popMax : null;
    if(lang === 'hi'){
      const popText = pop ? `, संभावना ${pop}% तक` : '';
      outText = `${dateFormatted}: ${rain} mm बारिश की संभावना${pop ? `, ${pop}% तक` : ''}.`;
    } else {
      outText = `${dateFormatted}: ${rain} mm rain expected${pop ? `, chance up to ${pop}%` : ''}.`;
    }
  } else if(intent === 'sow'){
    if(plan.sowing){
      outText = renderAction({ kind:'sowing', type: plan.sowing.verdict, ...plan.sowing }, lang);
    } else {
      outText = (lang==='hi') ? hiTemplates.sow_none : `Sowing advice is shown when you choose the Sowing stage.`;
    }
  } else if(intent === 'heat'){
    const heat = (day.hazards || []).find(h=>h.type === 'heat');
    if(heat){
      outText = renderAction(heat, lang);
    } else {
      const tmax = day.summary && day.summary.tmax !== undefined ? day.summary.tmax : '';
      if(lang === 'hi'){
        outText = tpl(hiTemplates.heat_no, {tmax,date:dateFormatted});
      } else {
        outText = `No extreme heat expected ${dateFormatted}: highest ${tmax}°C.`;
      }
    }
  } else { // summary
    const actions = plan.actions || [];
    if(actions.length === 0){
      outText = (lang==='hi') ? hiTemplates.summary_none : 'No actions available.';
    } else {
      const parts = [];
      for(let i=0;i<Math.min(2, actions.length);i++){
        parts.push(renderAction(actions[i], lang));
      }
      outText = parts.join(' ');
    }
  }

  return { lang, intent, date: dateStr, text: outText };
}