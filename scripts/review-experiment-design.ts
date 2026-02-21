#!/usr/bin/env npx tsx
/**
 * Experiment Design Review — Validate experiment scripts before full runs
 * 
 * Runs 2-3 test trials per script across diverse models to catch:
 * - Model refusals
 * - Extraction failures  
 * - Unexpected output patterns
 * - Prompt structure issues
 * 
 * Usage: npx tsx scripts/review-experiment-design.ts <script-name> [anchor]
 * Example: npx tsx scripts/review-experiment-design.ts run-outside-view.ts 15
 * 
 * Output: Review report with pass/fail status and recommendations
 */
import { spawn } from 'node:child_process';
import { readFile, unlink } from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Test models: one from each family for diverse coverage
const TEST_MODELS = [
  'anthropic/claude-haiku-4.5',  // Fast Anthropic
  'openai/gpt-4.1',              // OpenAI
  'deepseek/deepseek-v3.2',      // Open source
];

const TRIALS_PER_MODEL = 2;
const TEMP = 0;  // Deterministic for reproducible review

interface TrialResult {
  model: string;
  success: boolean;
  sentenceMonths: number | null;
  error?: string;
  rawOutput?: string;
}

interface ReviewResult {
  script: string;
  anchor: number;
  timestamp: string;
  results: TrialResult[];
  issues: string[];
  recommendations: string[];
  verdict: 'PASS' | 'FAIL' | 'WARN';
}

async function runScript(script: string, model: string, anchor: number, n: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['tsx', `scripts/${script}`, model, anchor.toString(), TEMP.toString(), n.toString()], {
      cwd: process.cwd(),
      timeout: 180000, // 3 min timeout
    });
    
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Exit code ${code}: ${stderr || stdout}`));
      }
    });
    
    proc.on('error', reject);
  });
}

async function getResultFile(script: string, model: string, anchor: number): Promise<string | null> {
  const modelShort = model.split('/').pop()?.replace(/[^a-z0-9-]/gi, '-') || model;
  const technique = script.replace('run-', '').replace('.ts', '');
  const patterns = [
    `results/${technique}-${anchor}mo-${modelShort}-t0.jsonl`,
    `results/${technique}-${modelShort}-t0.jsonl`,
  ];
  
  for (const pattern of patterns) {
    if (existsSync(pattern)) {
      return pattern;
    }
  }
  return null;
}

async function parseResults(filepath: string): Promise<any[]> {
  try {
    const content = await readFile(filepath, 'utf-8');
    return content.trim().split('\n').map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

async function reviewScript(script: string, anchor: number): Promise<ReviewResult> {
  const review: ReviewResult = {
    script,
    anchor,
    timestamp: new Date().toISOString(),
    results: [],
    issues: [],
    recommendations: [],
    verdict: 'PASS',
  };
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`REVIEWING: ${script} (anchor=${anchor}mo)`);
  console.log(`${'='.repeat(60)}\n`);
  
  for (const model of TEST_MODELS) {
    console.log(`Testing ${model}...`);
    
    const result: TrialResult = {
      model,
      success: false,
      sentenceMonths: null,
    };
    
    try {
      // Run the script
      const output = await runScript(script, model, anchor, TRIALS_PER_MODEL);
      result.rawOutput = output;
      
      // Find and parse results file
      const resultFile = await getResultFile(script, model, anchor);
      if (!resultFile) {
        result.error = 'No results file generated';
        review.issues.push(`${model}: No results file generated`);
      } else {
        const data = await parseResults(resultFile);
        
        // Check for valid sentences
        const validSentences = data.filter(d => d.sentenceMonths !== null);
        const nullSentences = data.filter(d => d.sentenceMonths === null);
        
        if (validSentences.length === 0) {
          result.error = 'All trials returned null (extraction failed or model refused)';
          review.issues.push(`${model}: 100% extraction failure`);
        } else if (nullSentences.length > 0) {
          result.error = `${nullSentences.length}/${data.length} trials returned null`;
          review.issues.push(`${model}: ${nullSentences.length}/${data.length} extraction failures`);
          result.success = true;  // Partial success
          result.sentenceMonths = validSentences[0].sentenceMonths;
        } else {
          result.success = true;
          result.sentenceMonths = validSentences[0].sentenceMonths;
        }
        
        // Check for suspicious values
        if (validSentences.length > 0) {
          const values = validSentences.map(d => d.sentenceMonths);
          const allSame = values.every(v => v === values[0]);
          const suspiciouslyLow = values.some(v => v <= 1);
          const suspiciouslyHigh = values.some(v => v > 120);
          
          if (allSame && values[0] === 1) {
            review.issues.push(`${model}: All responses = 1 (likely extraction bug)`);
          }
          if (suspiciouslyLow) {
            review.issues.push(`${model}: Suspiciously low value (≤1mo) detected`);
          }
          if (suspiciouslyHigh) {
            review.issues.push(`${model}: Suspiciously high value (>120mo) detected`);
          }
        }
        
        // Clean up test file
        await unlink(resultFile).catch(() => {});
      }
      
      console.log(`  → ${result.success ? '✓' : '✗'} ${result.sentenceMonths ?? 'NULL'}mo ${result.error ? `(${result.error})` : ''}`);
      
    } catch (e: any) {
      result.error = e.message.slice(0, 100);
      review.issues.push(`${model}: Script error - ${result.error}`);
      console.log(`  → ✗ ERROR: ${result.error}`);
    }
    
    review.results.push(result);
  }
  
  // Generate recommendations
  if (review.issues.length === 0) {
    review.verdict = 'PASS';
    review.recommendations.push('Script validated. Ready for full experiment run.');
  } else if (review.issues.some(i => i.includes('100%') || i.includes('Script error'))) {
    review.verdict = 'FAIL';
    review.recommendations.push('Critical issues found. DO NOT run full experiment.');
    review.recommendations.push('Fix extraction logic or prompt structure before proceeding.');
  } else {
    review.verdict = 'WARN';
    review.recommendations.push('Minor issues detected. Review before full run.');
    review.recommendations.push('Consider testing with more models or adjusting prompts.');
  }
  
  return review;
}

function printReport(review: ReviewResult) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`REVIEW REPORT: ${review.script}`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Anchor: ${review.anchor}mo`);
  console.log(`Timestamp: ${review.timestamp}`);
  console.log(`\nVERDICT: ${review.verdict === 'PASS' ? '✅ PASS' : review.verdict === 'WARN' ? '⚠️ WARN' : '❌ FAIL'}`);
  
  console.log(`\nRESULTS BY MODEL:`);
  for (const r of review.results) {
    const status = r.success ? '✓' : '✗';
    console.log(`  ${status} ${r.model}: ${r.sentenceMonths ?? 'NULL'}mo ${r.error ? `(${r.error})` : ''}`);
  }
  
  if (review.issues.length > 0) {
    console.log(`\nISSUES FOUND (${review.issues.length}):`);
    for (const issue of review.issues) {
      console.log(`  • ${issue}`);
    }
  }
  
  console.log(`\nRECOMMENDATIONS:`);
  for (const rec of review.recommendations) {
    console.log(`  → ${rec}`);
  }
  
  console.log(`\n${'='.repeat(60)}\n`);
}

async function main() {
  const script = process.argv[2];
  const anchor = parseInt(process.argv[3] || '15');
  
  if (!script) {
    console.error('Usage: npx tsx scripts/review-experiment-design.ts <script-name> [anchor]');
    console.error('Example: npx tsx scripts/review-experiment-design.ts run-outside-view.ts 15');
    process.exit(1);
  }
  
  const review = await reviewScript(script, anchor);
  printReport(review);
  
  // Exit with appropriate code
  process.exit(review.verdict === 'FAIL' ? 1 : 0);
}

main().catch(console.error);
