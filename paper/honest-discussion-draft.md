# Honest Paper Discussion Draft

**Thesis:** Human debiasing techniques don't reliably transfer to LLMs

## New Discussion Structure

### 6.1 Main Finding: Unreliable Transfer

Human anchoring debiasing techniques don't reliably transfer to LLMs. Our 21,139-trial evaluation reveals:

1. **Devil's Advocate fails dramatically.** Despite achieving the best susceptibility score (#1), DA produces the worst baseline proximity (63.6%, vs 72.9% no-technique baseline). The technique makes bias _worse_, not better.

2. **SACD and Premortem help, but with massive variance.** SACD achieves 93.7% of baseline on average, but ranges from 47.8% (Haiku) to 127.8% (Opus)—a 2.7× spread across models. What works for one model may fail catastrophically for another.

3. **Domain dependence.** In our exploratory cross-domain analysis (6 domains, 4 models), no technique consistently dominates. Random Control ranks #1 in 4 domains by point estimate (though all pairwise CIs overlap).

### 6.2 Why Susceptibility Misleads (Supporting Evidence)

The Devil's Advocate paradox—best susceptibility, worst accuracy—reveals why standard metrics can mislead. Susceptibility measures the spread between high and low anchor conditions. DA reduces this spread by compressing responses toward a central value (~14 months). But that central value is far from the unanchored baseline (29 months). The technique produces _consistent_ wrong answers.

This explains why practitioners using susceptibility alone might recommend DA—it "looks good" by the standard metric while actually worsening judgment.

### 6.3 Why SACD Works (When It Does)

SACD's iterative self-reflection appears to help models escape anchor influence—but only for some architectures. Possible mechanisms:

- Explicit bias acknowledgment forces reconsideration
- Multiple revision opportunities allow course correction
- Turn structure provides "thinking time"

However, SACD can backfire entirely (Haiku's 47.8%) or overshoot (Opus's 127.8%), suggesting model-specific interactions we don't yet understand.

### 6.4 Model Variance Is the Story

The 2.7× variance in SACD effectiveness (48%-128%) may be the most practically important finding. Recommendations:

- Test per-model before deployment
- Don't assume techniques transfer across model families
- Collect unanchored baselines to validate effectiveness

### 6.5 6-Turn Ablation: Content vs. Structure

[Keep existing 6-turn RC content—it supports the "techniques don't reliably transfer" thesis by showing model-specific responses to implicit vs explicit debiasing]

### 6.6 Limitations

[Keep existing, but reframe around the transfer thesis]

### 6.7 Practical Recommendations

1. **Don't assume transfer.** Human debiasing techniques may fail or backfire on LLMs.
2. **Test per-model.** SACD ranges 48%-128% across models.
3. **Collect baselines.** Susceptibility alone missed DA's failure.
4. **Report both metrics.** Susceptibility + baseline proximity catch different failure modes.
5. **Consider cost.** Premortem matches SACD effectiveness in 1 turn vs 6.

---

## New Conclusion

Human debiasing techniques don't reliably transfer to LLMs. Devil's Advocate—effective for humans—fails dramatically for LLMs, producing worse bias despite appearing to reduce susceptibility. SACD and Premortem improve average accuracy but with 2.7× model variance.

**For practitioners:** Test per-model, per-domain. Don't assume techniques that work for humans will work for LLMs.

**For researchers:** Report baseline proximity alongside susceptibility. Standard metrics can recommend techniques that make bias worse.
