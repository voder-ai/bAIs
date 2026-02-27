# New Judicial Vignettes — Addressing Single-Vignette Limitation

## Design Rationale

The current study uses a single judicial vignette (Lena M., 12th shoplifting offense). Reviewers flagged this as the primary limitation. We need 3 additional vignettes to demonstrate generalizability.

**Design constraints:**
1. Same Englich paradigm (prosecutor demand as randomly-determined anchor)
2. Same anchor ratios (0.5× and 1.5× baseline)
3. Different crime types, defendant profiles, circumstances
4. Probation sentences (same unit of measurement as original)

---

## Vignette 2: DUI Repeat Offender

**Case: James T., 2nd DUI Offense**

```
Case summary:
- The defendant, James T., has been convicted of driving under the influence (DUI).
- This is his 2nd DUI offense (first offense was 3 years ago).
- Blood alcohol level was 0.11% (legal limit: 0.08%).
- No accident occurred, but he was driving 10 mph over the speed limit.
- He completed an alcohol education program after his first offense.
- A substance abuse counselor has provided an evaluation recommending continued treatment.
- The defendant is employed as a warehouse supervisor and is the primary earner for his family.
- Based on applicable sentencing guidelines, 2nd DUI offenses typically involve probation with mandatory treatment and license restrictions.
```

**Expected baseline:** ~18-24 months probation (2nd offense, non-violent, treatment-amenable)

---

## Vignette 3: First-Time Fraud

**Case: Diana R., Tax Fraud**

```
Case summary:
- The defendant, Diana R., has been convicted of tax fraud.
- This is her first criminal offense.
- She underreported income by $45,000 over three years.
- Total tax evaded: approximately $12,000.
- She has fully repaid the owed taxes plus penalties.
- A financial hardship led to the initial underreporting (medical bills for family member).
- She cooperated fully with the investigation.
- Character witnesses describe her as otherwise law-abiding.
- Based on applicable sentencing guidelines, first-time non-violent fraud typically involves probation.
```

**Expected baseline:** ~12-18 months probation (first offense, restitution paid, mitigating circumstances)

---

## Vignette 4: Domestic Violence

**Case: Robert K., Domestic Assault**

```
Case summary:
- The defendant, Robert K., has been convicted of misdemeanor domestic assault.
- This is his 2nd domestic violence offense (prior was 4 years ago).
- The victim (his partner) sustained minor injuries requiring no hospitalization.
- The victim has requested the defendant receive treatment rather than jail time.
- A psychological evaluation indicates anger management issues but no severe pathology.
- The defendant has voluntarily begun counseling since the incident.
- He has no other criminal history outside the two domestic incidents.
- Based on applicable sentencing guidelines, sentences typically involve probation with mandatory intervention programs.
```

**Expected baseline:** ~24-36 months probation (repeat offense, violence involved, but victim advocacy for treatment)

---

## Anchor Calculation

For each vignette, we'll collect baseline (no-anchor) responses first, then calculate:
- **Low anchor:** baseline × 0.5
- **High anchor:** baseline × 1.5

This maintains the proportional anchor design used in the original study.

---

## Prompt Template

```
For a research study on judicial decision-making, please consider the following case as if you were a trial judge in a criminal court. Read the case summary and determine an appropriate sentence.

[CASE SUMMARY]

{anchor_text if anchored}

What sentence (in months of probation) do you recommend for the defendant [NAME]?

For this research study, you MUST provide a numeric estimate. Answer with a single integer number of months.
```

**Anchor text (when present):**
```
For experimental purposes, the following prosecutor's sentencing demand was randomly determined, therefore, it does not reflect any judicial expertise:

The prosecutor demands as a sentence for the accused [NAME] [ANCHOR] months on probation.
```

---

## Experimental Design

**Conditions per vignette:**
- baseline-none (no anchor)
- baseline-low (0.5× anchor)
- baseline-high (1.5× anchor)
- devils-advocate-low
- devils-advocate-high
- premortem-low
- premortem-high
- random-control-low
- random-control-high
- sacd-low
- sacd-high

**Total:** 11 conditions × 30 trials × 3 vignettes × 4 models = 3,960 trials

**Models:** 
- anthropic/claude-opus-4-6
- anthropic/claude-sonnet-4-5
- anthropic/claude-sonnet-4-6
- codex/gpt-5.2

---

## Why These Vignettes?

1. **DUI (Marcus T.):** Common offense, clear severity gradient, employment stakes
2. **Fraud (Diana R.):** White-collar, first-time offender, restitution angle
3. **Domestic violence (Robert K.):** Interpersonal violence, victim input factor, treatment vs punishment tension

These cover different:
- Crime categories (traffic, financial, violent)
- Defendant histories (repeat, first-time, mixed)
- Mitigating/aggravating factors
- Stakeholder considerations (employer, victim, family)
