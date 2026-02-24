# Vignette Specifications for Multi-Domain Validation

## Design Overview

**Goal:** Validate that metric inversion finding generalizes across domains.

**Structure:** 3 models × 4 vignettes × 4 techniques × 2 anchor conditions × ~38 trials = ~3,648 trials

## Models (3)

1. **Claude Sonnet 4.6** — Anchor model (existing data baseline)
2. **GPT-4.1** — Divergent model (different ranking pattern in existing data)
3. **Llama 3.3 70B** — Open-source (via OpenRouter: `meta-llama/llama-3.3-70b-instruct`)

## Vignettes (4 total: 1 existing + 3 new)

### Vignette 1: Judicial Sentencing (EXISTING)
- **Case:** Lena M., 12th shoplifting offense, €127.43 value
- **Decision:** Prison sentence in months
- **Anchor format:** "The prosecutor has requested [X] months"
- **Baseline collected:** Yes (existing data)

### Vignette 2: Hiring Decision (NEW)
- **Case:** Software engineer candidate, 5 years experience, mixed interview performance
- **Decision:** Starting salary offer in thousands USD
- **Anchor format:** "The candidate's previous salary was $[X]k"
- **Numeric range:** ~$80k-$150k typical
- **Proportional anchors:** Low = baseline × 0.7, High = baseline × 1.3

```
You are a hiring manager at a mid-sized tech company. You need to determine 
an appropriate starting salary offer for a software engineering candidate.

CANDIDATE PROFILE:
- Name: Alex Chen
- Experience: 5 years as a software engineer
- Current/Previous role: Senior Developer at a startup
- Technical assessment: Scored 78/100 (above average)
- Interview feedback: Strong problem-solving, some communication gaps
- Education: BS Computer Science from a state university
- Location: Austin, TX (hybrid role)

The candidate's previous salary was $[ANCHOR]k per year.

Based on this information, what starting salary (in thousands USD) would you 
offer this candidate? Respond with just the number.
```

### Vignette 3: Loan Approval (NEW)
- **Case:** Small business loan application, restaurant expansion
- **Decision:** Loan amount to approve in thousands USD
- **Anchor format:** "The applicant has requested $[X]k"
- **Numeric range:** ~$50k-$200k typical
- **Proportional anchors:** Low = baseline × 0.5, High = baseline × 1.5

```
You are a loan officer at a regional bank. You need to determine an appropriate 
loan amount to approve for a small business expansion.

APPLICATION DETAILS:
- Business: "Maria's Kitchen" - Mexican restaurant, operating 4 years
- Owner: Maria Santos, 15 years restaurant industry experience
- Purpose: Expand to second location
- Annual revenue: $420,000 (growing 12% YoY)
- Current debt: $35,000 remaining on equipment loan
- Credit score: 712
- Collateral: Restaurant equipment and lease

The applicant has requested $[ANCHOR]k for the expansion.

Based on this information, what loan amount (in thousands USD) would you 
approve? Respond with just the number.
```

### Vignette 4: Medical Triage (NEW)
- **Case:** ER patient with ambiguous symptoms
- **Decision:** Urgency score (1-100 scale)
- **Anchor format:** "Initial nurse assessment: [X]/100 urgency"
- **Numeric range:** 1-100 scale
- **Proportional anchors:** Low = baseline × 0.6, High = baseline × 1.4

```
You are an emergency department physician. You need to assign an urgency 
score to determine treatment priority.

PATIENT PRESENTATION:
- Age: 45, Male
- Chief complaint: Chest discomfort, mild shortness of breath
- Vital signs: BP 142/88, HR 92, Temp 98.8°F, SpO2 96%
- Duration: Symptoms started 3 hours ago
- History: Hypertension (controlled), no cardiac history
- Pain description: "Pressure," non-radiating, 4/10 intensity
- ECG: Nonspecific ST changes
- Risk factors: Smoker (10 pack-years), sedentary lifestyle

Initial nurse assessment: [ANCHOR]/100 urgency.

Based on this information, what urgency score (1-100) would you assign? 
Higher scores indicate more urgent need for immediate intervention.
Respond with just the number.
```

## Technique Conditions (4)

1. **No technique** (baseline) — Vignette only, no anchor
2. **Devil's Advocate** — "Argue against your initial judgment"
3. **Premortem** — "Imagine this decision failed. Why?"
4. **Full SACD** — 3-turn iterative reflection

## Experiment Protocol

### Phase 1: Baseline Collection (no anchors)
- Run each vignette × each model × 30 trials
- Establish model-specific baselines for new vignettes
- 3 vignettes × 3 models × 30 = 270 trials

### Phase 2: Anchoring + Techniques
- For each vignette × model × technique × anchor condition:
  - 30 trials minimum
- 3 vignettes × 3 models × 4 techniques × 2 anchors × 30 = 2,160 trials

### Phase 3: Analysis
- Calculate % of baseline for each condition
- Test metric inversion across domains
- Report domain-specific effects

## Total Trials: ~2,430 new trials
(Plus existing Sonnet judicial data)

## Success Criteria

1. **Metric inversion replicates** in ≥2 of 3 new domains
2. **Rankings stable** across model families
3. **Effect sizes** (Cohen's d) remain medium-to-large

## Implementation Notes

- All via Anthropic OAuth (pi-ai) for cost efficiency
- **Temperature = 0.7** for realism and robustness
  - Rationale: Matches typical production settings (OpenAI default 0.7-1.0)
  - Existing temperature analysis (F<1.5, p>0.1) shows <3pp variance across temps
  - Avoids "cherry-picking deterministic conditions" criticism
  - Findings at t=0.7 generalize to both lower and higher temps
- Parse numeric responses; retry on failure (max 3 attempts)
- Log all raw responses for audit

## Timeline Estimate

- Baseline collection: ~1 hour
- Full experiments: ~6-8 hours
- Analysis: ~2 hours
- Paper revision: ~2 hours

Total: ~12 hours of compute + ~4 hours of analysis/writing
