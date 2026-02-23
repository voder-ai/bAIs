#!/usr/bin/env python3
"""Generate convergence-by-technique bar chart for paper."""

import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')

# Data from our analysis (baseline convergence %)
techniques = ['Full SACD', 'Premortem', 'Random\nControl', "Devil's\nAdvocate", 'Outside\nView']
convergence = [24, 10, 9, 2, -22]
colors = ['#2ecc71' if v > 0 else '#e74c3c' for v in convergence]

# Significance markers
sig = ['***', '*', '*', 'ns', '***']

fig, ax = plt.subplots(figsize=(8, 5))

bars = ax.bar(techniques, convergence, color=colors, edgecolor='black', linewidth=0.5)

# Add value labels on bars
for bar, val, s in zip(bars, convergence, sig):
    height = bar.get_height()
    label = f'{val:+d}%\n{s}'
    va = 'bottom' if height >= 0 else 'top'
    offset = 1 if height >= 0 else -1
    ax.annotate(label, xy=(bar.get_x() + bar.get_width()/2, height),
                xytext=(0, offset * 3), textcoords='offset points',
                ha='center', va=va, fontsize=10, fontweight='bold')

ax.axhline(y=0, color='black', linewidth=0.8)
ax.set_ylabel('Baseline Convergence (%)', fontsize=12)
ax.set_xlabel('Debiasing Technique', fontsize=12)
ax.set_ylim(-35, 35)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)

# Add note about significance
ax.text(0.98, 0.02, '*** p<0.001, * p<0.05, ns = not significant',
        transform=ax.transAxes, ha='right', va='bottom', fontsize=8, style='italic')

plt.tight_layout()
plt.savefig('/mnt/openclaw-data/workspace/bAIs/paper/figures/convergence-by-technique.pdf', 
            bbox_inches='tight', dpi=300)
plt.savefig('/mnt/openclaw-data/workspace/bAIs/paper/figures/convergence-by-technique.png', 
            bbox_inches='tight', dpi=300)
print("Charts saved to paper/figures/")
