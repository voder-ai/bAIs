# New Abstract — Random Control Pivot

## Current thesis

"Techniques show practical equivalence across domains"

## New thesis

"Multi-turn structure matters more than debiasing content"

---

## Draft Abstract

Do debiasing techniques for anchoring bias actually debias, or does conversation structure matter more? We evaluate five techniques—Devil's Advocate, SACD, Premortem, Random Control (neutral filler), and Outside View—across 21,139 trials spanning seven vignettes.

**Our surprising finding: Random Control ranks #1 in 4 of 6 domains.** This technique provides no debiasing content—only additional conversation turns with neutral filler (German trees, Bavarian capitals, bread varieties). Yet it outperforms dedicated debiasing techniques by point estimate in most domains. This suggests the field's focus on _what_ to prompt may matter less than _how many turns_ to use.

We also demonstrate that **susceptibility**—the standard metric—conflates consistency with correctness. Devil's Advocate reduces susceptibility while producing responses that are consistently wrong (63.6% of baseline). We propose MAD (Mean Absolute Deviation from unanchored baseline) as a complementary metric that captures per-trial error.

A deep-dive validation on judicial sentencing (14,152 trials, 10 models) confirms substantial model-specific variance: SACD ranges from 48% to 128% of baseline across models. Combined with domain variation, this implies practitioners must validate debiasing per-model AND per-task—and consider whether simple multi-turn structure might suffice.

---

## Draft Introduction Opening

Human debiasing techniques—Devil's Advocate, Premortem, deliberative reasoning—are increasingly applied to LLMs. But do these techniques work because of their _content_, or because they add conversation _turns_?

We designed a control condition to test this: Random Control provides the same multi-turn structure as SACD but replaces debiasing prompts with neutral filler (German trees, Bavarian geography, bread varieties). If debiasing content matters, Random Control should underperform.

**It doesn't.** Random Control ranks #1 in 4 of 6 domains by point estimate, outperforming SACD, Devil's Advocate, and Premortem. This finding challenges the assumption that debiasing requires carefully designed prompts—multi-turn structure alone may be sufficient.

---

## Key Changes

1. Random Control finding is THE headline
2. Framing: "content vs structure" debate
3. Practical implication: maybe simple multi-turn is enough
4. Still keeps susceptibility critique and MAD contribution
