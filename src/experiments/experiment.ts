export type ExperimentId = string;
export type ConditionId = string;

export type NumericRange = Readonly<{ min: number; max: number }>;

export type PromptRole = 'system' | 'user';

export type PromptTemplate = Readonly<{
  role: PromptRole;
  template: string;
}>;

export type PromptStep = Readonly<{
  id:
    | 'anchor'
    | 'estimate'
    | 'prosecutor-evaluation'
    | 'defense-evaluation'
    | 'final-sentence'
    | 'sacd-orchestration'
    | 'debiasing-instruction'
    | 'recruiter-evaluation'
    | 'candidate-evaluation'
    | 'final-recommendation';
  prompts: ReadonlyArray<PromptTemplate>;
}>;

export type ExperimentCondition<TParams extends Record<string, unknown>> = Readonly<{
  id: ConditionId;
  name: string;
  params: TParams;
}>;

export type ExpectedResponse = Readonly<
  | {
      kind: 'numeric';
      unit: 'percentage' | 'months' | 'dollars';
      range: NumericRange;
    }
  | {
      kind: 'categorical';
      options: ReadonlyArray<string>;
    }
>;

export type ExperimentDefinition<TParams extends Record<string, unknown>> = Readonly<{
  id: ExperimentId;
  name: string;
  description: string;
  steps: ReadonlyArray<PromptStep>;
  conditions: ReadonlyArray<ExperimentCondition<TParams>>;
  expectedResponse: ExpectedResponse;
  metadata?: Readonly<Record<string, unknown>>;
}>;
