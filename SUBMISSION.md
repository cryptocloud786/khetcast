# Code for a Billion 2026: submission answers

**Team / Project name:** KhetCast (solo)

**Team members:** Abdul AmberNeel (@cryptocloud786)

**Track:** Agriculture

**Repo:** https://github.com/cryptocloud786/khetcast · **Live app:** https://cryptocloud786.github.io/khetcast/ · **Video:** https://youtu.be/ueDsJylaiGU

## Problem statement
India's small and marginal farmers make costly field decisions every day with only a district-level weather bulletin that
comes twice a week: when to spray, whether to irrigate, and whether to sow or apply urea. When pesticide is sprayed hours
before rain it washes off, and when it is sprayed in strong wind it drifts. The farmer pays for the chemical and the labour and still loses
the crop to the pest. Irrigating just before a downpour wastes water and diesel and waterlogs the field. KhetCast gives each farmer the
hours that are safe for *their* field, *their* crop and *its* stage, in Hindi or English, on any phone.

## What we built
A free, open-source, browser-only field-action agent (PWA, works offline). The farmer enters a village or uses GPS, then picks a crop
(wheat, mustard, chickpea, potato, paddy, cotton, sugarcane or tomato) and its stage. The agent:
1. **Observes**: geocodes the place and pulls the hourly forecast, with automatic fallback across Open-Meteo, the Open-Meteo
   archive endpoint and MET Norway.
2. **Reasons**: runs spray-window rules (wind, 6-hour rain look-ahead, temperature, humidity), an FAO-56 soil-water check
   for irrigation (Kc × ET0 vs. root-zone RAW, holding when rain is coming), hazard rules (frost, stage-specific heat,
   IMD heavy rain, gusts) and weather-based disease-risk indicators (late blight via Hutton criteria, yellow rust, white rust, blast). It also gives
   sowing and urea timing.
3. **Decides and explains**: ranks today's actions (stop > caution > go), builds a 7-day spray calendar, and shows a reasoning trace.
4. **Talks**: Hindi and English text, read-aloud for low-literacy users, a WhatsApp share, and free-text questions in Hindi,
   Hinglish or English ("कल छिड़काव कर सकते हैं?"). Answers use only numbers from the plan.

**How AgentFoundry was used:** AgentFoundry SMART-Code (auto-routed to GPT-5-mini and Claude Haiku 4.5) generated the
decision engine (`src/engine.js`), the Hindi/English text layer (`src/i18n.js`), the question-answering module
(`src/ask.js`) and the first version of the UI controller (`src/app.js`). Each was reviewed, corrected and covered by 15
`node --test` tests. Every prompt, routing decision and reply is committed in `agentfoundry/`; see `AGENTFOUNDRY.md`. The build ran on a
headless Linux machine, so SMART-Code was called through its hosted endpoint (the one the IDE uses) with our AgentFoundry account.

## Scale & severity
- **Scale:** India has **146.45 million operational holdings**, and **86%** of them are small or marginal (<2 ha)
  (Agriculture Census 2015-16: https://agcensus.da.gov.in/document/agcen1516/T1_ac_2015_16.pdf ;
  PIB: https://www.pib.gov.in/PressReleasePage.aspx?PRID=1906888). Spraying, irrigation and sowing timing affect
  every one of them, every season.
- **Severity:** India lost **33.9 million ha of crops to excess rain** and 35 million ha to drought in 2015–2021
  (WEF: https://www.weforum.org/stories/2024/08/income-insurance-india-climate-resilience/). In our backtest (below),
  **half of all sprays made at a fixed time in the 2025 monsoon would have been washed off or drifted.** That is money
  spent on chemicals and labour with no protection for the crop.

## Deployment & impact data
- **Deployed:** live at https://cryptocloud786.github.io/khetcast/ since 1 Nov 2026 (GitHub Pages, ₹0 hosting, no login).
  **There are no field users or usage data yet.** We say so plainly rather than claim any.
- **Measured effect on real historical data:** `backtest/run.js` runs the *same engine code* on forecasts **as they were
  issued** 1–2 days ahead (Open-Meteo Previous-Runs API). It checks the results against **what actually happened** (ERA5) in 12 farming districts:
  Karnal, Ludhiana, Meerut, Hisar, Indore, Jaipur, Patna, Nashik, Guntur, Bardhaman, Rajkot and Belagavi. The farmer plans one spray each week.
  A spray fails if ≥1 mm of rain fell within 6 h or the wind was >15 km/h.
  - Kharif 2025: baseline (10:00 on the planned day) failed **108/216 (50%)**. With KhetCast, **40/144 (27.8%)** failed:
    **68 failed sprays avoided (−63%)**. The agent postponed 72 sprays for lack of a safe window, which is a real trade-off.
  - Rabi 2025-26: baseline failed **17/264 (6.4%)**; KhetCast **7/263 (2.7%)**, so **−59%**.
  - Wheat irrigation in Rabi 2025-26 was a dry season (0 of 60 calendar irrigations were followed by ≥20 mm of rain), so the rain-hold
    rule had little to save that year.
- **Next step:** a pilot with a Krishi Vigyan Kendra or FPO, comparing farmers' spray logs before and after use.
