# Results Section: Three Mechanisms Taxonomy

## Section 3: A Taxonomy of Numeric Context Mechanisms

We tested 15 model deployments across 4 providers on a judicial sentencing task with controlled anchor conditions (3-month low anchor, 9-month high anchor). Our analysis reveals three distinct mechanisms by which LLMs process numeric context.

### 3.1 Identifying Mechanisms: The No-Anchor Baseline

The critical test for distinguishing mechanisms is the **no-anchor control**: what does the model produce when no prosecutor recommendation is provided?

| Model          | No-Anchor | Low Anchor (3mo) | High Anchor (9mo) | Pattern        |
| -------------- | --------- | ---------------- | ----------------- | -------------- |
| Opus 4.5       | 13.2mo    | 6.0mo            | 8.0mo             | Compression    |
| Llama 3.3      | 14.4mo    | 5.9mo            | 6.0mo             | Compression    |
| GPT-4o (Mac)   | 12.7mo    | 3.1mo            | 9.1mo             | Compliance     |
| MiniMax M2.5   | —         | 3.1mo            | 9.1mo             | Compliance     |
| o3-mini        | —         | 3.3mo            | 9.1mo             | Compliance     |
| GPT-4o (Vultr) | 20.4mo    | 6.0mo            | 11.2mo            | True Anchoring |
| GPT-5.2        | 18.3mo    | 5.9mo            | 10.3mo            | True Anchoring |
| Hermes 405B    | 6.0mo     | 5.3mo            | 4.6mo             | Reversal       |

### 3.2 Mechanism 1: Compression

**Definition:** The presence of ANY numeric anchor compresses responses toward a middle range, regardless of anchor direction.

**Behavioral signature:**

- No-anchor baseline: HIGH (13–24mo)
- Both low AND high anchors: MODERATE (6–8mo)
- Direction: Both anchors shift DOWN from baseline

**Models exhibiting compression:** Opus 4.5, Opus 4.6, Llama 3.3

**Interpretation:** These models appear to treat the prosecutor's recommendation as a signal that "something moderate is expected" rather than as a reference point for adjustment. The specific anchor value matters less than its presence.

**Table: Compression Pattern Evidence**

| Model     | No-Anchor → Low   | No-Anchor → High  | Both Directions |
| --------- | ----------------- | ----------------- | --------------- |
| Opus 4.5  | 13.2 → 6.0 (−7.2) | 13.2 → 8.0 (−5.2) | Both ↓          |
| Llama 3.3 | 14.4 → 5.9 (−8.5) | 14.4 → 6.0 (−8.4) | Both ↓          |

### 3.3 Mechanism 2: Compliance

**Definition:** The model copies the anchor value exactly as if it were an instruction.

**Behavioral signature:**

- Low anchor (3mo) → Response ≈ 3mo
- High anchor (9mo) → Response ≈ 9mo
- Response tracks anchor precisely, not influenced

**Models exhibiting compliance:** MiniMax M2.5, o3-mini, GPT-4o (Mac deployment), Llama 3.3 (partial)

**Interpretation:** These models interpret the prosecutor's recommendation as the "correct answer" rather than as context to consider. This produces what appears to be "perfect anchoring" but is actually instruction-following.

**Table: Compliance Pattern Evidence**

| Model        | Low Anchor | Response | High Anchor | Response | Deviation |
| ------------ | ---------- | -------- | ----------- | -------- | --------- |
| MiniMax      | 3mo        | 3.1mo    | 9mo         | 9.1mo    | <3%       |
| o3-mini      | 3mo        | 3.3mo    | 9mo         | 9.1mo    | <5%       |
| GPT-4o (Mac) | 3mo        | 3.0mo    | 9mo         | 9.0mo    | 0%        |

### 3.4 Mechanism 3: True Anchoring

**Definition:** Responses shift asymmetrically toward the anchor value, consistent with Tversky-Kahneman anchoring-and-adjustment.

**Behavioral signature:**

- Low anchor: Pulls response DOWN from no-anchor baseline
- High anchor: Pulls response UP (or down less) from baseline
- Asymmetric effect: High anchor more influential than low

**Models exhibiting true anchoring:** GPT-4o (Vultr deployment), GPT-5.2, GPT-5.3

**Interpretation:** These models use the anchor as a starting point and adjust insufficiently, consistent with human anchoring bias.

**Table: True Anchoring Pattern Evidence**

| Model          | No-Anchor | Low Shift | High Shift | Asymmetry       |
| -------------- | --------- | --------- | ---------- | --------------- |
| GPT-4o (Vultr) | 20.4mo    | −14.4mo   | −9.2mo     | High pulls less |
| GPT-5.2        | 18.3mo    | −12.4mo   | −8.0mo     | High pulls less |

### 3.5 Mechanism 4: Reversal (Rare)

**Definition:** High anchors produce LOWER responses than low anchors.

**Behavioral signature:**

- Effect direction opposite to anchoring
- May reflect overcorrection or contrarian heuristic

**Models exhibiting reversal:** Hermes 405B

**Note:** This pattern was observed in only one model and may reflect idiosyncratic training rather than a generalizable mechanism.

### 3.6 Summary: Mechanism Distribution

| Mechanism      | Models | % of Deployments |
| -------------- | ------ | ---------------- |
| Compression    | 3      | 20%              |
| Compliance     | 5      | 33%              |
| True Anchoring | 5      | 33%              |
| Reversal       | 1      | 7%               |
| Zero Effect    | 1      | 7%               |

**Key finding:** Only 33% of tested deployments show classical anchoring-and-adjustment. The majority show compression (20%) or compliance (33%)—mechanisms that superficially resemble anchoring but require different interventions.

---

## Section 4: Mechanism-Dependent Debiasing

Given the three-mechanism taxonomy, we can now explain why debiasing interventions show model-specific effects.

### 4.1 SACD Effectiveness by Mechanism

| Mechanism      | SACD Effect      | Explanation                           |
| -------------- | ---------------- | ------------------------------------- |
| True Anchoring | 89–99% reduction | SACD targets the right mechanism      |
| Compliance     | 0% effect        | Nothing to debias—model copies anchor |
| Compression    | +66% severity    | SACD amplifies compression effect     |

### 4.2 Why SACD Fails on Compliance Models

SACD asks the model to "identify and correct for anchoring bias." But compliance models don't show anchoring—they show instruction-following. Asking them to "debias" produces confusion or no change.

### 4.3 Why SACD Backfires on Compression Models

SACD's multi-turn structure appears to amplify the compression effect. When Haiku 4.5 is asked to reflect on potential bias, it shifts FURTHER toward harsh defaults, not toward anchor-independence.

**Table: SACD Effect by Mechanism**

| Model     | Mechanism      | Baseline Effect | SACD Effect   | Change     |
| --------- | -------------- | --------------- | ------------- | ---------- |
| GPT-5.2   | True Anchoring | 4.4mo           | 0.5mo         | −89% ✓     |
| Opus 4.5  | Compression    | 2.0mo           | 0.0mo         | −100% ✓    |
| Haiku 4.5 | Compression    | 2.2mo           | +66% severity | Backfire ✗ |
| MiniMax   | Compliance     | 6.0mo           | 6.0mo         | 0%         |
| o3-mini   | Compliance     | 5.8mo           | 5.8mo         | 0%         |

### 4.4 Practical Implication

**Before applying debiasing:** Test which mechanism your model exhibits using a no-anchor control. If compression or compliance, debiasing may be unnecessary or harmful.
