# Problem 002: Audio Transcription Unavailable

**Status:** Closed (2026-02-05)
**Resolution:** Installed ffmpeg + faster-whisper (tiny model, CPU, int8) on Vultr. Transcription working.
**Reported:** 2026-02-05
**Reporter:** Tom / Mac-Voder / Vultr-Voder
**Priority:** 3 (Low) — Impact: Medium (2) × Likelihood: Low (1) = 2 → Low

## Description

Neither Voder instance can transcribe audio messages (voice notes sent via Discord).

- **Mac:** No whisper or transcription tool installed
- **Vultr:** No ffmpeg or whisper installed

## Business Impact

- Cannot understand voice messages from Tom
- Forces Tom to retype voice messages
- Low priority per Tom's instruction (bottom of todo list)

## Reproduction

1. Tom sends audio message via Discord (.ogg opus format)
2. Both instances receive the file but cannot transcribe it
3. `which whisper` / `which ffmpeg` return not found

## Workaround

- Ask Tom to type the message instead
- Acceptable for now given low frequency of voice messages

## Proposed Fix

Install whisper (OpenAI's speech-to-text) on both instances:

**Mac:**
```bash
pip install openai-whisper
brew install ffmpeg
```

**Vultr:**
```bash
pip install openai-whisper
apt install ffmpeg
```

## Related

- Problem 001: Image viewing broken
- Kanban: Added to backlog as low priority
