# Conjunction Fallacy in AI Language Models: A Comparative Analysis of Scenario Types

## Abstract

We investigated the conjunction fallacy in the Claude Sonnet 4 language model using two classic scenarios: Linda (bank teller/feminist) and Bill (accountant/jazz player). Across 30 trials per condition, we examined choice patterns between logically correct single-category options versus conjunction options. The Linda scenario showed complete adherence to the conjunction fallacy (100% conjunction choices), while the Bill scenario demonstrated reduced but still substantial fallacy occurrence (86.7% conjunction choices). Statistical analysis revealed a significant difference between scenarios (p = 0.038).

## Methods

We conducted a controlled experiment using the Claude Sonnet 4 model with 30 runs per experimental condition. Two classic conjunction fallacy scenarios were tested: the Linda scenario (bank teller vs. feminist bank teller) and the Bill scenario (accountant vs. accountant who plays jazz). Each trial presented binary choice options (a or b) with a maximum of 3 attempts per trial. Choice proportions and 95% confidence intervals were calculated using the Wilson score method.

## Results

In the Linda scenario, all 30 trials (100%) resulted in choice "a" (conjunction option), with 95% CI [0.886, 1.000]. The Bill scenario showed 26 of 30 trials (86.7%) selecting choice "a" (conjunction option), with 95% CI [0.703, 0.947]. Choice "b" (logically correct single-category option) was selected in 0% of Linda trials and 13.3% of Bill trials, 95% CI [0.053, 0.297].

A chi-square test revealed a statistically significant difference between conditions (χ² = 4.286, df = 1, p = 0.038). Pairwise comparison confirmed this difference for both choice options (z = 2.070, p = 0.038).

## Discussion

Both scenarios demonstrated the conjunction fallacy, but with notable differences in magnitude. The Linda scenario produced universal conjunction selection, suggesting this particular framing may be especially susceptible to representativeness heuristic processing in large language models. The Bill scenario, while still showing substantial conjunction fallacy occurrence, allowed for some logically correct responses, indicating potential variation in scenario effectiveness for eliciting the bias.

## Limitations

The study was limited to a single language model (Claude Sonnet 4) and two specific conjunction fallacy scenarios. Error rates were not computed in the analysis. The sample size of 30 trials per condition, while adequate for statistical comparison, may limit generalizability. No control conditions without conjunction elements were included for baseline comparison.

## Conclusion

The Claude Sonnet 4 model demonstrates clear susceptibility to the conjunction fallacy across different scenario types, with scenario-specific variations in effect magnitude. The Linda scenario appears particularly effective at eliciting the bias, while the Bill scenario shows some resistance. These findings contribute to understanding cognitive bias manifestation in large language models and suggest that bias susceptibility may vary based on specific contextual factors.

## References

Analysis conducted using the bais package (version 0.0.0) on Node.js v22.22.0. Experiment ID: conjunction-fallacy. Generated: 2026-02-09T20:11:14.707Z.