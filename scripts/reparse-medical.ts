#!/usr/bin/env bun
/**
 * Re-parse medical vignette responses
 * 
 * Issue: Parser sometimes extracts wrong numbers (e.g., "4" from "4/10 pain")
 * Fix: Extract the FIRST standalone number at the start of the response
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, basename } from 'path';

const RESULTS_DIR = './results/vignette-medical';

function parseUrgencyScore(raw: string): number | null {
  if (!raw) return null;
  
  // Try to find a number at the very start of the response (possibly with ** markdown)
  const startMatch = raw.match(/^\s*\**(\d+)\**/);
  if (startMatch) {
    const num = parseInt(startMatch[1], 10);
    if (num >= 1 && num <= 100) {
      return num;
    }
  }
  
  // If not at start, find first number that looks like an urgency score
  // Avoid extracting from patterns like "4/10", "45 years", etc.
  const lines = raw.split('\n');
  for (const line of lines.slice(0, 3)) { // Check first 3 lines
    // Match standalone numbers 1-100
    const match = line.match(/\b(\d{1,2}|100)\b(?!\s*\/|\s*years|\s*pack|\s*hours)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 1 && num <= 100) {
        return num;
      }
    }
  }
  
  return null;
}

function processFile(filePath: string) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  
  let changed = 0;
  const newLines: string[] = [];
  
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      const newResponse = parseUrgencyScore(data.raw);
      
      if (newResponse !== null && newResponse !== data.response) {
        console.log(`  ${basename(filePath)}: ${data.response} → ${newResponse}`);
        data.response = newResponse;
        changed++;
      }
      
      newLines.push(JSON.stringify(data));
    } catch {
      newLines.push(line);
    }
  }
  
  if (changed > 0) {
    writeFileSync(filePath, newLines.join('\n') + '\n');
    console.log(`  Updated ${changed} records in ${basename(filePath)}`);
  }
  
  return changed;
}

function main() {
  console.log('=== Re-parsing Medical Vignette Responses ===\n');
  
  const files = readdirSync(RESULTS_DIR).filter(f => f.endsWith('.jsonl'));
  let totalChanged = 0;
  
  for (const file of files) {
    const changed = processFile(join(RESULTS_DIR, file));
    totalChanged += changed;
  }
  
  console.log(`\nTotal records updated: ${totalChanged}`);
}

main();
