#!/usr/bin/env npx tsx
/**
 * Fix loan parsing outliers where dollar amounts in reasoning
 * were extracted instead of final answers.
 */

import * as fs from "fs";

const fixes = [
  {
    file: "results/vignette-loan/sacd-high-claude-sonnet-4-5-t07.jsonl",
    line: 28,
    oldResponse: 210000,
    newResponse: 95,
    reason: "Parser extracted '$210,000' from reasoning instead of final '**95**'"
  },
  {
    file: "results/vignette-loan/sacd-low-claude-sonnet-4-5-t07.jsonl", 
    line: 5,
    oldResponse: 50000,
    newResponse: 55,
    reason: "Parser extracted '$50,000' from reasoning instead of final '55'"
  }
];

for (const fix of fixes) {
  console.log(`\nFixing ${fix.file} line ${fix.line}:`);
  console.log(`  ${fix.oldResponse} → ${fix.newResponse}`);
  console.log(`  Reason: ${fix.reason}`);
  
  const lines = fs.readFileSync(fix.file, "utf-8").split("\n");
  const record = JSON.parse(lines[fix.line - 1]);
  
  if (record.response !== fix.oldResponse) {
    console.log(`  WARNING: Expected response ${fix.oldResponse}, found ${record.response}`);
    continue;
  }
  
  record.response = fix.newResponse;
  record.parsingFixed = true;
  record.originalResponse = fix.oldResponse;
  record.fixReason = fix.reason;
  
  lines[fix.line - 1] = JSON.stringify(record);
  fs.writeFileSync(fix.file, lines.join("\n"));
  console.log(`  ✓ Fixed`);
}

console.log("\nDone. Run stats script to verify.");
