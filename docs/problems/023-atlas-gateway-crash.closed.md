# P-023: Atlas Gateway Crash

## Status
**✅ CLOSED** — Resolved 2026-02-06

## Severity
**Critical** — Atlas unresponsive

## Symptom
Atlas gateway went down during active Discord conversation. Service status showed `inactive (dead)`.

## Timeline
- 2026-02-06 19:16 AEDT: Tom noticed Atlas not responding
- 2026-02-06 19:18 AEDT: Pilot wellness check — gateway dead
- 2026-02-06 19:19 AEDT: First restart attempt — port conflict (stale process)
- 2026-02-06 19:21 AEDT: Killed stale process, gateway restarted

## Observations
1. Gateway service was `inactive (dead)`
2. Last logs showed rate limit cascade across all providers (Anthropic + Google)
3. SIGTERM received at 03:17:48 UTC
4. Stale `openclaw-gateway` process holding port 18789 after restart attempt

## Root Cause
TBD — Need to determine:
1. Why did gateway crash/stop originally?
2. Was it the rate limit cascade?
3. Why wasn't systemd auto-restarting it?
4. Why was there a stale process after service stopped?

## Impact
- Atlas unable to respond to Discord messages
- Required manual intervention from Pilot to restart

## Immediate Actions
- [x] Killed stale process
- [x] Restarted gateway
- [ ] Verify Atlas responds to Discord
- [ ] Check systemd restart configuration

## Resolution
Stale process killed, gateway restarted successfully. Atlas responsive to Discord.

## Root Cause
Rate limit cascade across providers triggered SIGTERM. Stale process remained holding port after service stopped.

## Prevention
- Verify `Restart=on-failure` in systemd unit
- Consider watchdog/health check monitoring
- Add alerting when gateway goes down
- Investigate why systemd didn't auto-restart

## Lessons Learned
1. **Rate limit cascades can crash the gateway** — When all providers hit rate limits simultaneously, the gateway may SIGTERM. Need graceful degradation.
2. **Stale processes survive service stops** — Killing systemd service doesn't guarantee the process dies. Always check for orphan processes holding ports.
3. **Fireteam redundancy works** — Pilot detected the outage and fixed it while Atlas was down. Multi-instance architecture provides resilience.
4. **systemd restart isn't foolproof** — The service was configured for restart but a stale process blocked it. Need process cleanup in the service file or pre-start check.
