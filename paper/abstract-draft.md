# Abstract

Human cognitive debiasing techniques are increasingly applied to Large Language Models (LLMs), yet their effectiveness remains poorly understood. We present the first large-scale empirical study of anchoring bias debiasing in LLMs, testing five techniques across 10 models and 14,324 trials.

Our key contributions:

1. **A calibration metric for debiasing evaluation.** We propose calibration (|response - baseline|) as a complementary metric to spread reduction. While spread reduction measures anchor sensitivity, calibration measures distance from ground truth—revealing that techniques with excellent spread reduction can sometimes overcorrect, moving responses further from baseline. Both metrics together provide a more complete picture.

2. **A mechanistic taxonomy of debiasing techniques.** We categorize techniques by how they interact with anchors: *distance* techniques (Random Control, Full SACD) dilute anchor salience through intervening tokens; *doubt* techniques (Premortem) undermine confidence without replacement; *replacement* techniques (Outside View) swap external anchors for internal estimates; *confrontation* techniques (Devil's Advocate) keep anchors salient while arguing against them.

3. **Evidence that structure trumps content.** Random Control—irrelevant elaboration with no debiasing content—achieves 30% calibration improvement, comparable to purpose-built techniques. This suggests prior debiasing studies may overestimate technique-specific effects by failing to control for structural factors (turn count, token distance, reasoning depth).

4. **Demonstration of model-specific heterogeneity.** While Full SACD improves all 10 models tested (39% average), other techniques show dramatic variation: Outside View improves only 3/10 models and worsens calibration by up to 252% on reasoning models (o3). No technique except Full SACD universally succeeds.

Our findings have immediate practical implications: practitioners should prefer distance-creating interventions over replacement prompts, measure calibration rather than spread, and validate techniques on their specific target models.
