# Reframed Introduction Draft

## Section 1: Introduction

### Opening (Hook)

Large language models are increasingly deployed in high-stakes decision-making contexts—from legal document analysis to medical diagnosis support. A growing body of work has investigated whether these models exhibit the same cognitive biases as humans, particularly anchoring bias: the tendency to insufficiently adjust estimates away from an initial reference point (Tversky & Kahneman, 1974).

Prior studies have generally concluded that LLMs do exhibit anchoring-like behavior (citations). However, attempts to mitigate this bias through prompting interventions have produced inconsistent results, with the same technique achieving strong reductions on some models while failing entirely on others. This inconsistency has been attributed to model-specific factors without deeper investigation.

### Gap

We propose that this inconsistency reflects a more fundamental issue: **what researchers have been measuring as "anchoring bias" may actually be multiple distinct phenomena**. Just as a patient presenting with fever could have any of several underlying conditions requiring different treatments, an LLM that shifts its numeric outputs in response to reference values could be doing so for different mechanistic reasons—each requiring different interventions.

### Contribution

Through systematic experimentation across 10 model deployments using judicial sentencing scenarios, we identify **three distinct mechanisms** by which LLMs respond to numeric context:

1. **Compression**: The model compresses its outputs toward a central range whenever numeric context is present, regardless of whether that context suggests higher or lower values. This resembles regression to the mean more than anchoring.

2. **Compliance**: The model interprets numeric demands as instructions to follow, producing outputs that match the demanded value exactly. This is instruction-following behavior, not cognitive bias.

3. **True Anchoring**: The model adjusts its outputs asymmetrically toward the reference value—lower anchors produce lower outputs, higher anchors produce higher outputs—resembling the classic human anchoring pattern.

### Significance

This taxonomy has immediate practical implications:

- **Debiasing selection**: SACD (Sycophancy-Aware Calibration for Debiasing) successfully reduces true anchoring (up to 89% reduction) but has zero effect on compliance and may worsen compression. Practitioners must identify which mechanism is active before selecting interventions.

- **Deployment validation**: We document cases where the same model (GPT-4o) exhibits different mechanisms depending on access path (compliance via residential IP, true anchoring via datacenter IP). This mandates per-deployment validation rather than assuming model-level consistency.

- **Theoretical clarity**: The field should distinguish between "models that shift outputs when given numeric context" (broad) and "models that exhibit human-like anchoring bias" (specific). Our taxonomy provides vocabulary for this distinction.

### Paper Structure

Section 2 describes our experimental methodology. Section 3 presents evidence for each mechanism and criteria for identification. Section 4 examines debiasing effectiveness as a function of mechanism type. Section 5 discusses implications for AI safety and deployment practices.

---

## Key Rhetorical Moves

1. **Reframe inconsistency as a clue**: Prior work's inconsistent results aren't a failure—they're evidence of multiple mechanisms.

2. **Medical analogy**: "Fever" vs underlying conditions. Same symptom (numeric shift), different causes (mechanisms).

3. **Compliance is not bias**: Crucial distinction. Following instructions ≠ cognitive bias.

4. **Provider variance as evidence**: Not an anomaly to explain away, but a demonstration that mechanisms vary by deployment.

5. **Practical framing**: Every claim connects to "what should practitioners do?"
