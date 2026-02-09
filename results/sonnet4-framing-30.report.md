# Framing Effects on Decision-Making: A Comparative Analysis of Gain vs. Loss Frames

## Abstract

This study examined how framing effects influence decision-making by comparing responses between gain-framed ("lives saved") and loss-framed ("lives lost") conditions. Using Claude Sonnet 4, we conducted 30 trials per condition to assess choice distributions across four options (A, B, C, D). Results showed a strong framing effect: participants in the gain frame overwhelmingly selected option A (96.7%), while participants in the loss frame were evenly split between options C and D (50% each). Statistical tests revealed significant differences in choice patterns between conditions.

## Methods

The experiment used Anthropic's Claude Sonnet 4 model with 30 runs per condition and a maximum of 3 attempts per trial. Two experimental conditions were tested: a gain frame condition emphasizing "lives saved" and a loss frame condition emphasizing "lives lost." Participants could select from four valid choices (A, B, C, D). Choice proportions were calculated with Wilson score confidence intervals (α = 0.05), and pairwise statistical comparisons were conducted using z-tests.

## Results

All 60 trials (30 per condition) were successfully completed with no errors. In the gain frame condition, option A was selected 29 times (96.7%, 95% CI: 0.83-0.99), option B was selected once (3.3%, 95% CI: 0.01-0.17), and options C and D were never selected (0%, 95% CI: 0-0.11 for both).

In the loss frame condition, choices were distributed differently: options A and B were never selected (0%, 95% CI: 0-0.11 for both), while options C and D were each selected 15 times (50%, 95% CI: 0.33-0.67 for both).

Pairwise statistical comparisons revealed significant differences between conditions for options A (z = 7.49, p < 0.001), C (z = -4.47, p < 0.001), and D (z = -4.47, p < 0.001). The difference for option B was not statistically significant (z = 1.01, p = 0.31). Chi-square test results were not computed.

## Discussion

The results demonstrate a clear framing effect, with decision patterns showing complete separation between conditions. The gain frame strongly favored option A, while the loss frame resulted in equal preference for options C and D, with complete avoidance of options A and B. This pattern suggests that framing significantly influences choice behavior, consistent with prospect theory predictions about risk preferences under different framings.

## Limitations

The study was limited to a single AI model (Claude Sonnet 4) and may not generalize to human decision-making or other AI systems. The specific content of the choice options was not provided in the analysis, limiting interpretation of why particular options were preferred in each frame. Sample size was modest (n=30 per condition), and the chi-square test statistic was not computed, preventing overall assessment of condition differences.

## Conclusion

This experiment provides evidence for robust framing effects in AI decision-making, with gain and loss frames producing distinctly different choice patterns. The complete separation in choice distributions between conditions suggests that framing manipulations can have strong effects on decision outcomes, warranting further investigation of the mechanisms underlying these effects.

## References

Data analysis conducted using the bais package (version 0.0.0) on Node.js v22.22.0. Experiment generated on 2026-02-09T20:13:04.020Z with experiment ID "framing-effect".