# How AgentFoundry was used

KhetCast was built with **AgentFoundry SMART-Code**, the hosted coding agent inside the AgentFoundry IDE
(account: cryptocloud786@gmail.com, free trial with 1,000 credits/month).

**Environment note:** the build machine was a headless Linux box, so the AgentFoundry desktop IDE (Electron) could not open a
window there. We called SMART-Code's hosted endpoint directly instead: `codenow.pro/api/codenow-code/chat`, the same endpoint
the IDE's SMART-Code panel uses, with the same AgentFoundry account session. `agentfoundry/afcode.py` is that small client.
SMART-Code routed each request itself (GPT-5-mini for the "deep" prompts, Claude Haiku 4.5 when pinned).

## What SMART-Code generated

| Prompt | Output | Model (routing) |
|---|---|---|
| `01_engine.txt` + `01b_engine_rest.txt` | `src/engine.js`: crops/Kc table, spray windows, FAO-56 irrigation, hazards, sowing, urea, plan | GPT-5-mini (DEEP_INTENT) |
| `02_i18n.txt` | `src/i18n.js`: Hindi + English text, dates, WhatsApp and speech summaries | GPT-5-mini |
| `03_ask.txt` | `src/ask.js`: Hindi/Hinglish/English question parser and grounded answers | GPT-5-mini |
| `04_app.txt` | `src/app.js`: UI controller (first ~300 lines; the reply hit max_tokens) | Claude Haiku 4.5 (pinned) |

`agentfoundry/runs.jsonl` holds every prompt, the routing decision, the stop reason and the full reply.

## What was changed by hand after review (and caught by tests)

- `engine.js`: the generated spray rules made the "caution" band unreachable (light-wind, warm and dry-air hours were
  rejected outright). The rules were reordered into hard limits then caution bands. Disease rules ran for every crop; they now
  run only for the crop's own disease. `plan()` was rewritten to return structured, ranked actions and a richer reasoning
  trace. A `next_window` action was added for evening runs, so the agent doesn't say "do not spray" at night.
- `i18n.js`: the spray text said "no rain for {window length} hours". It now says 6 hours, which is the actual rule. The
  `next_window` text was added.
- `ask.js`: `\b` word boundaries don't work for Devanagari, so "कल" (tomorrow) was missed. They were replaced with
  Unicode-aware boundaries. "day after tomorrow" is now checked before "tomorrow".
- `app.js`: soil id typo (`sand` → `sandy`), blocker lookup on an object, offline fallback, IST time display, and the
  truncated start-up code were completed.
- Written by hand: `weather.js` (provider fallback), `index.html`, `styles.css`, `sw.js`, tests, backtest.
