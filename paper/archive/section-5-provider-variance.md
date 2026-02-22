# Section 5: Deployment-Specific Variance

## 5.1 The Provider Variance Finding

Our most striking finding emerged from running identical experiments from two different network locations. When accessing GPT-4o through OpenRouter:

| Access Path           | Low Anchor (3mo) | High Anchor (9mo) | Effect | Pattern        |
| --------------------- | ---------------- | ----------------- | ------ | -------------- |
| Residential IP (Mac)  | 3.1mo            | 9.1mo             | 6.0mo  | Compliance     |
| Datacenter IP (Vultr) | 4.4mo            | 9.4mo             | 5.0mo  | True Anchoring |

**Same model. Same API. Same prompts. Different mechanisms.**

The Mac deployment (residential IP) exhibited near-perfect compliance—the model copied the anchor value exactly in 96% of trials. The Vultr deployment (datacenter IP) showed the classic anchoring pattern with genuine variance and partial anchor influence.

## 5.2 Implications

### 5.2.1 Model Routing

OpenRouter and similar aggregators may route requests to different backend deployments based on:

- Source IP characteristics (residential vs datacenter)
- Geographic location
- Rate limit tiers
- Load balancing

This means "GPT-4o" is not a single model but a family of deployments with potentially different behaviors.

### 5.2.2 Benchmark Non-Transferability

Published benchmarks showing "GPT-4o anchoring bias = X" may not apply to your deployment. Organizations must validate on their actual access path.

### 5.2.3 Mechanism as Deployment Property

The mechanism (compression, compliance, true anchoring) is not purely a property of the model architecture but of the specific deployment. The same weights may behave differently depending on:

- Inference infrastructure
- System prompt injections
- Safety layer configurations
- Quantization or optimization choices

## 5.3 Evidence for Non-Model Factors

To rule out temporal effects (model updates during our study), we ran sequential tests:

1. Mac test at T₀: Compliance pattern
2. Vultr test at T₀ + 2h: Anchoring pattern
3. Mac test at T₀ + 4h: Compliance pattern (unchanged)

The patterns were stable and reproducible, ruling out model drift as an explanation.

## 5.4 Practical Recommendations

**For researchers:**

- Report access method, provider, and source infrastructure
- Do not assume results transfer across providers
- Consider deployment variance a confounding variable

**For practitioners:**

- Validate on your actual deployment path
- Monitor for mechanism changes after provider updates
- Consider mechanism identification part of deployment testing

**For providers:**

- Document routing behavior that may affect model consistency
- Consider offering "pinned" deployments for reproducibility
- Flag when backend changes may affect behavior

## 5.5 Debiasing Implications

The provider variance finding has direct implications for debiasing:

| Deployment           | Mechanism      | SACD Effect | Recommendation     |
| -------------------- | -------------- | ----------- | ------------------ |
| GPT-4o (Residential) | Compliance     | 0%          | Prompt engineering |
| GPT-4o (Datacenter)  | True Anchoring | 27%         | SACD applicable    |

A debiasing strategy that works on one deployment may fail entirely on another—not because the technique is wrong, but because the underlying mechanism differs.

---

## Key Points for Paper

1. **Same API ≠ same model behavior** — Providers route to different backends
2. **Mechanism varies by deployment** — Not just by model architecture
3. **Benchmarks may not transfer** — Must validate on actual access path
4. **27pp swing on identical calls** — Concrete evidence of deployment variance
5. **Debiasing must match deployment** — Not just model
