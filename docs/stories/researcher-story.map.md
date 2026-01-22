# Researcher User Story Map - bAIs (Bias AI Studies)

## Journey Steps (Columns)

| **Design Experiment**              | **Select Models**           | **Configure Parameters**       | **Run Experiment**              | **Parse Responses**             | **Analyze Results**      | **Report Findings**           | **Iterate**                     |
| ---------------------------------- | --------------------------- | ------------------------------ | ------------------------------- | ------------------------------- | ------------------------ | ----------------------------- | ------------------------------- |
| _Define hypothesis and conditions_ | _Choose LLM models to test_ | _Set up experiment parameters_ | _Execute prompts automatically_ | _Extract data from LLM outputs_ | _Run statistical tests_  | _Generate analysis reports_   | _Refine and re-run experiments_ |
| **Experiment Design**              | **Model Selection**         | **Parameter Configuration**    | **Execution Management**        | **Data Extraction**             | **Statistical Analysis** | **Reporting & Visualization** | **Workflow Management**         |

## Personas

- 🎯 **PRIMARY**: Bias Researcher - _Validates cognitive biases in LLMs before running costly human experiments, also runs experiments that cannot ethically be performed on humans_
- 🔧 **AI Developer** - _Tests behavioral differences across LLM models to identify biases in production systems_
- 📚 **Student** - _Learning about cognitive biases in AI through hands-on experimentation_
- 🔬 **Research Contributor** - _Extends toolkit by adding new bias experiments based on published research_
- 👥 **Research Assistant** - _Executes experiments designed by principal researchers_

---

# User Story Map with Themes

## Theme: Core Validation

| **Core Validation** | **Design Experiment**   | **Select Models**      | **Configure Parameters**     | **Run Experiment**     | **Parse Responses**     | **Analyze Results**         | **Report Findings**    | **Iterate** |
| ------------------- | ----------------------- | ---------------------- | ---------------------------- | ---------------------- | ----------------------- | --------------------------- | ---------------------- | ----------- |
| **Essential MVP**   | 001.0-RES-ANCHORING-EXP | 002.0-RES-MODEL-OPENAI | 003.0-RES-CONFIG-CONDITIONS  | 004.0-RES-EXEC-ENGINE  | 005.0-RES-PARSE-NUMERIC | 006.0-RES-STATS-TTEST       | 007.0-RES-REPORT-BASIC | -           |
|                     | -                       | -                      | 003.1-RES-CONFIG-SAMPLE-SIZE | 004.1-RES-EXEC-RETRIES | 005.1-RES-PARSE-ERRORS  | 006.1-RES-STATS-EFFECT-SIZE | -                      | -           |
|                     | -                       | -                      | 003.2-RES-CONFIG-TEMPERATURE | -                      | -                       | -                           | -                      | -           |

## Theme: Multi-Model Comparison

| **Multi-Model Comparison** | **Design Experiment** | **Select Models**         | **Configure Parameters** | **Run Experiment**         | **Parse Responses** | **Analyze Results**     | **Report Findings**         | **Iterate**              |
| -------------------------- | --------------------- | ------------------------- | ------------------------ | -------------------------- | ------------------- | ----------------------- | --------------------------- | ------------------------ |
| **Model Flexibility**      | -                     | 008.0-DEV-MODEL-ANTHROPIC | -                        | 009.0-DEV-EXEC-PARALLEL    | -                   | 010.0-DEV-STATS-COMPARE | 011.0-DEV-REPORT-COMPARISON | 012.0-DEV-ITERATE-PARAMS |
|                            | -                     | 008.1-DEV-MODEL-OLLAMA    | -                        | 009.1-DEV-EXEC-RATE-LIMITS | -                   | -                       | -                           | -                        |
|                            | -                     | 008.2-DEV-MODEL-REGISTRY  | -                        | -                          | -                   | -                       | -                           | -                        |

## Theme: Experiment Library

| **Experiment Library** | **Design Experiment**      | **Select Models** | **Configure Parameters**   | **Run Experiment**       | **Parse Responses**          | **Analyze Results**        | **Report Findings**        | **Iterate**                  |
| ---------------------- | -------------------------- | ----------------- | -------------------------- | ------------------------ | ---------------------------- | -------------------------- | -------------------------- | ---------------------------- |
| **Classic Biases**     | 013.0-CON-FRAMING-EXP      | -                 | 014.0-CON-CONFIG-TEMPLATES | 015.0-CON-EXEC-MULTI-EXP | 016.0-CON-PARSE-CATEGORICAL  | 017.0-CON-STATS-CHI-SQUARE | 018.0-CON-REPORT-MULTI-EXP | 019.0-CON-ITERATE-EXP-SELECT |
|                        | 013.1-CON-AVAILABILITY-EXP | -                 | -                          | -                        | 016.1-CON-PARSE-TEXT-EXTRACT | 017.1-CON-STATS-ANOVA      | -                          | -                            |
|                        | 013.2-CON-CONFIRMATION-EXP | -                 | -                          | -                        | -                            | -                          | -                          | -                            |

## Theme: Enhanced Research Experience

| **Enhanced Research Experience** | **Design Experiment** | **Select Models** | **Configure Parameters** | **Run Experiment**      | **Parse Responses**        | **Analyze Results**            | **Report Findings**          | **Iterate**               |
| -------------------------------- | --------------------- | ----------------- | ------------------------ | ----------------------- | -------------------------- | ------------------------------ | ---------------------------- | ------------------------- |
| **Publication Quality**          | 020.0-RES-DESIGN-UI   | -                 | 021.0-RES-CONFIG-PRESETS | 022.0-AST-EXEC-MONITOR  | 023.0-RES-PARSE-VALIDATION | 024.0-RES-STATS-POWER-ANALYSIS | 025.0-RES-REPORT-CHARTS      | 026.0-RES-ITERATE-HISTORY |
|                                  | -                     | -                 | -                        | 022.1-AST-EXEC-PROGRESS | -                          | 024.1-RES-STATS-CONFIDENCE-INT | 025.1-RES-REPORT-EXPORT-CSV  | 026.1-RES-ITERATE-COMPARE |
|                                  | -                     | -                 | -                        | -                       | -                          | -                              | 025.2-RES-REPORT-EXPORT-JSON | -                         |
|                                  | -                     | -                 | -                        | -                       | -                          | -                              | 025.3-RES-REPORT-PUBLICATION | -                         |

## Theme: Extensibility Framework

| **Extensibility Framework** | **Design Experiment**         | **Select Models**          | **Configure Parameters** | **Run Experiment**   | **Parse Responses**        | **Analyze Results**    | **Report Findings**        | **Iterate**                     |
| --------------------------- | ----------------------------- | -------------------------- | ------------------------ | -------------------- | -------------------------- | ---------------------- | -------------------------- | ------------------------------- |
| **Community Growth**        | 027.0-CON-DESIGN-TEMPLATE-API | 028.0-CON-MODEL-PLUGIN-API | 029.0-CON-CONFIG-SCHEMA  | 030.0-CON-EXEC-HOOKS | 031.0-CON-PARSE-PLUGIN-API | 032.0-CON-STATS-CUSTOM | 033.0-CON-REPORT-TEMPLATES | 034.0-CON-ITERATE-WORKFLOW-SAVE |
|                             | 027.1-CON-DESIGN-VALIDATION   | -                          | -                        | -                    | -                          | -                      | -                          | 034.1-CON-ITERATE-WORKFLOW-LOAD |

## Theme: Educational Resources

| **Educational Resources** | **Design Experiment**     | **Select Models** | **Configure Parameters**  | **Run Experiment**          | **Parse Responses** | **Analyze Results**       | **Report Findings**         | **Iterate**                 |
| ------------------------- | ------------------------- | ----------------- | ------------------------- | --------------------------- | ------------------- | ------------------------- | --------------------------- | --------------------------- |
| **Learning Support**      | 035.0-STU-DESIGN-GUIDED   | -                 | 036.0-STU-CONFIG-DEFAULTS | 037.0-STU-EXEC-EXPLANATIONS | -                   | 038.0-STU-STATS-INTERPRET | 039.0-STU-REPORT-NARRATIVES | 040.0-STU-ITERATE-TUTORIALS |
|                           | 035.1-STU-DESIGN-EXAMPLES | -                 | -                         | -                           | -                   | -                         | 039.1-STU-REPORT-LESSONS    | -                           |
|                           | -                         | -                 | -                         | -                           | -                   | -                         | 039.2-STU-REPORT-REFERENCES | -                           |

---

## Theme Details

### Theme: Core Validation

**Goal**: Enable researchers to validate anchoring bias exists in one LLM model with basic statistical output (prosecutor sentencing recommendation paradigm)
**Success Metric**: Researcher can run the anchoring experiment on OpenAI GPT model and receive statistically significant t-test results showing bias effect within 15 minutes of first use
**Scope**: Complete MVP covering experiment design through basic reporting for single classic experiment on single model

**Stories by Category:**

- **Experiment Design** (1 story, 7 points):
  - 001.0-RES-ANCHORING-EXP (M): Implement prosecutor sentencing recommendation anchoring experiment (low vs high prosecutor recommendation)
    - Complexity: M | Cost of Delay: XL | Dependencies: none | WSJF: 2.67

- **Model Selection** (1 story, 3 points):
  - 002.0-RES-MODEL-OPENAI (M): Configure OpenAI API integration for GPT models
    - Complexity: M | Cost of Delay: XL | Dependencies: none | WSJF: 2.67

- **Parameter Configuration** (3 stories, 7 points):
  - 003.0-RES-CONFIG-CONDITIONS (S): Configure high/low anchor conditions (low vs high prosecutor recommendation in months)
    - Complexity: S | Cost of Delay: XL | Dependencies: 001.0 | WSJF: 4.00
  - 003.1-RES-CONFIG-SAMPLE-SIZE (S): Set number of runs per condition
    - Complexity: S | Cost of Delay: L | Dependencies: 003.0 | WSJF: 2.50
  - 003.2-RES-CONFIG-TEMPERATURE (XS): Configure model temperature parameter
    - Complexity: XS | Cost of Delay: M | Dependencies: 002.0 | WSJF: 3.00

- **Execution Management** (2 stories, 7 points):
  - 004.0-RES-EXEC-ENGINE (M): Execute experiment with automatic API calls across conditions
    - Complexity: M | Cost of Delay: XL | Dependencies: 002.0, 003.0 | WSJF: 2.67
  - 004.1-RES-EXEC-RETRIES (S): Handle API failures with exponential backoff retries
    - Complexity: S | Cost of Delay: L | Dependencies: 004.0 | WSJF: 2.50

- **Data Extraction** (2 stories, 5 points):
  - 005.0-RES-PARSE-NUMERIC (M): Extract numerical estimates from LLM text responses
    - Complexity: M | Cost of Delay: XL | Dependencies: 004.0 | WSJF: 2.67
  - 005.1-RES-PARSE-ERRORS (S): Handle parsing failures when LLM doesn't provide number
    - Complexity: S | Cost of Delay: L | Dependencies: 005.0 | WSJF: 2.50

- **Statistical Analysis** (2 stories, 7 points):
  - 006.0-RES-STATS-TTEST (M): Run independent samples t-test comparing anchor groups
    - Complexity: M | Cost of Delay: XL | Dependencies: 005.0 | WSJF: 2.67
  - 006.1-RES-STATS-EFFECT-SIZE (S): Calculate Cohen's d effect size
    - Complexity: S | Cost of Delay: M | Dependencies: 006.0 | WSJF: 1.50

- **Reporting & Visualization** (1 story, 3 points):
  - 007.0-RES-REPORT-BASIC (M): Generate text summary with descriptive stats and significance
    - Complexity: M | Cost of Delay: XL | Dependencies: 006.0 | WSJF: 2.67

**Total**: 12 stories (39 points) covering complete single-experiment, single-model validation workflow

**Prioritization Summary**:

1. **Critical Path (WSJF ≥ 4.0)**: 003.0-RES-CONFIG-CONDITIONS must be implemented first
2. **High Priority (WSJF 2.5-2.67)**: All core infrastructure stories (001.0, 002.0, 004.0, 005.0, 006.0, 007.0) form the backbone
3. **Enhancement (WSJF 1.5-2.5)**: Error handling and additional metrics (004.1, 005.1, 006.1, 003.1)
4. **Quick Wins**: 003.2-RES-CONFIG-TEMPERATURE (XS complexity, M value)

**Dependency Chain**:

```
001.0 (Anchoring Exp) ──→ 003.0 (Conditions) ──→ 003.1 (Sample Size)
002.0 (OpenAI) ──→ 003.2 (Temperature)
                ──→ 004.0 (Exec Engine) ──→ 004.1 (Retries)
                                        ──→ 005.0 (Parse Numeric) ──→ 005.1 (Parse Errors)
                                                                   ──→ 006.0 (T-Test) ──→ 006.1 (Effect Size)
                                                                                      ──→ 007.0 (Report)
```

### Theme: Multi-Model Comparison

**Goal**: Enable AI developers to compare bias susceptibility across multiple LLM providers
**Success Metric**: Developer can run same experiment on OpenAI, Anthropic, and local Ollama models, generating comparative analysis showing which models exhibit stronger anchoring effects
**Scope**: Model flexibility, parallel execution, comparative statistics, and iteration capabilities

**Stories by Category:**

- **Model Selection** (3 stories, 8 points):
  - 008.0-DEV-MODEL-ANTHROPIC (M): Add Anthropic Claude API integration
    - Complexity: M | Cost of Delay: L | Dependencies: 002.0 | WSJF: 1.67
  - 008.1-DEV-MODEL-OLLAMA (M): Add Ollama local model support
    - Complexity: M | Cost of Delay: M | Dependencies: 002.0 | WSJF: 1.00
  - 008.2-DEV-MODEL-REGISTRY (S): Create model registry for easy model selection
    - Complexity: S | Cost of Delay: L | Dependencies: 008.0, 008.1 | WSJF: 2.50

- **Execution Management** (2 stories, 8 points):
  - 009.0-DEV-EXEC-PARALLEL (L): Run experiments on multiple models in parallel
    - Complexity: L | Cost of Delay: M | Dependencies: 008.2 | WSJF: 0.60
  - 009.1-DEV-EXEC-RATE-LIMITS (M): Handle provider-specific rate limits
    - Complexity: M | Cost of Delay: L | Dependencies: 009.0 | WSJF: 1.67

- **Statistical Analysis** (1 story, 3 points):
  - 010.0-DEV-STATS-COMPARE (M): Compare effect sizes across models
    - Complexity: M | Cost of Delay: L | Dependencies: 006.1, 009.0 | WSJF: 1.67

- **Reporting & Visualization** (1 story, 3 points):
  - 011.0-DEV-REPORT-COMPARISON (M): Generate cross-model comparison report
    - Complexity: M | Cost of Delay: L | Dependencies: 010.0 | WSJF: 1.67

- **Workflow Management** (1 story, 2 points):
  - 012.0-DEV-ITERATE-PARAMS (S): Modify experiment parameters and re-run
    - Complexity: S | Cost of Delay: M | Dependencies: 003.0 | WSJF: 1.50

**Total**: 8 stories (24 points) enabling multi-model comparison and iteration

**Prioritization Summary**:

1. **High Priority (WSJF 2.5)**: 008.2-DEV-MODEL-REGISTRY provides foundation for multi-model support
2. **Medium Priority (WSJF 1.5-1.67)**: Model integrations and comparative features
3. **Enhancement (WSJF 0.6-1.0)**: Parallel execution and local model support can be added later

**Dependency Chain**:

```
002.0 (OpenAI) ──→ 008.0 (Anthropic) ──┐
                ──→ 008.1 (Ollama) ────┼──→ 008.2 (Registry) ──→ 009.0 (Parallel) ──→ 009.1 (Rate Limits)
                                       │                                          ──→ 010.0 (Compare) ──→ 011.0 (Report)
006.1 (Effect Size) ───────────────────┘
003.0 (Conditions) ──────────────────────────────────────────────────────────────────→ 012.0 (Iterate Params)
```

### Theme: Experiment Library

**Goal**: Enable research contributors to add new bias experiments beyond anchoring, creating a library of classic cognitive bias tests
**Success Metric**: Contributor can add framing effect and availability heuristic experiments, with toolkit automatically supporting different response types (categorical, text extraction) and appropriate statistical tests
**Scope**: Additional bias experiments, template system, multi-experiment execution, diverse parsing and analysis

**Stories by Category:**

- **Experiment Design** (3 stories, 8 points):
  - 013.0-CON-FRAMING-EXP (M): Implement Tversky/Kahneman framing effect experiment
    - Complexity: M | Cost of Delay: M | Dependencies: 001.0 | WSJF: 1.00
  - 013.1-CON-AVAILABILITY-EXP (M): Implement availability heuristic experiment
    - Complexity: M | Cost of Delay: M | Dependencies: 001.0 | WSJF: 1.00
  - 013.2-CON-CONFIRMATION-EXP (M): Implement confirmation bias experiment
    - Complexity: M | Cost of Delay: S | Dependencies: 001.0 | WSJF: 0.67

- **Parameter Configuration** (1 story, 2 points):
  - 014.0-CON-CONFIG-TEMPLATES (S): Create configuration templates for each experiment type
    - Complexity: S | Cost of Delay: L | Dependencies: 013.0, 013.1 | WSJF: 2.50

- **Execution Management** (1 story, 5 points):
  - 015.0-CON-EXEC-MULTI-EXP (L): Run multiple experiments in sequence or parallel
    - Complexity: L | Cost of Delay: M | Dependencies: 014.0 | WSJF: 0.60

- **Data Extraction** (2 stories, 5 points):
  - 016.0-CON-PARSE-CATEGORICAL (M): Parse categorical choices (A/B options) from responses
    - Complexity: M | Cost of Delay: L | Dependencies: 013.0 | WSJF: 1.67
  - 016.1-CON-PARSE-TEXT-EXTRACT (S): Extract specific text patterns from free-form responses
    - Complexity: S | Cost of Delay: M | Dependencies: 016.0 | WSJF: 1.50

- **Statistical Analysis** (2 stories, 5 points):
  - 017.0-CON-STATS-CHI-SQUARE (M): Chi-square test for categorical outcomes
    - Complexity: M | Cost of Delay: L | Dependencies: 016.0 | WSJF: 1.67
  - 017.1-CON-STATS-ANOVA (M): ANOVA for multi-group comparisons
    - Complexity: M | Cost of Delay: S | Dependencies: 006.0 | WSJF: 0.67

- **Reporting & Visualization** (1 story, 3 points):
  - 018.0-CON-REPORT-MULTI-EXP (M): Generate report covering multiple experiments
    - Complexity: M | Cost of Delay: L | Dependencies: 017.0 | WSJF: 1.67

- **Workflow Management** (1 story, 2 points):
  - 019.0-CON-ITERATE-EXP-SELECT (S): Select which experiments to run from library
    - Complexity: S | Cost of Delay: M | Dependencies: 015.0 | WSJF: 1.50

**Total**: 11 stories (30 points) building experiment library with diverse analysis capabilities

**Prioritization Summary**:

1. **High Priority (WSJF 2.5)**: 014.0-CON-CONFIG-TEMPLATES enables reusable experiment patterns
2. **Medium Priority (WSJF 1.5-1.67)**: Parsing and statistical analysis for new experiment types
3. **Enhancement (WSJF 0.6-1.0)**: Additional experiments and multi-experiment execution

**Dependency Chain**:

```
001.0 (Anchoring) ──→ 013.0 (Framing) ───┬──→ 014.0 (Templates) ──→ 015.0 (Multi-Exp) ──→ 019.0 (Exp Select)
                   ──→ 013.1 (Availability)┤                                           ──→ 016.0 (Parse Cat) ──→ 016.1 (Parse Text)
                   ──→ 013.2 (Confirmation)─┘                                                                ──→ 017.0 (Chi-Square) ──→ 018.0 (Multi-Exp Report)
006.0 (T-Test) ─────────────────────────────────────────────────────────────────────────────────────────────→ 017.1 (ANOVA)
```

### Theme: Enhanced Research Experience

**Goal**: Provide publication-quality outputs and enhanced user experience for professional researchers
**Success Metric**: Researcher can generate publication-ready visualizations, export data in standard formats, and track experiment history for reproducibility
**Scope**: UI improvements, advanced statistics, professional reporting, experiment tracking

**Stories by Category:**

- **Experiment Design** (1 story, 3 points):
  - 020.0-RES-DESIGN-UI (M): Visual experiment designer interface
    - Complexity: M | Cost of Delay: S | Dependencies: 014.0 | WSJF: 0.67

- **Parameter Configuration** (1 story, 2 points):
  - 021.0-RES-CONFIG-PRESETS (S): Save and load parameter presets
    - Complexity: S | Cost of Delay: M | Dependencies: 003.0 | WSJF: 1.50

- **Execution Management** (2 stories, 5 points):
  - 022.0-AST-EXEC-MONITOR (M): Real-time execution monitoring dashboard
    - Complexity: M | Cost of Delay: S | Dependencies: 004.0 | WSJF: 0.67
  - 022.1-AST-EXEC-PROGRESS (S): Progress indicators for long-running experiments
    - Complexity: S | Cost of Delay: S | Dependencies: 022.0 | WSJF: 1.00

- **Data Extraction** (1 story, 2 points):
  - 023.0-RES-PARSE-VALIDATION (S): Validate parsed data quality and flag anomalies
    - Complexity: S | Cost of Delay: M | Dependencies: 005.0, 016.0 | WSJF: 1.50

- **Statistical Analysis** (2 stories, 5 points):
  - 024.0-RES-STATS-POWER-ANALYSIS (M): Statistical power analysis for sample size determination
    - Complexity: M | Cost of Delay: S | Dependencies: 006.0 | WSJF: 0.67
  - 024.1-RES-STATS-CONFIDENCE-INT (S): Confidence intervals for all estimates
    - Complexity: S | Cost of Delay: M | Dependencies: 024.0 | WSJF: 1.50

- **Reporting & Visualization** (4 stories, 10 points):
  - 025.0-RES-REPORT-CHARTS (M): Generate publication-quality charts (bar, box plots, distributions)
    - Complexity: M | Cost of Delay: M | Dependencies: 007.0 | WSJF: 1.00
  - 025.1-RES-REPORT-EXPORT-CSV (S): Export raw data to CSV
    - Complexity: S | Cost of Delay: M | Dependencies: 005.0 | WSJF: 1.50
  - 025.2-RES-REPORT-EXPORT-JSON (S): Export structured results to JSON
    - Complexity: S | Cost of Delay: M | Dependencies: 007.0 | WSJF: 1.50
  - 025.3-RES-REPORT-PUBLICATION (L): Generate complete publication-ready report with APA formatting
    - Complexity: L | Cost of Delay: S | Dependencies: 025.0, 025.1 | WSJF: 0.40

- **Workflow Management** (2 stories, 5 points):
  - 026.0-RES-ITERATE-HISTORY (M): Track experiment run history for reproducibility
    - Complexity: M | Cost of Delay: M | Dependencies: 004.0 | WSJF: 1.00
  - 026.1-RES-ITERATE-COMPARE (M): Compare results across experiment runs
    - Complexity: M | Cost of Delay: S | Dependencies: 026.0 | WSJF: 0.67

**Total**: 13 stories (32 points) delivering professional research experience

**Prioritization Summary**:

1. **High Priority (WSJF 1.5)**: Data export, validation, and configuration management
2. **Medium Priority (WSJF 1.0)**: Visualization and experiment tracking
3. **Enhancement (WSJF 0.4-0.67)**: Advanced UI and publication automation

**Dependency Chain**:

```
014.0 (Templates) ──→ 020.0 (Design UI)
003.0 (Conditions) ──→ 021.0 (Config Presets)
004.0 (Exec Engine) ──→ 022.0 (Exec Monitor) ──→ 022.1 (Progress)
                     ──→ 026.0 (History) ──→ 026.1 (Compare)
005.0 (Parse Numeric) ──┬──→ 023.0 (Parse Validation)
016.0 (Parse Cat) ──────┘                            ──→ 025.1 (Export CSV)
006.0 (T-Test) ──→ 024.0 (Power Analysis) ──→ 024.1 (Confidence Int)
007.0 (Report Basic) ──→ 025.0 (Report Charts) ──┬──→ 025.3 (Publication)
005.0 (Parse Numeric) ──────────────────────────────→ 025.1 (Export CSV) ──┘
007.0 (Report Basic) ────────────────────────────────→ 025.2 (Export JSON)
```

### Theme: Extensibility Framework

**Goal**: Enable community to extend toolkit with custom experiments, models, parsers, and analysis methods
**Success Metric**: Research contributor can add a new bias experiment using template API without modifying core toolkit code
**Scope**: Plugin architecture, API design, validation framework, workflow persistence

**Stories by Category:**

- **Experiment Design** (2 stories, 5 points):
  - 027.0-CON-DESIGN-TEMPLATE-API (M): Define experiment template API for custom experiments
    - Complexity: M | Cost of Delay: M | Dependencies: 014.0 | WSJF: 1.00
  - 027.1-CON-DESIGN-VALIDATION (S): Validate custom experiment definitions
    - Complexity: S | Cost of Delay: M | Dependencies: 027.0 | WSJF: 1.50

- **Model Selection** (1 story, 5 points):
  - 028.0-CON-MODEL-PLUGIN-API (L): Define model provider plugin API
    - Complexity: L | Cost of Delay: S | Dependencies: 008.2 | WSJF: 0.40

- **Parameter Configuration** (1 story, 2 points):
  - 029.0-CON-CONFIG-SCHEMA (S): JSON schema for configuration validation
    - Complexity: S | Cost of Delay: M | Dependencies: 027.0 | WSJF: 1.50

- **Execution Management** (1 story, 3 points):
  - 030.0-CON-EXEC-HOOKS (M): Pre/post execution hooks for custom logic
    - Complexity: M | Cost of Delay: S | Dependencies: 027.0 | WSJF: 0.67

- **Data Extraction** (1 story, 3 points):
  - 031.0-CON-PARSE-PLUGIN-API (M): Define parser plugin API for custom response types
    - Complexity: M | Cost of Delay: M | Dependencies: 016.1 | WSJF: 1.00

- **Statistical Analysis** (1 story, 5 points):
  - 032.0-CON-STATS-CUSTOM (L): Support custom statistical test implementations
    - Complexity: L | Cost of Delay: S | Dependencies: 017.1 | WSJF: 0.40

- **Reporting & Visualization** (1 story, 3 points):
  - 033.0-CON-REPORT-TEMPLATES (M): Custom report template system
    - Complexity: M | Cost of Delay: S | Dependencies: 018.0 | WSJF: 0.67

- **Workflow Management** (2 stories, 5 points):
  - 034.0-CON-ITERATE-WORKFLOW-SAVE (M): Save complete workflow as reusable pipeline
    - Complexity: M | Cost of Delay: M | Dependencies: 026.0 | WSJF: 1.00
  - 034.1-CON-ITERATE-WORKFLOW-LOAD (S): Load and execute saved workflows
    - Complexity: S | Cost of Delay: M | Dependencies: 034.0 | WSJF: 1.50

**Total**: 10 stories (31 points) enabling community extensibility

**Prioritization Summary**:

1. **High Priority (WSJF 1.5)**: Validation and configuration schema provide guardrails
2. **Medium Priority (WSJF 1.0)**: Template APIs enable custom experiments
3. **Enhancement (WSJF 0.4-0.67)**: Plugin infrastructure for advanced extensibility

**Dependency Chain**:

```
014.0 (Config Templates) ──→ 027.0 (Template API) ──┬──→ 027.1 (Validation)
                                                      ├──→ 029.0 (Config Schema)
                                                      └──→ 030.0 (Exec Hooks)
008.2 (Model Registry) ──→ 028.0 (Model Plugin API)
016.1 (Parse Text) ──→ 031.0 (Parse Plugin API)
017.1 (ANOVA) ──→ 032.0 (Stats Custom)
018.0 (Multi-Exp Report) ──→ 033.0 (Report Templates)
026.0 (History) ──→ 034.0 (Workflow Save) ──→ 034.1 (Workflow Load)
```

### Theme: Educational Resources

**Goal**: Make toolkit accessible to students learning about cognitive biases in AI systems
**Success Metric**: Student with no prior bias research experience can complete guided tutorial, run anchoring experiment, and understand results within 30 minutes
**Scope**: Guided workflows, documentation, interpretive reporting, learning materials

**Stories by Category:**

- **Experiment Design** (2 stories, 5 points):
  - 035.0-STU-DESIGN-GUIDED (M): Step-by-step guided experiment designer
    - Complexity: M | Cost of Delay: S | Dependencies: 020.0 | WSJF: 0.67
  - 035.1-STU-DESIGN-EXAMPLES (S): Curated example experiments with explanations
    - Complexity: S | Cost of Delay: M | Dependencies: 035.0 | WSJF: 1.50

- **Parameter Configuration** (1 story, 2 points):
  - 036.0-STU-CONFIG-DEFAULTS (S): Smart defaults for educational use cases
    - Complexity: S | Cost of Delay: M | Dependencies: 021.0 | WSJF: 1.50

- **Execution Management** (1 story, 3 points):
  - 037.0-STU-EXEC-EXPLANATIONS (M): Real-time explanations during execution
    - Complexity: M | Cost of Delay: S | Dependencies: 022.1 | WSJF: 0.67

- **Statistical Analysis** (1 story, 3 points):
  - 038.0-STU-STATS-INTERPRET (M): Plain language interpretation of statistical results
    - Complexity: M | Cost of Delay: M | Dependencies: 024.1 | WSJF: 1.00

- **Reporting & Visualization** (3 stories, 8 points):
  - 039.0-STU-REPORT-NARRATIVES (M): Generate narrative explanations of findings
    - Complexity: M | Cost of Delay: M | Dependencies: 025.0 | WSJF: 1.00
  - 039.1-STU-REPORT-LESSONS (S): Extract key lessons and learning points
    - Complexity: S | Cost of Delay: S | Dependencies: 039.0 | WSJF: 1.00
  - 039.2-STU-REPORT-REFERENCES (M): Include references to original research papers
    - Complexity: M | Cost of Delay: S | Dependencies: 039.0 | WSJF: 0.67

- **Workflow Management** (1 story, 3 points):
  - 040.0-STU-ITERATE-TUTORIALS (M): Interactive tutorials for common tasks
    - Complexity: M | Cost of Delay: M | Dependencies: 035.0 | WSJF: 1.00

**Total**: 9 stories (24 points) supporting educational use cases

**Prioritization Summary**:

1. **High Priority (WSJF 1.5)**: Examples and defaults get students started quickly
2. **Medium Priority (WSJF 1.0)**: Interpretations and tutorials support learning
3. **Enhancement (WSJF 0.67)**: References and guided workflows add depth

**Dependency Chain**:

```
020.0 (Design UI) ──→ 035.0 (Guided) ──┬──→ 035.1 (Examples)
                                        └──→ 040.0 (Tutorials)
021.0 (Config Presets) ──→ 036.0 (Defaults)
022.1 (Progress) ──→ 037.0 (Exec Explanations)
024.1 (Confidence Int) ──→ 038.0 (Stats Interpret)
025.0 (Report Charts) ──→ 039.0 (Narratives) ──┬──→ 039.1 (Lessons)
                                                 └──→ 039.2 (References)
```

---

## Key Questions for Researcher

### **Core Validation Questions:**

**Experiment Design:**

- Does the anchoring experiment prompt accurately replicate the Tversky/Kahneman methodology?
- Are the prompts clear enough that LLMs understand what's being asked?
- Should we randomize the order of the two questions (anchor comparison vs. estimation)?

**Model Selection:**

- Which OpenAI model should be the default (GPT-4, GPT-3.5-turbo)?
- Do we need to support legacy models or focus on current offerings?
- What authentication method should we prioritize (API keys, OAuth)?

**Execution Management:**

- How many runs per condition constitute adequate statistical power?
- What timeout values are appropriate for API calls?
- Should failed runs be excluded or retried automatically?

**Statistical Analysis:**

- What p-value threshold should indicate significance (0.05, 0.01)?
- Are one-tailed or two-tailed tests more appropriate for anchoring?
- What effect size constitutes a "meaningful" bias (Cohen's d > 0.5)?

### **Multi-Model Comparison Questions:**

**Model Selection:**

- Which Anthropic model should we support (Claude 3.5 Sonnet, Claude 3 Opus)?
- For Ollama, which local models are most relevant (Llama 2, Mistral)?
- Should we support custom/fine-tuned models?

**Statistical Analysis:**

- How should we handle models with different response characteristics (length, style)?
- What statistical test is most appropriate for comparing multiple models (ANOVA, Kruskal-Wallis)?
- Should we adjust for multiple comparisons (Bonferroni correction)?

### **Experiment Library Questions:**

**Experiment Design:**

- Which cognitive biases are highest priority after anchoring?
- Do we need to support within-subjects designs or only between-subjects?
- How should we handle experiments requiring multiple rounds of interaction?

**Data Extraction:**

- What parsing strategies work best for categorical responses (keywords, sentiment)?
- How should we handle ambiguous or unexpected LLM responses?
- Should we validate responses for coherence before including in analysis?

### **Enhanced Research Experience Questions:**

**Reporting & Visualization:**

- What chart types are most useful for bias research (violin plots, forest plots)?
- What export formats are most compatible with research workflows (CSV, SPSS, R)?
- Should reports follow a specific publication style guide (APA, IEEE)?

**Workflow Management:**

- What metadata should be captured for experiment reproducibility?
- How long should experiment history be retained?
- Should we support experiment versioning?

### **Extensibility Framework Questions:**

**Experiment Design:**

- What should the minimal experiment template interface include?
- How should we validate that custom experiments follow sound methodology?
- Should we support experiment composition (combining multiple biases)?

**Model Selection:**

- What capabilities must model plugins provide (streaming, embeddings)?
- How should we handle provider-specific features (temperature, top-p)?
- Should we support local-only models for sensitive research?

### **Educational Resources Questions:**

**Experiment Design:**

- What level of cognitive science background should we assume?
- Should tutorials cover experimental design methodology or just tool usage?
- How should we explain the ethical differences between LLM and human experiments?

**Reporting & Visualization:**

- How much statistical background should explanations assume?
- Should we provide templates for student lab reports?
- What level of detail in references is appropriate (citations, summaries, full papers)?

---

## Story Estimation Summary

### Complexity Distribution:

- **XS (1 point)**: 1 story - Quick configuration changes
- **S (2 points)**: 19 stories - Simple features, straightforward implementation
- **M (3 points)**: 39 stories - Moderate complexity, core functionality
- **L (5 points)**: 5 stories - Complex features requiring significant design
- **XL (8 points)**: 0 stories - No critically complex stories identified

### Cost of Delay Distribution:

- **XS (1 point)**: 0 stories - Nothing can wait indefinitely
- **S (2 points)**: 15 stories - Low urgency enhancements
- **M (3 points)**: 28 stories - Moderate value features
- **L (5 points)**: 15 stories - Important supporting features
- **XL (8 points)**: 6 stories - Critical path items (MVP core)

### WSJF Priority Tiers:

- **Critical (≥4.0)**: 1 story - Must implement immediately
- **High (2.5-2.99)**: 10 stories - Core infrastructure and critical features
- **Medium (1.0-2.49)**: 37 stories - Important enhancements and capabilities
- **Low (0.40-0.99)**: 16 stories - Nice-to-have features and polish

### Total Scope:

- **64 total stories**
- **188 total points** (assuming M=3, L=5, XL=8 conversion)
- **6 themes** organized by value delivery
- **8 journey steps** covering complete research workflow

### Implementation Recommendation:

1. **Week 1-2**: Core Validation theme (12 stories, 39 points) - Get to working MVP
2. **Week 3-4**: Multi-Model Comparison theme (8 stories, 24 points) - Enable comparative research
3. **Week 5-6**: Experiment Library theme (11 stories, 30 points) - Add variety and flexibility
4. **Week 7-8**: Enhanced Research Experience theme (13 stories, 32 points) - Professional quality
5. **Week 9-10**: Extensibility Framework theme (10 stories, 31 points) - Community growth
6. **Week 11-12**: Educational Resources theme (9 stories, 24 points) - Broaden audience

**Estimated Total**: 12 weeks to full-featured toolkit with all personas supported
