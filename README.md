# KhetCast 🌾: your field's weather, turned into today's work

**Live app:** https://cryptocloud786.github.io/khetcast/ · **Track:** Agriculture · **Code for a Billion 2026** (Code for India) · **License:** MIT

KhetCast is a free, open-source **field-action agent** for India's small and marginal farmers. A farmer gives a
village name (or taps *Use my location*), a crop and its stage. The agent then pulls the hour-by-hour forecast for that
exact spot and tells them in **Hindi or English** what to do today and this week:

- **When to spray** (and when not to): the hours with light wind and no rain for 6 hours afterwards. Without those, pesticide washes off or drifts.
- **Whether to irrigate**: an FAO-56 soil-water check (crop coefficient × reference evapotranspiration vs. the root-zone
  limit). It **holds irrigation when rain is coming**.
- **Alerts** for the next 3 days: frost, heat stress at sensitive stages (e.g. wheat grain filling), heavy rain
  (IMD categories), damaging gusts, and weather-based **disease-risk indicators** (late blight on potato and tomato, yellow rust on wheat,
  white rust on mustard, blast on paddy).
- **Sowing and urea timing**: is the 5-day temperature right for sowing, and is heavy rain due that would wash urea away?
- **Ask in your own words**: "कल छिड़काव कर सकते हैं?", "kya aaj sinchai karu?", "Will there be frost on Friday?".
  It answers only with numbers from the plan, never invented ones.
- **Read aloud** (Hindi/English speech for low-literacy users), **Share on WhatsApp**, and it **works offline** (PWA, last plan cached).

## Why it matters

| | |
|---|---|
| **Who** | India has **146.45 million operational holdings**, and **86%** are small or marginal (<2 ha) ([Agriculture Census 2015-16](https://agcensus.da.gov.in/document/agcen1516/T1_ac_2015_16.pdf), [PIB](https://www.pib.gov.in/PressReleasePage.aspx?PRID=1906888)). |
| **Loss** | India lost **33.9 million ha of crops to excess rain** and 35 million ha to drought in 2015–2021 ([WEF](https://www.weforum.org/stories/2024/08/income-insurance-india-climate-resilience/)). A spray that rain washes off, or that drifts in the wind, wastes the farmer's money and still leaves the pest. |
| **Gap** | Official agromet advisories are district-level bulletins issued twice a week. A farmer needs to know *which hours tomorrow* are safe for *his crop at its current stage*, in his language. |

## Evidence: backtest on real forecasts vs. what actually happened

`backtest/run.js` replays **forecasts exactly as they were issued** (Open-Meteo Previous-Runs API, 1 and 2 days ahead)
through the **same engine code**. It then checks the decisions against the **weather that actually happened** (ERA5 reanalysis) in
**12 farming districts** (Karnal, Ludhiana, Meerut, Hisar, Indore, Jaipur, Patna, Nashik, Guntur, Bardhaman, Rajkot,
Belagavi). Each week the farmer plans one spray. The baseline sprays at 10:00 on the planned day. KhetCast picks its window
from the evening-before forecast. A spray **fails** if ≥1 mm of real rain fell within 6 h (wash-off) or the wind was
>15 km/h (drift).

| Season | Planned sprays | Baseline failed | KhetCast failed | Failed sprays avoided |
|---|---:|---:|---:|---:|
| Kharif 2025 (15 Jun–15 Oct) | 216 | 108 (50.0%) | 40 of 144 sprayed (27.8%) | **68 (−63%)** |
| Rabi 2025-26 (1 Nov–31 Mar) | 264 | 17 (6.4%) | 7 of 263 sprayed (2.7%) | **10 (−59%)** |

Honest caveats: in the monsoon the agent **postponed 72 of 216 sprays** to the next week (33 more moved by one day),
because no safe window was forecast. That avoids waste but delays pest control. For Rabi 2025-26 wheat irrigation, the
season was dry: 0 of 60 calendar irrigations were followed by ≥20 mm of rain, so the rain-hold rule rarely fired (1
hold, which was correct). ERA5 is a ~25 km reanalysis, not a field rain gauge. Full numbers are in `backtest/results.json`.
**KhetCast launched in November 2026 and has no field users yet. These are simulated outcomes on real historical data, not
deployment data.** The next step is a pilot with a KVK / FPO.

## How the agent works

```
observe  → tools: geocode(place) · forecast(lat,lon)  [Open-Meteo → Open-Meteo archive endpoint → MET Norway fallback]
reason   → rules: sprayWindows · irrigationAdvice (FAO-56) · hazards (IMD / Hutton / rust & blast indicators) · sowing · fertilizer
decide   → rank actions (stop > caution > go) for today, plus a 7-day calendar
explain  → reasoning trace shown in the app ("How the agent decided"), Hindi/English text, speech, WhatsApp share
answer   → free-text Q&A grounded on the plan (Hindi, Hinglish, English)
```

Everything runs in the browser. No server, no login, and no personal data leaves the phone except the coordinates sent to the
forecast APIs. It costs ₹0 to run, so any NGO, KVK or state department can fork and host it.

| File | Purpose |
|---|---|
| `src/engine.js` | Pure decision engine (spray windows, FAO-56 irrigation, hazards, sowing, urea, `plan()` + trace) |
| `src/weather.js` | Forecast/geocoding tools with provider fallback and IST normalisation |
| `src/i18n.js` | Hindi + English text for every action, WhatsApp/speech summaries |
| `src/ask.js` | Question parser (Hindi/Hinglish/English) and grounded answers |
| `src/app.js`, `index.html`, `styles.css`, `sw.js` | Mobile-first PWA UI |
| `tests/engine.test.js` | 15 tests (`node --test`) |
| `backtest/` | Data download script, committed data, backtest and results |
| `agentfoundry/` | Every AgentFoundry SMART-Code prompt and reply used to build this (see `AGENTFOUNDRY.md`) |

## Run it

```bash
git clone https://github.com/cryptocloud786/khetcast && cd khetcast
npm test              # 15 unit tests, Node >= 20, no dependencies
npm run backtest      # reproduces the table above from backtest/data
python3 -m http.server 8080   # open http://localhost:8080
```

Shareable deep link example (opens straight to a plan):
`https://cryptocloud786.github.io/khetcast/?lat=29.69&lon=76.98&name=Karnal&crop=wheat&stage=sowing&lang=hi&auto=1`

## Built with AgentFoundry

The engine, the Hindi/English text layer, the question-answering module and the first version of the UI controller were generated by
**AgentFoundry SMART-Code** (routed to GPT-5-mini and Claude Haiku 4.5), then reviewed, corrected and tested. See
[`AGENTFOUNDRY.md`](AGENTFOUNDRY.md) for the prompts, the routing log and what was changed by hand.

## Limits

Advisory only. Disease alerts are weather-based **risk indicators**, not diagnoses. Thresholds are general agronomy
defaults (FAO-56, IMD, Hutton criteria) and should be tuned per region with KVK scientists. Forecasts can be wrong.

Forecast data © [Open-Meteo](https://open-meteo.com/) (CC BY 4.0) and [MET Norway](https://api.met.no/) (CC BY 4.0). ERA5 via Open-Meteo.

Author: Abdul AmberNeel ([@cryptocloud786](https://github.com/cryptocloud786)) · cryptocloud786@gmail.com
