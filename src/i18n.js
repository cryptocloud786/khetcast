export const LANGS = ['en', 'hi'];

export const UI = {
  en: {
    title: 'KhetCast',
    tagline: "Your field's weather, turned into today's work",
    place: 'Village / town',
    placeHint: 'e.g. Karnal, Nashik, Bardhaman',
    useGps: 'Use my location',
    crop: 'Crop',
    stage: 'Crop stage',
    soil: 'Soil',
    lastIrrigation: 'Days since last irrigation',
    planBtn: 'Plan my week',
    today: 'Today',
    week: 'Next 7 days',
    why: 'Why',
    speak: 'Read aloud',
    share: 'Share on WhatsApp',
    copy: 'Copy',
    copied: 'Copied',
    trace: 'How the agent decided',
    ask: 'Ask a question',
    askHint: 'e.g. Can I spray tomorrow? / कल छिड़काव कर सकते हैं?',
    offline: 'Offline: showing your last saved plan',
    source: 'Forecast',
    disclaimer:
      'Advisory only. Disease alerts are weather-based risk indicators; confirm with your KVK or agriculture officer before spraying.',
    loading: 'Reading the forecast…',
    noPlace: 'Place not found',
    sprayCol: 'Spray window',
    rainCol: 'Rain',
    tempCol: 'Min / Max',
    windCol: 'Max wind',
    alertsCol: 'Alerts',
    none: '—',
    dataError:
      'Could not load the forecast. Check your connection and try again.',
  },
  hi: {
    title: 'KhetCast',
    tagline: 'आपके खेत का मौसम, आज के काम में बदला गया',
    place: 'गांव / कस्बा',
    placeHint: 'उदा. करनाल, नाशिक, बरदोहमान',
    useGps: 'मेरी लोकेशन इस्तेमाल करें',
    crop: 'फसल',
    stage: 'फसल का चरण',
    soil: 'मिट्टी',
    lastIrrigation: 'आखिरी सिंचाई से दिन',
    planBtn: 'मेरा सप्ताह बनाएं',
    today: 'आज',
    week: 'आगले 7 दिन',
    why: 'क्यों',
    speak: 'पढ़कर सुनाएं',
    share: 'WhatsApp पर साझा करें',
    copy: 'कॉपी करें',
    copied: 'कॉपी किया गया',
    trace: 'एजेंट ने कैसे फैसला किया',
    ask: 'सवाल पूछें',
    askHint: 'उदा. कल छिड़काव कर सकते हैं?',
    offline: 'ऑफलाइन: आपका आखिरी सहेजा प्लान दिखा रहा है',
    source: 'पूर्वानुमान',
    disclaimer:
      'सलाह के लिए है। रोग चेतावनियाँ मौसम-आधारित जोखिम हैं; छिड़काव से पहले अपने KVK या कृषि अधिकारी से पुष्टि करें।',
    loading: 'पूर्वानुमान पढ़ रहे हैं…',
    noPlace: 'स्थान नहीं मिला',
    sprayCol: 'छिड़काव विंडो',
    rainCol: 'बारिश',
    tempCol: 'न्यून / अधिकतम',
    windCol: 'अधिकतम हवा',
    alertsCol: 'चेतावनियाँ',
    none: '—',
    dataError:
      'पूर्वानुमान लोड नहीं हो सका। अपना कनेक्शन जांचें और पुनः प्रयास करें।',
  },
};

export const CROP_NAMES = {
  en: {
    wheat: 'Wheat',
    mustard: 'Mustard',
    chickpea: 'Chickpea',
    potato: 'Potato',
    paddy: 'Paddy (rice)',
    cotton: 'Cotton',
    sugarcane: 'Sugarcane',
    tomato: 'Tomato',
  },
  hi: {
    wheat: 'गेहूं',
    mustard: 'सरसों',
    chickpea: 'चना',
    potato: 'आलू',
    paddy: 'धान',
    cotton: 'कपास',
    sugarcane: 'गन्ना',
    tomato: 'टमाटर',
  },
};

export const STAGE_NAMES = {
  en: {
    sowing: 'Sowing',
    vegetative: 'Growing (tillering / vegetative)',
    flowering: 'Flowering',
    grain_fill: 'Grain filling',
    fruiting: 'Fruiting',
    tuber: 'Tuber bulking',
    boll: 'Boll formation',
    maturity: 'Maturity / harvest',
  },
  hi: {
    sowing: 'बुवाई',
    vegetative: 'विकास (तना/विकास)',
    flowering: 'फूल आने का चरण',
    grain_fill: 'दाने भरना',
    fruiting: 'फल लगना',
    tuber: 'गुच्छा बढ़ना (ट्यूबर)',
    boll: 'बॉल बनना',
    maturity: 'परिपक्वता / कटाई',
  },
};

export const SOIL_NAMES = {
  en: {
    sandy: 'Sandy',
    loam: 'Loam (domat)',
    clay: 'Clay (heavy)',
  },
  hi: {
    sandy: 'रेतीली',
    loam: 'दोमट',
    clay: 'चिकनी (भारी)',
  },
};

const EN_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTH = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const HI_WEEK = ['रवि', 'सोम', 'मंगल', 'बुध', 'गुरु', 'शुक्र', 'शनि'];
const HI_MONTH = [
  'जन॰',
  'फ़र॰',
  'मार्च',
  'अप्रै',
  'मई',
  'जून',
  'जुलाई',
  'अग॰',
  'सित॰',
  'अक्टू',
  'नव॰',
  'दिस॰',
];

function parseYMD(dateStr) {
  const [Y, M, D] = dateStr.split('-').map((s) => parseInt(s, 10));
  return { Y, M: M - 1, D };
}

export function fmtDate(dateStr, lang) {
  // dateStr 'YYYY-MM-DD'
  const { Y, M, D } = parseYMD(dateStr);
  const d = new Date(Date.UTC(Y, M, D));
  const wd = d.getUTCDay(); // 0 Sun
  if (lang === 'hi') {
    return `${HI_WEEK[wd]} ${D} ${HI_MONTH[M]}`;
  }
  return `${EN_WEEK[wd]} ${D} ${EN_MONTH[M]}`;
}

function num(v) {
  if (v === null || v === undefined) return '—';
  return String(v);
}

export function actionText(action, lang) {
  const dateLabel = action.date ? fmtDate(action.date, lang) : null;
  const en = {
    hazard: {
      frost: {
        title: `Frost risk on ${dateLabel}: min ${num(action.value)}°C`,
        why: `Your crop is damaged near ${num(action.threshold)}°C. Give a light irrigation the evening before and avoid spraying that night.`,
      },
      heat: {
        title: `Heat stress on ${dateLabel}: max ${num(action.value)}°C`,
        why: `At this stage heat above ${num(action.threshold)}°C shrivels grain. Keep soil moist; irrigate lightly in the evening.`,
      },
      heavy_rain: {
        title: `Heavy rain on ${dateLabel}: ${num(action.value)} mm`,
        why: `Clear field drains now. Do not spray, irrigate or apply urea before it.`,
      },
      strong_wind: {
        title: `Strong gusts on ${dateLabel}: ${num(action.value)} km/h`,
        why: `Tall crop may lodge. Avoid irrigating just before; do not spray.`,
      },
      late_blight: {
        title: `Late blight weather on ${dateLabel}`,
        why: `Cool, very humid hours (${num(action.value)} h at 90%+ humidity) favour late blight. Inspect leaves; if your KVK advises, use a protective spray in the next dry window.`,
      },
      yellow_rust: {
        title: `Yellow rust weather on ${dateLabel}`,
        why: `Cool humid days favour yellow rust. Check leaves for yellow stripes and report to KVK.`,
      },
      white_rust: {
        title: `White rust weather on ${dateLabel}`,
        why: `Humid cool hours favour white rust on mustard. Inspect plants and follow KVK advice before spraying.`,
      },
      blast: {
        title: `Blast weather on ${dateLabel}`,
        why: `Warm humid nights favour blast. Avoid extra urea and inspect leaves; treat if KVK recommends.`,
      },
    },
    irrigation: {
      irrigate: {
        title: 'Irrigate now',
        why: `Root zone has lost about ${num(action.depletionMm)} mm of water (limit ${num(action.rawMm)} mm) and little rain is coming.${
          action.critical ? ' This is a critical stage — do not skip it.' : ''
        }`,
      },
      irrigate_soon: {
        title: `Irrigation due in about ${num(action.daysUntil)} day(s)`,
        why: `Crop will use about ${num(action.etc7)} mm this week; soil reaches its limit in ${num(action.daysUntil)} day(s).`,
      },
      hold_rain: {
        title: 'Hold irrigation — rain is coming',
        why: `${num(action.rain72)} mm of rain expected in the next 3 days. Skipping saves about ${num(
          action.waterSavedMm
        )} mm of water and a pump run.`,
      },
      ok: {
        title: 'No irrigation needed now',
        why: `Soil moisture is enough for now; crop will use about ${num(action.etc7)} mm this week.`,
      },
    },
    spray: {
      window: {
        title: `Spray ${dateLabel} ${action.start}–${action.end}`,
        why: `Wind about ${num(action.meanWind)} km/h, no rain for at least 6 hours after spraying.${
          action.level === 'caution' ? ' Conditions are borderline; prefer the earlier hours.' : ''
        }`,
      },
      no_window: {
        title: `Do not spray ${dateLabel}`,
        why: {
          night: `It is night: spraying then will not dry well.`,
          rain_now: `It is raining now — spray will be washed off.`,
          rain_soon: `Rain is expected within 6 hours — it would wash the spray off.`,
          wind_high: `Wind is too strong — spray will drift.`,
          wind_calm: `No wind — poor spray coverage; wait for a light breeze.`,
          hot: `Too hot — spray may evaporate quickly and damage plants.`,
          cold: `Too cold — spray may not dry and can harm plants.`,
          dry_air: `Air is very dry — spray may evaporate; prefer cooler hours.`,
        }[action.reason] ||
          `Conditions are not suitable for spraying.`,
      },
    },
    fertilizer: {
      go: {
        title: 'OK to top-dress urea',
        why: 'No heavy rain in the next 2 days. Irrigate lightly after if the soil is dry.',
      },
      hold: {
        title: 'Hold urea',
        why: 'Heavy rain within 2 days would wash it away.',
      },
    },
    sowing: {
      sow: {
        title: 'Good days to sow',
        why: `Average temperature over 5 days ${num(action.tmean5)}°C is in the right range.`,
      },
      marginal: {
        title: 'You can sow, but it is warm',
        why: `${num(action.tmean5)}°C average; choose a heat-tolerant variety and ensure first irrigation on time.`,
      },
      wait: {
        title:
          action.reason === 'too_warm'
            ? 'Wait to sow — too warm'
            : action.reason === 'heavy_rain'
            ? 'Wait to sow — heavy rain due'
            : 'Wait to sow',
        why: action.reason === 'too_warm'
          ? 'Temperature is higher than ideal for germination.'
          : action.reason === 'heavy_rain'
          ? 'Heavy rain is expected which would damage seedbeds.'
          : 'Conditions are not suitable for sowing.',
      },
      cold: {
        title: 'Too cold for good germination',
        why: 'Soil temperature is low; wait for warmer days.',
      },
    },
  };

  const hi = {
    hazard: {
      frost: {
        title: `पाले का खतरा ${dateLabel}: न्यून ${num(action.value)}°C`,
        why: `आपकी फसल ${num(action.threshold)}°C के पास क्षतिग्रस्त हो सकती है। इससे पहले शाम को हल्की सिंचाई करें और उसी रात छिड़काव न करें।`,
      },
      heat: {
        title: `गर्मी का तनाव ${dateLabel}: अधिकतम ${num(action.value)}°C`,
        why: `इस अवस्था में ${num(action.threshold)}°C से ऊपर गर्मी दानों को सिकोड़ देती है। मिट्टी नम रखें; शाम को हल्की सिंचाई करें।`,
      },
      heavy_rain: {
        title: `भारी बारिश ${dateLabel}: ${num(action.value)} mm`,
        why: `खेत के नाले साफ करें। छिड़काव, सिंचाई या यूरिया देने से पहले रुको।`,
      },
      strong_wind: {
        title: `तेज़ हवा ${dateLabel}: झटके ${num(action.value)} km/h`,
        why: `ऊँची फसल झुक सकती है। सीधी सिंचाई से पहले सावधान रहें; छिड़काव न करें।`,
      },
      late_blight: {
        title: `लेट ब्लाइट के अनुकूल मौसम ${dateLabel}`,
        why: `शीत और बहुत नमी वाले घंटे (${num(action.value)} घं. 90%+ नमी) लेट ब्लाइट को बढ़ावा देते हैं। पत्तियाँ जांचें; KVK की सलाह पर सूखी विंडो में सुरक्षात्मक छिड़काव करें।`,
      },
      yellow_rust: {
        title: `येलो रस्ट के अनुकूल मौसम ${dateLabel}`,
        why: `ठंडी नम दिन येलो रस्ट को बढ़ावा देते हैं। पत्तियों में पीली धार देखें और KVK को रिपोर्ट करें।`,
      },
      white_rust: {
        title: `व्हाइट रस्ट के अनुकूल मौसम ${dateLabel}`,
        why: `सरसों पर नमी और ठंडे घंटे व्हाइट रस्ट के लिए अनुकूल हैं। पौधों की जाँच करें और KVK की सलाह लें।`,
      },
      blast: {
        title: `ब्लास्ट के अनुकूल मौसम ${dateLabel}`,
        why: `गर्म नमीली रातें ब्लास्ट को बढ़ाती हैं। अतिरिक्त यूरिया से बचें और पत्तियाँ जांचें; KVK सलाह पर उपचार करें।`,
      },
    },
    irrigation: {
      irrigate: {
        title: 'अब सिंचाई करें',
        why: `जड़ क्षेत्र ने लगभग ${num(action.depletionMm)} mm पानी खो दिया है (सीमा ${num(
          action.rawMm
        )} mm) और बारिश कम होने की उम्मीद है।${action.critical ? ' यह महत्वपूर्ण चरण है — न छोड़ें।' : ''}`,
      },
      irrigate_soon: {
        title: `सिंचाई लगभग ${num(action.daysUntil)} दिन में चाहिए`,
        why: `फसल इस सप्ताह लगभग ${num(action.etc7)} mm पानी उपयोग करेगी; मिट्टी ${num(
          action.daysUntil
        )} दिन में सीमा पर पहुंच जाएगी।`,
      },
      hold_rain: {
        title: 'सिंचाई रोको — बारिश आने वाली है',
        why: `आगले 3 दिनों में लगभग ${num(
          action.rain72
        )} mm बारिश होगी। रोकने से करीब ${num(action.waterSavedMm)} mm पानी और पम्प चलाने की बचत होगी।`,
      },
      ok: {
        title: 'अभी सिंचाई की ज़रूरत नहीं',
        why: `मिट्टी में पर्याप्त नमी है; फसल इस सप्ताह लगभग ${num(action.etc7)} mm पानी उपयोग करेगी।`,
      },
    },
    spray: {
      window: {
        title: `छिड़काव ${dateLabel} ${action.start}–${action.end}`,
        why: `हवा लगभग ${num(action.meanWind)} km/h है, छिड़काव के बाद कम से कम 6 घंटे तक बारिश नहीं।${action.level === 'caution' ? ' हालात सीमांत हैं; सुबह के समय को प्राथमिकता दें।' : ''}`,
      },
      no_window: {
        title: `${dateLabel} को छिड़काव न करें`,
        why: {
          night: `रात के समय: छिड़काव ठीक से सूखेगा नहीं।`,
          rain_now: `अब बारिश हो रही है — छिड़काव धुल जाएगा।`,
          rain_soon: `6 घंटे के अंदर बारिश अनुमान है — छिड़काव धुल जाएगा।`,
          wind_high: `हवा बहुत तेज है — छिड़काव फैल जाएगा (ड्रिफ्ट)।`,
          wind_calm: `हवा बिलकुल शांत है — छिड़काव समुचित नहीं होगा; हल्की हवा का इंतज़ार करें।`,
          hot: `बहुत गरम है — छिड़काव तेजी से उड़ जाएगा और पौधों को नुकसान पहुंचा सकता है।`,
          cold: `बहुत ठंडा है — छिड़काव सूखेगा नहीं और नुकसान कर सकता है।`,
          dry_air: `हवा बहुत सूखी है — छिड़काव उड़ सकता है; ठंडे घण्टों का इंतज़ार बेहतर है।`,
        }[action.reason] || `छिड़काव के लिए परिस्थितियाँ अनुकूल नहीं हैं।`,
      },
    },
    fertilizer: {
      go: {
        title: 'यूरिया ऊपर डालने के लिए ठीक है',
        why: 'अगले 2 दिनों में भारी बारिश नहीं। मिट्टी सूखी हो तो हल्की सिंचाई करें।',
      },
      hold: {
        title: 'यूरिया न डालें',
        why: 'अगले 2 दिनों में भारी बारिश होगी और यह धो सकता है।',
      },
    },
    sowing: {
      sow: {
        title: 'बुवाई के लिए अच्छे दिन',
        why: `5 दिनों का औसत तापमान ${num(action.tmean5)}°C सही सीमा में है।`,
      },
      marginal: {
        title: 'बुवाई कर सकते हैं, पर गर्मी है',
        why: `${num(action.tmean5)}°C औसत है; गर्म प्रतिरोधी किस्म चुनें और पहली सिंचाई समय पर सुनिश्चित करें।`,
      },
      wait: {
        title:
          action.reason === 'too_warm'
            ? 'बुवाई रोकें — बहुत गर्म है'
            : action.reason === 'heavy_rain'
            ? 'बुवाई रोकें — भारी बारिश आ सकती है'
            : 'बुवाई रोकें',
        why:
          action.reason === 'too_warm'
            ? 'किराना अंक गर्मी बीज अंक के अनुकूल नहीं है।'
            : action.reason === 'heavy_rain'
            ? 'भारी बारिश बीजबेड खराब कर देगी।'
            : 'यहाँ बुवाई के लिए अनुकूल स्थिति नहीं है।',
      },
      cold: {
        title: 'अच्छी अंकुरण के लिए बहुत ठंड',
        why: 'मिट्टी का तापमान कम है; गरम दिनों का इंतज़ार करें।',
      },
    },
  };

  const dict = lang === 'hi' ? hi : en;

  if (action.kind === 'hazard') {
    const node = dict.hazard[action.type];
    if (node) return { title: node.title, why: node.why };
  }

  if (action.kind === 'irrigation') {
    const node = dict.irrigation[action.type];
    if (node) return { title: node.title, why: node.why };
  }

  if (action.kind === 'spray') {
    if (action.type === 'window') {
      const node = dict.spray.window;
      const title = (lang === 'hi' ? node.title : node.title).replace(
        `${action.date}`,
        dateLabel
      );
      return {
        title,
        why: node.why,
      };
    }
    if (action.type === 'next_window') {
      // evening / night: no daylight left today, so point to the next good window
      if (!action.next) return lang === 'hi'
        ? { title: 'अगले दिनों में छिड़काव का अच्छा समय नहीं', why: 'हवा या बारिश के कारण कोई सुरक्षित समय नहीं मिला। कल फिर देखें।' }
        : { title: 'No good spray window in the next days', why: 'Wind or rain block every daylight slot. Check again tomorrow.' };
      const d = fmtDate(action.next.date, lang);
      return lang === 'hi'
        ? { title: `अगला छिड़काव: ${d} ${action.next.start}–${action.next.end}`,
            why: `आज रोशनी का समय निकल चुका है। उस समय हवा लगभग ${num(action.next.meanWind)} km/h रहेगी और बाद के 6 घंटे बारिश नहीं।` }
        : { title: `Next spray window: ${d} ${action.next.start}–${action.next.end}`,
            why: `No daylight left today. Then the wind will be about ${num(action.next.meanWind)} km/h with no rain for 6 hours after.` };
    }
    if (action.type === 'no_window') {
      const node = dict.spray.no_window;
      const baseWhy = node.why;
      const nextMsg =
        action.next && action.next.date
          ? ` ${lang === 'hi' ? 'अगली उपयुक्त विंडो' : 'Next good window'}: ${fmtDate(
              action.next.date,
              lang
            )} ${action.next.start}–${action.next.end}.`
          : ` ${lang === 'hi' ? 'अगले दिनों में कोई अच्छा विंडो नहीं है।' : 'No good window in the next days.'}`;
      return {
        title: node.title,
        why: `${baseWhy}${action.next ? nextMsg : nextMsg}`,
      };
    }
  }

  if (action.kind === 'fertilizer') {
    const node = dict.fertilizer[action.type];
    if (node) return { title: node.title, why: node.why };
  }

  if (action.kind === 'sowing') {
    const node = dict.sowing[action.type];
    if (node) return { title: node.title, why: node.why };
  }

  // fallback
  return {
    title: action.title || (lang === 'hi' ? 'सूचना' : 'Notice'),
    why: action.why || '',
  };
}

export function blockerText(reason, lang) {
  const en = {
    rain_soon: 'rain soon',
    rain_now: 'raining now',
    wind_high: 'high wind',
    wind_calm: 'no wind',
    night: 'night',
    hot: 'too hot',
    cold: 'too cold',
    dry_air: 'dry air',
  };
  const hi = {
    rain_soon: 'बारिश आने वाली',
    rain_now: 'बारिश हो रही',
    wind_high: 'हवा तेज',
    wind_calm: 'हवा शांत',
    night: 'रात',
    hot: 'बहुत गर्म',
    cold: 'बहुत ठंड',
    dry_air: 'हवा सूखी',
  };
  const map = lang === 'hi' ? hi : en;
  return map[reason] || (lang === 'hi' ? 'अनजान कारण' : 'unknown reason');
}

function safeCropName(crop, lang) {
  const names = CROP_NAMES[lang] || CROP_NAMES.en;
  return names[crop] || crop || (lang === 'hi' ? 'अज्ञात फसल' : 'Unknown crop');
}
function safeStageName(stage, lang) {
  const names = STAGE_NAMES[lang] || STAGE_NAMES.en;
  return names[stage] || stage || (lang === 'hi' ? 'अज्ञात चरण' : 'Unknown stage');
}

export function shareText(plan, placeName, lang) {
  const headerEn = `🌾 KhetCast — ${placeName}, ${safeCropName(
    plan.crop,
    lang
  )} (${safeStageName(plan.stage, lang)})`;
  const headerHi = `🌾 KhetCast — ${placeName}, ${safeCropName(
    plan.crop,
    lang
  )} (${safeStageName(plan.stage, lang)})`;
  const header = lang === 'hi' ? headerHi : headerEn;

  const lines = [header, ''];

  // today's actions: filter actions with date equal to today? Spec: "then today's actions"
  // If plan has actions array, take first actions that have date === today or no date; fallback to first N
  const today = new Date();
  const y = today.getUTCFullYear();
  const m = String(today.getUTCMonth() + 1).padStart(2, '0');
  const d = String(today.getUTCDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;

  const todays = (plan.actions || []).filter(
    (a) => !a.date || a.date === todayStr
  );
  const pick = todays.length ? todays.slice(0, 4) : (plan.actions || []).slice(0, 4);

  if (pick.length) {
    pick.forEach((a) => {
      const t = actionText(a, lang);
      lines.push(`• ${t.title} — ${t.why}`);
    });
  } else {
    lines.push(lang === 'hi' ? '• आज कोई खास सूचनाएँ नहीं।' : '• No actions for today.');
  }

  lines.push('');
  lines.push(lang === 'hi' ? '7-दिवसीय छिड़काव विंडो:' : '7-day spray windows:');

  const days = plan.days || [];
  for (let i = 0; i < Math.min(7, days.length); i++) {
    const day = days[i];
    const label = fmtDate(day.date, lang);
    const best = day.spray && day.spray.best;
    if (best && best.start && best.end) {
      lines.push(`${label}: ${best.start}–${best.end}`);
    } else {
      lines.push(`${label}: —`);
    }
  }

  lines.push('');
  lines.push('Free & open source: https://cryptocloud786.github.io/khetcast/');

  return lines.join('\n');
}

export function speechText(plan, placeName, lang) {
  const actions = plan.actions || [];
  const top = actions.slice(0, 3);
  const parts = [];
  top.forEach((a) => {
    const t = actionText(a, lang);
    // remove symbols like • or emojis, keep clear sentences
    parts.push(`${t.title}. ${t.why}`);
  });
  return parts.join(' ');
}