# P-014: React Controlled Inputs Block Browser Automation

**Status:** ✅ CLOSED (Workaround Found)
**Reported:** 2026-02-05
**Resolved:** 2026-02-06
**Reporter:** Mac + Vultr
**Resolver:** Pilot (Mac)
**Priority:** 4 (Medium) — Impact: Medium (2) × Likelihood: Certain (2) = 4
**Hit count:** 1 (X settings username change)

## Description

React controlled input components on X (Twitter) settings page reject all forms of synthetic input — Playwright type, fill, JS nativeInputValueSetter, clipboard paste events, and individual key presses. React re-renders with old state, discarding external mutations.

This blocks any browser automation that needs to modify React-controlled form fields on third-party sites.

## Business Impact

- Can't change Twitter handle via automation (blocked @VoderAI change)
- Any future task requiring form input on React apps may hit the same issue
- Reduces value of browser automation for account management

## Root Cause

React controlled components maintain state internally. External DOM mutations are overwritten on next render cycle. The Playwright/CDP layer operates at the DOM level, not the React fiber level.

## Solution

**`document.execCommand('insertText')` persists through React re-renders.**

Unlike standard Playwright type/fill, execCommand fires at a level that React's reconciliation doesn't intercept. The text insertion is registered by React's event handlers and updates internal state.

```javascript
// Focus the input first
element.focus();
// Clear existing content
element.select();
// Insert new text — this survives React re-renders
document.execCommand('insertText', false, 'new text');
```

**Validated:** Successfully used to post 10-tweet bAIs thread on X.

## Previous Workaround (Deprecated)

Ask Tom (or any human) to make the change manually. 30 seconds.

## Lessons Learned

- `execCommand` is deprecated but still functional and useful for React-controlled inputs
- Test browser automation on actual target sites, not simplified test pages
- React's synthetic event system has specific entry points that bypass reconciliation
