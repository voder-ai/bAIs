import { describe, expect, test } from 'vitest';

import { parseChoice } from '../../src/run/runChoiceExperiment.js';

describe('choice parsing', () => {
  const binaryChoices = ['A', 'B'];
  const yesNoChoices = ['YES', 'NO'];

  test('parses direct single letter responses', () => {
    expect(parseChoice('A', binaryChoices)).toEqual({ choice: 'A' });
    expect(parseChoice('a', binaryChoices)).toEqual({ choice: 'A' });
    expect(parseChoice('B', binaryChoices)).toEqual({ choice: 'B' });
    expect(parseChoice('b', binaryChoices)).toEqual({ choice: 'B' });
  });

  test('parses yes/no responses', () => {
    expect(parseChoice('YES', yesNoChoices)).toEqual({ choice: 'YES' });
    expect(parseChoice('yes', yesNoChoices)).toEqual({ choice: 'YES' });
    expect(parseChoice('No', yesNoChoices)).toEqual({ choice: 'NO' });
    expect(parseChoice('no', yesNoChoices)).toEqual({ choice: 'NO' });
  });

  test('handles whitespace and punctuation', () => {
    expect(parseChoice(' A ', binaryChoices)).toEqual({ choice: 'A' });
    expect(parseChoice('A.', binaryChoices)).toEqual({ choice: 'A' });
    expect(parseChoice('(B)', binaryChoices)).toEqual({ choice: 'B' });
    expect(parseChoice(' yes ', yesNoChoices)).toEqual({ choice: 'YES' });
  });

  test('parses program-style responses', () => {
    expect(parseChoice('Program A', ['A', 'B'])).toEqual({ choice: 'A' });
    expect(parseChoice('Program B', ['A', 'B'])).toEqual({ choice: 'B' });
    expect(parseChoice('I choose Program A', ['A', 'B'])).toEqual({ choice: 'A' });
  });

  test('parses choice with context', () => {
    expect(parseChoice('I would choose A', binaryChoices)).toEqual({ choice: 'A' });
    expect(parseChoice('I choose option B', binaryChoices)).toEqual({ choice: 'B' });
    expect(parseChoice('My answer is A', binaryChoices)).toEqual({ choice: 'A' });
    expect(parseChoice('The answer is yes', yesNoChoices)).toEqual({ choice: 'YES' });
  });

  test('handles verbose explanations', () => {
    const longResponse =
      'After careful consideration, I believe Program A is the better choice because it guarantees saving lives.';
    expect(parseChoice(longResponse, ['A', 'B'])).toEqual({ choice: 'A' });

    const yesResponse =
      'Given the circumstances, I think the company should continue with the investment. Yes.';
    expect(parseChoice(yesResponse, yesNoChoices)).toEqual({ choice: 'YES' });
  });

  test('returns error for ambiguous responses', () => {
    const result = parseChoice('I cannot decide between A and B', binaryChoices);
    expect(result).toHaveProperty('error');
  });

  test('returns error for invalid responses', () => {
    const result = parseChoice('C', binaryChoices);
    expect(result).toHaveProperty('error');

    const result2 = parseChoice('maybe', yesNoChoices);
    expect(result2).toHaveProperty('error');
  });

  test('returns error for empty responses', () => {
    const result = parseChoice('', binaryChoices);
    expect(result).toHaveProperty('error');

    const result2 = parseChoice('   ', yesNoChoices);
    expect(result2).toHaveProperty('error');
  });

  test('handles edge cases with multiple valid choices', () => {
    // Mentioning multiple valid choices should be treated as ambiguous
    const result = parseChoice('A is better than B', binaryChoices);
    expect(result).toHaveProperty('error');
  });

  test('case insensitive matching', () => {
    expect(parseChoice('program a', ['A', 'B'])).toEqual({ choice: 'A' });
    expect(parseChoice('PROGRAM B', ['A', 'B'])).toEqual({ choice: 'B' });
    expect(parseChoice('Yes', yesNoChoices)).toEqual({ choice: 'YES' });
    expect(parseChoice('NO', yesNoChoices)).toEqual({ choice: 'NO' });
  });
});
