# Figure 2: Model Response Taxonomy to SACD Intervention

**Draft Caption:**

Figure 2. Decision tree characterizing model responses to anchoring bias and SACD debiasing intervention. Models first diverge based on whether they exhibit standard anchoring susceptibility (following prosecutor's recommendation). Models lacking this susceptibility (e.g., Hermes 405B) produce fixed defaults regardless of anchor value. Among susceptible models, a second branching identifies whether an amplification layer exists that magnifies bias under structured prompting (e.g., Haiku 4.5). For models without amplification, SACD effectiveness depends on the model's susceptibility to correction: standard architectures (GPT-5.2, Opus 4.5) show 89-99% bias reduction, while alternative architectures exhibit either Compliance (copying anchors verbatim; MiniMax, o3-mini) or Rationalization (reasoning that justifies biased output; o1). This taxonomy explains why identical debiasing prompts produce dramatically different outcomes across model families.

---

**Failure Mode Summary Table:**

| Pattern             | Example Models    | Mechanism                       | SACD Effectiveness |
| ------------------- | ----------------- | ------------------------------- | ------------------ |
| Fixed Default       | Hermes 405B       | No anchoring mechanism          | N/A (0mo baseline) |
| Full Susceptibility | GPT-5.2, Opus 4.5 | Standard anchoring + correction | 89-99% reduction   |
| Amplification       | Haiku 4.5         | Two-layer: base + amplification | Partial (~40%?)    |
| Compliance          | MiniMax, o3-mini  | Copies anchor directly          | 0%                 |
| Rationalization     | o1                | Reasons + stays biased          | +7% (worse)        |

---

**Key Insight:** SACD targets a specific anchoring mechanism. Models that lack this mechanism (Hermes), bypass it (Compliance), or reason around it (Rationalization) are immune to SACD intervention. The same prompt produces five distinct failure modes depending on model architecture.
