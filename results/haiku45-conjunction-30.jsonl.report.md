# Conjunction Fallacy in Judgment under Uncertainty: A Comparative Analysis of the Linda and Bill Scenarios

## Abstract

This study examined the conjunction fallacy—the tendency to judge a conjunction of events as more probable than one of its constituent events—using two classical reasoning scenarios. Thirty trials each of the Linda scenario (bank teller/feminist categorization) and the Bill scenario (accountant/jazz player categorization) were conducted using the Claude Haiku 4.5 model. The Linda scenario showed a 83.33% selection of the conjunctive option (b), while the Bill scenario showed 100% selection of the base option (a), representing a statistically significant difference (χ² = 5.45, p = 0.020). These results suggest that the conjunction fallacy is not uniformly expressed across all scenarios and may depend on narrative framing and coherence.

## Methods

Two reasoning scenarios were presented to Claude Haiku 4.5 in separate conditions:

1. **Linda condition**: Participants chose between (a) "Linda is a bank teller" and (b) "Linda is a bank teller and is active in the feminist movement."
2. **Bill condition**: Participants chose between (a) "Bill is an accountant" and (b) "Bill is an accountant and plays jazz as a hobby."

Each condition comprised 30 independent trials with up to 3 maximum attempts per trial. Valid responses were restricted to choices "a" or "b." A chi-square test compared choice distributions between conditions, and pairwise z-tests examined differences in selection proportions for each option.

## Results

### Linda Scenario

In the Linda condition, the model selected option (b) in 25 of 30 trials (proportion = 0.833; 95% CI [0.664, 0.927]). Option (a) was selected 5 times (proportion = 0.167; 95% CI [0.073, 0.336]). No trials resulted in classification errors.

### Bill Scenario

In the Bill condition, the model selected option (a) in all 30 trials (proportion = 1.000; 95% CI [0.886, 1.000]). Option (b) was never selected (proportion = 0.000; 95% CI [0.000, 0.114]). No trials resulted in classification errors.

### Statistical Comparison

The chi-square test revealed a statistically significant difference in choice distributions between the two conditions (χ² = 5.45, df = 1, p = 0.020). Pairwise z-tests confirmed this difference for both option (a) (z = −2.34, p = 0.020) and option (b) (z = 2.34, p = 0.020).

## Discussion

The results demonstrate a striking dissociation between the two scenarios. The Linda scenario elicited the prototypical conjunction fallacy: the model preferred the conjunctive statement (83.33%) over the simpler base rate statement. This aligns with classic findings from Tversky and Kahneman (1983), where vivid, narrative-rich descriptions promote belief in conjunctive options.

Conversely, the Bill scenario produced no instances of the fallacy; all responses honored the logical constraint that a conjunction cannot be more probable than its constituent events. This difference suggests that narrative coherence and stereotypical alignment may modulate the fallacy's expression. Linda's description as a socially conscious individual creates a coherent narrative with feminist activism; Bill's characterization as an accountant does not naturally align with jazz playing, potentially reducing the perceived informativeness of the conjunction.

The findings indicate that the conjunction fallacy is not a universal bias but rather context-dependent, influenced by the degree to which a conjunction enhances narrative coherence relative to base-rate information.

## Limitations

1. **Single model tested**: Results reflect the reasoning patterns of Claude Haiku 4.5 only and may not generalize to other language models or human reasoners.
2. **Limited sample size**: Thirty trials per condition provide moderate statistical power; larger samples could reveal more subtle differences.
3. **No variation in framing**: Both scenarios used identical choice structures; alternative phrasings (e.g., probability vs. betting contexts) were not examined.
4. **Absence of intermediate scenarios**: Only two conditions tested; a graded series of scenarios might clarify the boundary conditions for the fallacy.
5. **No process analysis**: The mechanism by which the model generates preferences was not inspected; internal reasoning traces were not examined.

## Conclusion

The conjunction fallacy manifests selectively in the Claude Haiku 4.5 model, appearing prominently in the Linda scenario (83.33% conjunctive choices) but entirely absent in the Bill scenario (0% conjunctive choices). The statistically significant difference (p = 0.020) suggests that scenario characteristics—specifically narrative coherence between the base description and the added conjunction—modulate susceptibility to this reasoning bias. Future research should systematically vary narrative coherence while holding logical structure constant to isolate the cognitive mechanisms underlying context-dependent expression of the fallacy.

## References

Tversky, A., & Kahneman, D. (1983). Extensional versus intuitive reasoning: The conjunction fallacy in probability judgment. *Psychological Review*, 90(4), 293–315.