# Conclusions Draft

## For Section 6: Conclusions

---

\section{Conclusions}

This study presents the largest systematic evaluation of cognitive debiasing techniques for large language models to date, comprising \textbf{14,220 trials} across 11 models from 4 providers. Our findings challenge the assumption that debiasing techniques validated on humans will transfer reliably to LLMs.

\subsection{Key Findings}

\textbf{Finding 1: Human cognitive biases transfer to LLMs.} All 11 models exhibited significant anchoring effects, confirming prior work on LLM susceptibility to cognitive biases. However, the \emph{patterns} of susceptibility varied substantially—from classic bidirectional anchoring (GPT-5.2) to compression toward fixed priors (Opus 4.6) to asymmetric responses (o3).

\textbf{Finding 2: Human debiasing techniques do not reliably transfer.} While techniques from Sibony's decision hygiene framework showed positive effects in aggregate, effectiveness varied dramatically by model:
\begin{itemize}
\item Outside View improved all 11 models (100\% success rate)
\item Devil's Advocate improved 10/11 models
\item Iterative SACD improved only 7/11 models, with 4 showing \emph{backfire effects}
\item Premortem improved 8/11 models, with 3 backfiring
\end{itemize}

\textbf{Finding 3: Approximately 50\% of debiasing effects are structural.} By introducing Random Control—additional conversation turns with irrelevant content—we decomposed debiasing effects into structural and content components. The structural effect of additional turns alone improved 10/11 models, accounting for roughly half of observed technique effects. This has significant implications for evaluating any multi-turn debiasing intervention.

\textbf{Finding 4: Model capability inversely correlates with iterative debiasing effectiveness.} The ``cheapest'' model (Haiku 4.5) showed the strongest response to iterative SACD (-21.5 months toward baseline), while flagship models (Opus 4.6, GPT-5.2) showed backfire effects (+2.7 to +4.5 months). This contradicts the intuition that more capable models would be more amenable to metacognitive correction.

We hypothesize an \emph{ironic process}: flagship models are better at \emph{justifying} their initial responses, so when prompted to reconsider, they rationalize rather than correct. The same capability that makes them more articulate makes them more resistant to self-correction—they construct more convincing arguments for why the anchor-influenced response was correct all along.

\textbf{Finding 5: More reasoning does not produce better calibration.} Models optimized for extended reasoning (o3) showed mixed debiasing responses, and in some conditions, reasoning amplified rather than corrected anchor bias. This aligns with recent findings from prediction market studies showing reasoning enhancement does not guarantee improved judgment \citep{schoenegger2025kalshi}.

\subsection{Practical Recommendations}

For practitioners deploying LLMs in decision-support contexts, we recommend a tiered approach:

\begin{enumerate}
\item \textbf{Always apply}: Outside View (``What typically happens in similar cases?'')—the only universally safe intervention across all tested models.

    \item \textbf{Consider applying}: Devil's Advocate (``What arguments oppose this conclusion?'')—robust across most models with no observed backfires.

    \item \textbf{Apply with caution}: Additional conversation turns—provides structural debiasing benefit but adds latency and cost.

    \item \textbf{Validate before applying}: Iterative SACD, Premortem—these techniques can produce \emph{worse} outcomes than no intervention on certain models (Opus 4.6, GPT-5.2, GLM-5, o3). Per-deployment validation is mandatory.

\end{enumerate}

\textbf{Critical warning}: Do not assume that techniques effective on one model will transfer to another. Our results show that Haiku 4.5 and Opus 4.6—models from the same provider (Anthropic) with shared architectural lineage—respond to iterative SACD in opposite directions (-21.5mo vs +4.5mo).

\subsection{Limitations and Future Work}

Our study focuses on a single bias type (anchoring) in a single domain (judicial sentencing). While anchoring is well-documented and our scenario is grounded in Englich et al.'s validated paradigm, generalization to other biases (framing, confirmation, availability) and domains (medical, financial, technical) requires additional study.

The Random Control structural effect varies substantially by model (-13.2mo to +2.9mo, median $\approx$-6mo). Future work should investigate what drives this variance—whether it reflects model-specific attention patterns, instruction-following calibration, or other architectural factors.

Temperature effects showed non-monotonic patterns in some models (Opus 4.6 performed worst at t=0.7, better at both t=0 and t=1). Fine-grained temperature analysis across the full model set is left for future work.

\subsection{Concluding Remarks}

The central contribution of this work is a sobering one: \textbf{debiasing LLMs is harder than debiasing humans}. The same cognitive techniques that reliably improve human judgment can actively harm LLM judgment when applied naively. The assumption that human psychology insights transfer to language models—plausible given that LLMs are trained on human-generated text—does not hold for debiasing interventions.

For high-stakes deployment contexts, this implies that per-model, per-domain validation of any debiasing technique is not optional—it is mandatory. The Outside View remains the only technique we can recommend without qualification. Everything else requires empirical verification.

---

## Notes for integration:

- Replace or update existing Section 6 (Conclusions)
- Ensure Kalshi citation (schoenegger2025kalshi) is present
- Cross-reference Section 4 (Results) and Section 5 (Discussion) as needed
- Consider adding "Future Work" as separate subsection if space permits
