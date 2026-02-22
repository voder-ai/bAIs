# Abstract Refresh Draft

## Current opening:
"Testing 11 model deployments across 4 providers on judicial sentencing scenarios (n=1,800+ trials)"

## Updated opening:
"Testing 11 models across 4 providers on judicial sentencing scenarios (n=14,220 trials)"

## Key additions needed:

1. **Trial count**: 1,800+ → 14,220
2. **Random Control finding**: "~50% of debiasing effects are attributable to conversation structure"
3. **Technique hierarchy**: "Outside View is the only universally safe technique"
4. **SACD model-dependency**: Already covered but emphasize

## Suggested abstract additions:

After the SACD paragraph, add:

"\textbf{Methodological contribution}: We introduce Random Control---token-matched irrelevant elaboration---to decompose debiasing effects into structural (additional turns) and content (technique-specific) components. Approximately 50\% of observed debiasing effects are attributable to conversation structure alone. Among content-based techniques, Outside View (reference class reasoning) is the only intervention showing robust effects across all 11 models; Premortem and iterative SACD backfire on models prone to overthinking (o3, Opus 4.6, GLM-5)."

## Updated trial count line:
"Testing 11 models across 4 providers on judicial sentencing scenarios (\textbf{n=14,220 trials})"
