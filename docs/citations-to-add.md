# Citations to Add (Post-Review 13 Accept)

These papers were identified after the paper passed LLM review. Queue for next revision.

## Related Work

### Arcuschin et al. 2026 — "Biases in the Blind Spot"

- **arXiv:** 2602.10117
- **Domain:** Categorical decisions (hiring, loans, admissions)
- **Key finding:** "Unverbalized biases" — models make biased decisions while CoT doesn't mention biasing factors
- **Relevance to bAIs:** Same pattern, different domain. We show anchoring affects numerical estimates without appearing in reasoning. They show discrimination affects categorical decisions without appearing in reasoning.
- **Suggested sentence:** "Concurrent work by Arcuschin et al. (2026) demonstrates analogous 'unverbalized biases' in categorical decision tasks, where models exhibit discrimination without citing biasing factors in their reasoning traces."
- **Location:** Related Work section

---

## Discussion (Track for Future Work)

### Wang et al. 2026 — "The Devil Behind Moltbook"

- **arXiv:** 2602.09877
- **Key finding:** Self-Evolution Trilemma — impossible to have continuous self-evolution + complete isolation + safety invariance
- **Relevance to bAIs:** External debiasing interventions as "neg-entropy injections" that can help or harm depending on system state. Our finding that SACD destabilizes low-bias models may be related.
- **Status:** Track, don't cite yet — connection is speculative

### Native Reasoning Training (ICLR 2026)

- **arXiv:** 2602.11549
- **Key idea:** Treat reasoning as latent variable, let models generate own traces without human demonstrations
- **Relevance to bAIs:** External debiasing vs native reasoning — bolted-on prompts may work against rather than with learned reasoning processes
- **Status:** Track, don't cite yet — speculative connection
