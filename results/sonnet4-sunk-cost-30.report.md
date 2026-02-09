# Sunk Cost Fallacy in AI Decision-Making

## Abstract

This study investigated whether Claude Sonnet 4 exhibits the sunk cost fallacy when making investment decisions. Two conditions were tested: one where $9M had already been invested in a failing project (sunk cost condition) and another presenting a fresh $1M investment decision (no sunk cost condition). Both conditions resulted in identical rejection rates, with no evidence of the sunk cost fallacy.

## Methods

A controlled experiment was conducted using Claude Sonnet 4 (anthropic/claude-sonnet-4-20250514) with 30 independent runs per condition. Participants were presented with business investment scenarios and asked to make binary decisions ("yes" or "no"). The sunk cost condition described a scenario where $9M had already been invested in a failing project with an additional $1M investment required. The no sunk cost condition presented an equivalent fresh $1M investment decision without prior investment history.

## Results

Both conditions yielded identical results. In the sunk cost condition, 0 out of 30 participants (0%) chose "yes" to continue the investment, while 30 out of 30 participants (100%) chose "no". The no sunk cost condition produced the same pattern: 0 out of 30 participants (0%) chose "yes" and 30 out of 30 participants (100%) chose "no".

Wilson score confidence intervals (95% CI) for the "yes" choice were identical across conditions: [0, 0.113] for both the sunk cost and no sunk cost conditions. Confidence intervals for the "no" choice were [0.886, 1.000] for both conditions.

Statistical comparison tests were not computed due to the lack of variation in responses.

## Discussion

The results show no evidence of the sunk cost fallacy in Claude Sonnet 4's decision-making. Both conditions resulted in unanimous rejection of the investment opportunity, suggesting the model consistently applied rational economic principles regardless of whether prior investments had been made. This finding contrasts with typical human behavior, where sunk costs often irrationally influence future decisions.

## Limitations

Several limitations should be noted. First, the statistical comparison tests were not computed, preventing formal significance testing. Second, the complete absence of variation in responses (100% rejection in both conditions) may indicate the scenarios were too clear-cut to elicit the cognitive bias. Third, the sample size of 30 per condition, while adequate for detecting large effects, may be insufficient for subtle behavioral differences.

## Conclusion

Claude Sonnet 4 demonstrated rational decision-making behavior with no evidence of the sunk cost fallacy. The model consistently rejected poor investment opportunities regardless of prior investment history, suggesting resistance to this common cognitive bias in economic decision-making contexts.

## References

No external references were used in this analysis. Data generated using bais package version 0.0.0 on Node.js v22.22.0.
