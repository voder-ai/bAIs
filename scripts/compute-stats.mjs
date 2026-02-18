#!/usr/bin/env node
/**
 * compute-stats.mjs
 * 
 * Computes statistical measures for bAIs anchoring experiments:
 * - 95% Confidence Intervals (CI)
 * - Two-sample t-tests (low vs high anchor)
 * - Cohen's d effect size
 * 
 * Usage: npm run stats
 * Output: results/statistics.json + results/statistics.md
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import * as ss from 'simple-statistics';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RESULTS_DIR = join(__dirname, '..', 'results');

// ============================================================================
// Statistical Functions
// ============================================================================

/**
 * Compute 95% CI using t-distribution
 */
function confidenceInterval(values, confidence = 0.95) {
  const n = values.length;
  if (n < 2) return { lower: NaN, upper: NaN, margin: NaN };
  
  const mean = ss.mean(values);
  const stdErr = ss.standardDeviation(values) / Math.sqrt(n);
  const tValue = ss.probit((1 + confidence) / 2); // Approximation for t-dist with large n
  const margin = tValue * stdErr;
  
  return {
    lower: mean - margin,
    upper: mean + margin,
    margin
  };
}

/**
 * Two-sample t-test (Welch's t-test for unequal variances)
 */
function tTest(group1, group2) {
  const n1 = group1.length;
  const n2 = group2.length;
  if (n1 < 2 || n2 < 2) return { t: NaN, p: NaN, df: NaN };
  
  const mean1 = ss.mean(group1);
  const mean2 = ss.mean(group2);
  const var1 = ss.variance(group1);
  const var2 = ss.variance(group2);
  
  const se = Math.sqrt(var1/n1 + var2/n2);
  const t = (mean1 - mean2) / se;
  
  // Welch-Satterthwaite degrees of freedom
  const df = Math.pow(var1/n1 + var2/n2, 2) / 
    (Math.pow(var1/n1, 2)/(n1-1) + Math.pow(var2/n2, 2)/(n2-1));
  
  // Two-tailed p-value (approximation using normal distribution for large df)
  const p = 2 * (1 - ss.cumulativeStdNormalProbability(Math.abs(t)));
  
  return { t, p, df };
}

/**
 * Bonferroni correction
 * Adjusts p-value for multiple comparisons
 */
function bonferroniCorrect(p, numTests) {
  return Math.min(p * numTests, 1.0);
}

/**
 * Cohen's d effect size
 */
function cohensD(group1, group2) {
  const n1 = group1.length;
  const n2 = group2.length;
  if (n1 < 2 || n2 < 2) return NaN;
  
  const mean1 = ss.mean(group1);
  const mean2 = ss.mean(group2);
  const var1 = ss.variance(group1);
  const var2 = ss.variance(group2);
  
  // Pooled standard deviation
  const pooledStd = Math.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1 + n2 - 2));
  
  return (mean2 - mean1) / pooledStd;
}

/**
 * Interpret Cohen's d magnitude
 */
function interpretCohensD(d) {
  const abs = Math.abs(d);
  if (abs < 0.2) return 'negligible';
  if (abs < 0.5) return 'small';
  if (abs < 0.8) return 'medium';
  return 'large';
}

// ============================================================================
// Data Loading
// ============================================================================

/**
 * Load and parse all JSONL files from results directory
 */
function loadAllResults() {
  const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.jsonl'));
  const allData = [];
  
  for (const file of files) {
    const content = readFileSync(join(RESULTS_DIR, file), 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    
    for (const line of lines) {
      try {
        const record = JSON.parse(line);
        // Only include records with sentenceMonths in result
        if (record.result?.sentenceMonths !== undefined) {
          allData.push({
            file,
            model: record.model,
            conditionId: record.conditionId,
            sentenceMonths: record.result.sentenceMonths,
            experimentId: record.experimentId,
            params: record.params
          });
        }
      } catch (e) {
        // Skip malformed lines
      }
    }
  }
  
  return allData;
}

/**
 * Group data by model and condition
 */
function groupByModelCondition(data) {
  const grouped = {};
  
  for (const record of data) {
    const model = record.model || 'unknown';
    if (!grouped[model]) {
      grouped[model] = { low: [], high: [], all: [] };
    }
    
    const condition = record.conditionId || '';
    if (condition.includes('low') || condition.includes('3mo')) {
      grouped[model].low.push(record.sentenceMonths);
    } else if (condition.includes('high') || condition.includes('9mo')) {
      grouped[model].high.push(record.sentenceMonths);
    }
    grouped[model].all.push(record.sentenceMonths);
  }
  
  return grouped;
}

// ============================================================================
// Main Analysis
// ============================================================================

function computeAllStats() {
  console.log('Loading results...');
  const data = loadAllResults();
  console.log(`Loaded ${data.length} records from results/`);
  
  const grouped = groupByModelCondition(data);
  const models = Object.keys(grouped).sort();
  
  console.log(`Found ${models.length} models\n`);
  
  const results = {};
  
  for (const model of models) {
    const { low, high, all } = grouped[model];
    
    if (low.length === 0 && high.length === 0) continue;
    
    const stats = {
      model,
      n_low: low.length,
      n_high: high.length,
      n_total: all.length,
      
      // Descriptives
      mean_low: low.length > 0 ? ss.mean(low) : null,
      mean_high: high.length > 0 ? ss.mean(high) : null,
      sd_low: low.length > 1 ? ss.standardDeviation(low) : null,
      sd_high: high.length > 1 ? ss.standardDeviation(high) : null,
      
      // Effect
      anchoring_effect: null,
      
      // CIs
      ci_low: low.length > 1 ? confidenceInterval(low) : null,
      ci_high: high.length > 1 ? confidenceInterval(high) : null,
      
      // Statistical tests
      ttest: null,
      cohens_d: null,
      effect_magnitude: null,
      
      // Bonferroni correction
      p_bonferroni: null,
      significant_bonferroni: null
    };
    
    // Compute anchoring effect and tests if both conditions present
    if (low.length > 0 && high.length > 0) {
      stats.anchoring_effect = stats.mean_high - stats.mean_low;
      
      if (low.length > 1 && high.length > 1) {
        stats.ttest = tTest(low, high);
        stats.cohens_d = cohensD(low, high);
        stats.effect_magnitude = interpretCohensD(stats.cohens_d);
      }
    }
    
    results[model] = stats;
  }
  
  // Apply Bonferroni correction across all models
  const numTests = Object.keys(results).filter(m => results[m].ttest?.p).length;
  const bonferroniAlpha = 0.05 / numTests;
  
  for (const model of Object.keys(results)) {
    if (results[model].ttest?.p) {
      results[model].p_bonferroni = bonferroniCorrect(results[model].ttest.p, numTests);
      results[model].significant_bonferroni = results[model].p_bonferroni < 0.05;
      results[model].bonferroni_alpha = bonferroniAlpha;
      results[model].num_comparisons = numTests;
    }
  }
  
  return results;
}

/**
 * Generate markdown table
 */
function generateMarkdown(results) {
  const models = Object.keys(results).sort();
  
  let md = `# Statistical Analysis Results

Generated: ${new Date().toISOString()}

## Summary Table

| Model | n (low/high) | Mean Low [95% CI] | Mean High [95% CI] | Effect | Cohen's d | p-value |
|-------|--------------|-------------------|--------------------| -------|-----------|---------|
`;

  for (const model of models) {
    const s = results[model];
    const shortModel = model.replace(/^(anthropic|openai|openrouter)\//, '');
    
    const nStr = `${s.n_low}/${s.n_high}`;
    
    const lowStr = s.mean_low !== null 
      ? `${s.mean_low.toFixed(1)} [${s.ci_low?.lower?.toFixed(1) || '?'}, ${s.ci_low?.upper?.toFixed(1) || '?'}]`
      : 'N/A';
    
    const highStr = s.mean_high !== null
      ? `${s.mean_high.toFixed(1)} [${s.ci_high?.lower?.toFixed(1) || '?'}, ${s.ci_high?.upper?.toFixed(1) || '?'}]`
      : 'N/A';
    
    const effectStr = s.anchoring_effect !== null 
      ? `${s.anchoring_effect >= 0 ? '+' : ''}${s.anchoring_effect.toFixed(1)}mo`
      : 'N/A';
    
    const dStr = s.cohens_d !== null
      ? `${s.cohens_d.toFixed(2)} (${s.effect_magnitude})`
      : 'N/A';
    
    const pStr = s.ttest?.p !== null && !isNaN(s.ttest?.p)
      ? (s.ttest.p < 0.001 ? '<.001' : s.ttest.p.toFixed(3))
      : 'N/A';
    
    md += `| ${shortModel} | ${nStr} | ${lowStr} | ${highStr} | ${effectStr} | ${dStr} | ${pStr} |\n`;
  }
  
  // Count Bonferroni results
  const modelsWithStats = models.filter(m => results[m].ttest?.p);
  const numTests = modelsWithStats.length;
  const bonferroniAlpha = numTests > 0 ? (0.05 / numTests).toFixed(4) : 'N/A';
  const sigAfterBonf = modelsWithStats.filter(m => results[m].significant_bonferroni).length;

  md += `
## Bonferroni Correction

- **Number of comparisons**: ${numTests}
- **Corrected α**: ${bonferroniAlpha} (0.05 / ${numTests})
- **Significant after correction**: ${sigAfterBonf} / ${numTests} models

### Models Significant After Bonferroni Correction

| Model | p (uncorrected) | p (Bonferroni) | Significant |
|-------|-----------------|----------------|-------------|
`;

  for (const model of modelsWithStats) {
    const s = results[model];
    const shortModel = model.replace(/^(anthropic|openai|openrouter)\//, '');
    const pUncorr = s.ttest?.p < 0.001 ? '<.001' : s.ttest?.p?.toFixed(4) || 'N/A';
    const pBonf = s.p_bonferroni < 0.001 ? '<.001' : s.p_bonferroni?.toFixed(4) || 'N/A';
    const sig = s.significant_bonferroni ? '✅ Yes' : '❌ No';
    md += `| ${shortModel} | ${pUncorr} | ${pBonf} | ${sig} |\n`;
  }

  md += `
## Interpretation

- **Effect**: Difference in mean sentence (high anchor - low anchor). Positive = anchoring toward higher values.
- **Cohen's d**: Standardized effect size. |d| < 0.2 = negligible, 0.2-0.5 = small, 0.5-0.8 = medium, > 0.8 = large.
- **p-value**: Two-tailed Welch's t-test. p < 0.05 suggests statistically significant difference.
- **Bonferroni**: Corrected p-values account for multiple comparisons (α = 0.05 / ${numTests}).

## Notes

- 95% CIs computed using normal approximation
- Models with insufficient data (n < 2) show N/A
- Only records with valid sentenceMonths are included
`;

  return md;
}

// ============================================================================
// Entry Point
// ============================================================================

function main() {
  console.log('=== bAIs Statistical Analysis ===\n');
  
  const results = computeAllStats();
  const models = Object.keys(results);
  
  if (models.length === 0) {
    console.error('No valid data found in results/');
    process.exit(1);
  }
  
  // Save JSON
  const jsonPath = join(RESULTS_DIR, 'statistics.json');
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`Saved: ${jsonPath}`);
  
  // Save Markdown
  const mdPath = join(RESULTS_DIR, 'statistics.md');
  const markdown = generateMarkdown(results);
  writeFileSync(mdPath, markdown);
  console.log(`Saved: ${mdPath}`);
  
  // Print summary
  console.log('\n=== Summary ===\n');
  for (const model of models) {
    const s = results[model];
    if (s.anchoring_effect !== null) {
      const sig = s.ttest?.p < 0.05 ? '*' : '';
      console.log(`${model}: effect=${s.anchoring_effect.toFixed(1)}mo, d=${s.cohens_d?.toFixed(2) || 'N/A'}${sig}`);
    }
  }
  
  console.log('\n* = p < 0.05');
}

main();
