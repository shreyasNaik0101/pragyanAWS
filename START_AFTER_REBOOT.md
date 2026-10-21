# Post-reboot startup runbook

After your Mac reboots, open **Terminal** (not inside Windsurf — save RAM for the services) and run these commands in order. Each starts in the background.

## 0. Before you start: quit heavy apps
- Don't open Brave with 20+ tabs.
- Don't open Windsurf until services are up.

## 1. Start backend (port 8000)

```bash
cd /Users/coder.op/Gyan_Pragyan/backend
source ../.venv-arch/bin/activate
nohup uvicorn app.main:app --host 0.0.0.0 --port 8000 > backend.log 2>&1 &
```

Wait ~10 s, then verify:
```bash
curl -sS http://localhost:8000/health
# {"status":"healthy","version":"1.0.0","environment":"development"}
```

## 2. Start Remotion service (port 3005)

```bash
cd /Users/coder.op/Gyan_Pragyan/remotion-service
nohup npx tsx src/server.ts > remotion.log 2>&1 &
```

Wait ~20 s (cold bundle), then verify:
```bash
curl -sS http://localhost:3005/health
# {"status":"healthy","service":"remotion-service","jobs":0}
```

## 3. Start WhatsApp bot (port 3003)

```bash
# Clear any stale Chromium session locks first
find /Users/coder.op/Gyan_Pragyan/whatsapp-bot/.wwebjs_auth -name "Singleton*" -delete 2>/dev/null

cd /Users/coder.op/Gyan_Pragyan/whatsapp-bot
nohup node dist/index.js > bot.log 2>&1 &
```

Wait ~30 s (WhatsApp Web needs time), then verify:
```bash
curl -sS http://localhost:3003/status
# {"connection":"ready","authenticated":true,...}
```

If `authenticated` is false, your WhatsApp session expired — check `bot.log` for a QR code link.

## 4. Verify all three

```bash
echo -n "backend:  "; curl -sS http://localhost:8000/health; echo
echo -n "remotion: "; curl -sS http://localhost:3005/health; echo
echo -n "wa-bot:   "; curl -sS http://localhost:3003/status | head -c 100; echo
```

All three should respond within ~1 s.

## 5. Test cached videos are still there

Send via WhatsApp: `video photosynthesis`
You should get a video within 1-3 seconds (cache hit).

If you get "starting video generation... 3 minutes", the cache is cold — send the same topic once, let it render, and it'll be cached thereafter.

## Cached demo topics (all 5 should be instant)

- `video photosynthesis`
- `video newton's first law`
- `video binary search`
- `video Shivaji Maharaj timeline`
- `video what is machine learning`

## Troubleshooting

**Bot fails to initialize, log shows "Runtime.callFunctionOn timed out":**
Memory pressure during Chromium boot. Close heavy apps and restart the bot (step 3).

**Remotion fails with "EADDRINUSE":**
Leftover process from a previous run. Kill it: `lsof -ti:3005 | xargs kill -9` and retry step 2.

**Backend fails to import:**
Wrong venv. Make sure `source ../.venv-arch/bin/activate` worked (prompt should show `(.venv-arch)`).

## Video config summary (already applied)

- **Video length:** 1.5 min (90-110 s)
- **Segments:** 5, each 18-22 s
- **Render time:** ~3 min per video
- **Cache key:** `v9` (old short videos auto-invalidated)
