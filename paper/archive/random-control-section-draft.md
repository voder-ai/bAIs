# Random Control Section Draft

## For insertion after "Orthogonal Control Dimensions" and before "Limitations"

---

\subsection{Decomposing Debiasing Effects: Structure vs. Content}
\label{sec:decomposition}

A critical methodological question arises when evaluating multi-turn debiasing techniques: how much of the observed improvement is due to the technique's \emph{content} versus the mere \emph{structure} of additional conversation turns?

To address this, we introduce a \textbf{Random Control} condition: participants receive the same number of turns as the debiasing techniques, but with domain-irrelevant content (unrelated elaboration prompts) instead of debiasing instructions. This isolates the structural effect of additional turns from the cognitive effect of technique content.

\subsubsection{Random Control Results}

Across 11 models and 2,068 trials, Random Control showed substantial debiasing effects independent of technique content:

\begin{table}[H]
\centering
\begin{tabular}{lcc}
\toprule
Model & Random Control $\Delta$ & Improved? \\
\midrule
Haiku 4.5 & -13.2mo & \checkmark \\
Sonnet 4.6 & -11.0mo & \checkmark \\
GPT-4.1 & -11.8mo & \checkmark \\
o4-mini & -8.0mo & \checkmark \\
MiniMax M2.5 & -6.2mo & \checkmark \\
GLM-5 & -4.6mo & \checkmark \\
o3 & -3.1mo & \checkmark \\
GPT-5.2 & -3.0mo & \checkmark \\
DeepSeek V3.2 & -2.8mo & \checkmark \\
Opus 4.6 & -1.8mo & \checkmark \\
Kimi K2.5 & +2.9mo & $\times$ \\
\bottomrule
\end{tabular}
\caption{Random Control effects by model. 10/11 models show improvement from additional turns alone, regardless of turn content.}
\end{table}

\textbf{Key finding}: Approximately 50\% of observed debiasing effects across all techniques are attributable to conversation structure alone, not technique content.

\subsubsection{Adjusted Technique Ranking}

Accounting for the Random Control baseline, we can decompose total debiasing effects into structural and content components:

\begin{table}[H]
\centering
\begin{tabular}{lccc}
\toprule
Technique & Raw $\Delta$ & Structure ($\approx$6mo) & Net Content Effect \\
\midrule
Outside View & -12.7mo & -6.0mo & \textbf{-6.7mo} \\
Devil's Advocate & -8.0mo & -6.0mo & -2.0mo \\
SACD (iterative) & varies & -6.0mo & model-dependent \\
Premortem & varies & -6.0mo & $\approx$0 to negative \\
\bottomrule
\end{tabular}
\caption{Debiasing effect decomposition. Outside View shows robust content effects beyond structural baseline.}
\end{table}

\textbf{Practical implication}: Outside View is the only technique showing robust content effects across all models. Other techniques (Premortem, SACD) may achieve their effects primarily through additional turns rather than cognitive intervention---and in some models, the technique content actively \emph{overcomes} the positive structural effect, producing net negative outcomes.

\subsubsection{Hierarchy of Safe Interventions}

Based on our complete dataset (n=14,220 trials), we propose a hierarchy of debiasing interventions ordered by reliability:

\begin{enumerate}
\item \textbf{Outside View} (11/11 models improved, 0 backfired)---universally safe
\item \textbf{Devil's Advocate} (10/11 improved, 0 backfired)---robust
\item \textbf{Additional turns} (10/11 improved, structural baseline)
\item \textbf{SACD} (7/11 improved, 4 backfired)---model-dependent
\item \textbf{Premortem} (8/11 improved, 3 backfired)---risky for overthinking models
\end{enumerate}

\textbf{Counterintuitive finding}: The simplest Sibony technique (Outside View: ``What typically happens in cases like this?'') outperforms more sophisticated interventions (Premortem, iterative self-correction). Models prone to overthinking (o3, Opus 4.6, GLM-5) show \emph{worse} outcomes with techniques that require extended deliberation.

This finding connects to recent work on reasoning model calibration \citep{schoenegger2025kalshi}, which found that GPT-5.2 with extended reasoning showed 3.3$\times$ \emph{worse} calibration than Opus despite reasoning enhancement. More thinking does not automatically produce better judgment.

---

## Notes for integration:

- Insert after Section 5.5 (Orthogonal Control Dimensions)
- Before current Limitations section
- Update trial counts in abstract to "n=14,220"
- Ensure Kalshi citation is in references.bib (added as schoenegger2025kalshi)
