"""Minimal client for AgentFoundry SMART-Code (codenow.pro/api/codenow-code/chat),
the same hosted endpoint the AgentFoundry desktop IDE calls. Uses the user's Supabase session.
Usage: python3 afcode.py usage | python3 afcode.py chat <prompt_file> [out_file]
Every call is logged to af_runs.jsonl (prompt, routing, reply) as an audit trail."""
import json, sys, time, urllib.request, urllib.error, os
SESS = os.environ.get('AF_SESSION', '.af_session.json')  # your own AgentFoundry (Supabase) session; never committed
BASE = 'https://codenow.pro/api/codenow-code'
SB = 'https://kowyrlofktpetkzdskai.supabase.co'
ANON = os.environ.get('AF_SUPABASE_ANON', '')  # public anon key shipped inside the AgentFoundry desktop app

def sess():
    s = json.load(open(SESS))
    if int(s.get('expires_at', 0)) - time.time() < 300:
        r = urllib.request.Request(SB + '/auth/v1/token?grant_type=refresh_token', method='POST',
            data=json.dumps({'refresh_token': s['refresh_token']}).encode(),
            headers={'apikey': ANON, 'content-type': 'application/json'})
        n = json.load(urllib.request.urlopen(r, timeout=30))
        s.update(access_token=n['access_token'], refresh_token=n['refresh_token'], expires_at=str(n['expires_at']))
        json.dump(s, open(SESS, 'w'))
    return s['access_token']

def call(path, body=None):
    r = urllib.request.Request(BASE + path, method='POST' if body is not None else 'GET',
        data=json.dumps(body).encode() if body is not None else None,
        headers={'authorization': 'Bearer ' + sess(), 'content-type': 'application/json', 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) AgentFoundry/0.1.80 Chrome/130.0.0.0 Electron/33.0.0 Safari/537.36'})
    try:
        return urllib.request.urlopen(r, timeout=300)
    except urllib.error.HTTPError as e:
        print('HTTP', e.code, e.read()[:800].decode(errors='replace')); sys.exit(1)

def chat(prompt, system=None, provider=None):
    body = {'messages': [{'role': 'user', 'content': prompt}]}
    if system: body['system'] = system
    if provider: body['provider'] = provider
    resp = call('/chat', body)
    text, events, buf = [], {}, ''
    for raw in resp:
        buf += raw.decode('utf-8', 'replace')
        while '\n\n' in buf:
            frame, buf = buf.split('\n\n', 1)
            ev, dat = None, ''
            for ln in frame.split('\n'):
                if ln.startswith('event:'): ev = ln[6:].strip()
                elif ln.startswith('data:'): dat = ln[5:].strip()
            if not dat: continue
            try: obj = json.loads(dat)
            except Exception: continue
            if ev == 'chunk' and isinstance(obj.get('delta'), str): text.append(obj['delta'])
            elif ev: events[ev] = obj
    out = ''.join(text)
    with open('af_runs.jsonl', 'a') as f:
        f.write(json.dumps({'ts': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'prompt': prompt,
                            'routing': events.get('routing'), 'done': events.get('done'), 'reply': out}) + '\n')
    return out, events

if __name__ == '__main__':
    if sys.argv[1] == 'usage':
        print(call('/usage').read().decode())
    else:
        out, ev = chat(open(sys.argv[2]).read(), provider=os.environ.get('AF_PROVIDER'))
        print(json.dumps({k: v for k, v in ev.items()}, default=str)[:600], file=sys.stderr)
        if len(sys.argv) > 3: open(sys.argv[3], 'w').write(out)
        else: print(out)
