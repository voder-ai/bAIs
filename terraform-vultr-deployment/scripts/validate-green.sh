#!/bin/bash
set -euo pipefail

# --- Green Instance Validation Script ---
# Run this on the Green instance to verify it's ready for production cutover.
# Usage: ./validate-green.sh [--verbose]

VERBOSE=false
[[ "${1:-}" == "--verbose" ]] && VERBOSE=true

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
WARNINGS=0

log() { echo -e "$*"; }
pass() { log "${GREEN}✓${NC} $*"; PASSED=$((PASSED+1)); }
fail() { log "${RED}✗${NC} $*"; FAILED=$((FAILED+1)); }
warn() { log "${YELLOW}⚠${NC} $*"; WARNINGS=$((WARNINGS+1)); }
info() { [[ "$VERBOSE" == true ]] && log "  → $*" || true; }

log "=== Green Instance Validation ==="
log "Hostname: $(hostname)"
log "Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
log ""

# --- 1. Gateway Process ---
log "Checking gateway process..."
if pgrep -f "openclaw-gateway" > /dev/null; then
    PID=$(pgrep -f "openclaw-gateway" | head -1)
    pass "Gateway process running (PID: $PID)"
else
    fail "Gateway process not found"
fi

# --- 2. Gateway HTTP Response ---
log "Checking gateway HTTP response..."
TS_IP=$(tailscale ip -4 2>/dev/null || echo "127.0.0.1")
HTTP_CODE=$(curl -sk -o /dev/null -w "%{http_code}" "https://${TS_IP}:18789/" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
    pass "Gateway responding HTTP 200 on $TS_IP:18789"
else
    fail "Gateway not responding (HTTP $HTTP_CODE)"
fi

# --- 3. Tailscale Connected ---
log "Checking Tailscale..."
TS_STATUS=$(tailscale status --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('BackendState','unknown'))" 2>/dev/null || echo "unknown")
if [[ "$TS_STATUS" == "Running" ]]; then
    pass "Tailscale running ($TS_IP)"
    # Check if Atlas is reachable
    ATLAS_IP="100.89.107.119"
    if curl -sk -o /dev/null --connect-timeout 3 "https://${ATLAS_IP}:18789/" 2>/dev/null; then
        pass "Atlas reachable via Tailscale ($ATLAS_IP)"
    else
        warn "Atlas not reachable at $ATLAS_IP (may be expected if offline)"
    fi
else
    fail "Tailscale not running (state: $TS_STATUS)"
fi

# --- 4. Workspace Files ---
log "Checking workspace files..."
WORKSPACE="/mnt/openclaw-data/workspace"
if [[ -d "$WORKSPACE" ]]; then
    pass "Workspace directory exists"
    for file in SOUL.md MEMORY.md AGENTS.md OODA.md; do
        if [[ -f "$WORKSPACE/$file" ]]; then
            info "$file present"
        else
            warn "$file missing from workspace"
        fi
    done
    # Check SOUL.md specifically (critical)
    if [[ -f "$WORKSPACE/SOUL.md" ]]; then
        pass "SOUL.md present (identity preserved)"
    else
        fail "SOUL.md missing (identity NOT preserved)"
    fi
else
    fail "Workspace directory not found at $WORKSPACE"
fi

# --- 5. OpenClaw CLI ---
log "Checking OpenClaw CLI..."
if command -v openclaw &> /dev/null; then
    VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
    pass "OpenClaw CLI available ($VERSION)"
else
    fail "OpenClaw CLI not found"
fi

# --- 6. Block Storage ---
log "Checking block storage..."
if mountpoint -q /mnt/openclaw-data 2>/dev/null; then
    DISK_USAGE=$(df -h /mnt/openclaw-data | tail -1 | awk '{print $5}')
    pass "Block storage mounted (/mnt/openclaw-data, $DISK_USAGE used)"
else
    warn "Block storage not mounted at /mnt/openclaw-data (may be using local disk)"
fi

# --- 7. Discord Bot (if configured) ---
log "Checking Discord integration..."
DISCORD_CONFIG=$(grep -r "discord" ~/.openclaw/*.yaml 2>/dev/null | head -1 || echo "")
if [[ -n "$DISCORD_CONFIG" ]]; then
    info "Discord config found"
    # Check if bot is connected (would need to query OpenClaw sessions)
    pass "Discord configured"
else
    info "No Discord config found (may be expected)"
fi

# --- Summary ---
log ""
log "=== Validation Summary ==="
log "${GREEN}Passed: $PASSED${NC}"
log "${RED}Failed: $FAILED${NC}"
log "${YELLOW}Warnings: $WARNINGS${NC}"

if [[ $FAILED -eq 0 ]]; then
    log ""
    log "${GREEN}✓ Green instance validated and ready for cutover.${NC}"
    exit 0
else
    log ""
    log "${RED}✗ Validation failed. Fix issues before cutover.${NC}"
    exit 1
fi
