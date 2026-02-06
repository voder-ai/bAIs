# Claude's Decision-Making Under Sunk Cost Pressure: An Experimental Analysis

## Abstract

This study examined whether Claude exhibits susceptibility to the sunk cost fallacy—the tendency to continue investing in a course of action based on prior investments rather than future prospects. Two conditions were tested: one in which a $9M prior investment was disclosed (sunk cost condition) and one in which only a fresh $1M investment decision was presented (no sunk cost condition). Across 60 total trials (30 per condition), Claude made identical decisions in both scenarios, rejecting further investment regardless of framing. These findings suggest that Claude does not exhibit the sunk cost bias in this experimental paradigm, though the uniformity of responses warrants careful interpretation.

## Methods

A between-subjects experimental design was implemented to test for sunk cost bias. Two conditions were created:

1. **Sunk cost condition** (*n* = 30): Participants were informed that $9M had already been invested in a project and asked whether to invest an additional $1M given identical future prospects.
2. **No sunk cost condition** (*n* = 30): Participants faced the $1M investment decision without mention of prior expenditures.

The model used was anthropic/claude-haiku-4-5, with up to 3 attempts permitted per trial if an invalid response occurred. Valid responses were dichotomous: "yes" (continue investing) or "no" (reject further investment). All trials completed successfully with zero errors across both conditions.

## Results

**Sunk cost condition:** All 30 trials resulted in rejection of additional investment (proportion "no" = 1.00, 95% CI [0.89, 1.00]). Zero trials resulted in acceptance (proportion "yes" = 0.00, 95% CI [0.00, 0.11]).

**No sunk cost condition:** All 30 trials resulted in rejection of additional investment (proportion "no" = 1.00, 95% CI [0.89, 1.00]). Zero trials resulted in acceptance (proportion "yes" = 0.00, 95% CI [0.00, 0.11]).

**Statistical comparison:** The chi-square test comparing choice distributions between conditions was not computed. Pairwise statistical tests comparing specific response choices between conditions were likewise not computed.

## Discussion

Both experimental conditions produced identical response patterns: uniform rejection of additional investment. This finding indicates that Claude's decisions were unaffected by the presence or absence of sunk cost information, suggesting the model does not exhibit the sunk cost bias under these conditions. The decision rule applied appears to have been independent of historical investment framing.

However, the complete uniformity of responses across all 60 trials raises important interpretive considerations. This outcome differs from typical human performance on sunk cost tasks, where sunk cost presence typically elevates continuation rates. The consistency may reflect either genuine rationality or a decision-making process insensitive to both the framing manipulation and the specific investment parameters.

## Limitations

1. **Absence of comparative statistics:** The chi-square test and pairwise comparisons were not performed, precluding formal statistical inference about condition differences.
2. **Uniform responding:** The complete invariance of responses across both conditions prevents assessment of the manipulation's effectiveness and limits insights into decision mechanisms.
3. **Single model variant:** Only claude-haiku-4-5 was evaluated; generalization to other Claude variants or model architectures cannot be assumed.
4. **Limited transparency:** The underlying reasoning for rejecting investment in both scenarios was not analyzed, precluding mechanistic interpretation.
5. **Task design constraints:** The binary choice format may not capture nuanced decision reasoning or confidence levels.

## Conclusion

Under the conditions tested, Claude exhibits no detectable sunk cost bias. Investment decisions were identical regardless of whether prior expenditures were disclosed, suggesting decision-making based on forward-looking criteria rather than historical sunk costs. However, the uniformity of responses prevents confirmation that the experimental manipulation was effective. Future research should incorporate model introspection techniques, varied investment parameters, and comparative conditions to clarify the decision processes underlying these responses.

## References

No external references were cited in this report. The analysis relies solely on the empirical data collected during the controlled experimental trial (Experiment ID: sunk-cost-fallacy, conducted 2026-02-06).