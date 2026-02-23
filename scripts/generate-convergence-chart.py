#!/usr/bin/env python3
"""Generate convergence-by-technique bar chart for paper (backup, PGFPlots is canonical)."""

import matplotlib.pyplot as plt
import matplotlib
matplotlib.use('Agg')

# Data from our analysis - EXCLUDING Outside View (confounded)
techniques = ['Full SACD', 'Premortem', 'Random\nControl', "Devil's\nAdvocate"]
convergence = [24, 10, 9, 2]
colors = ['#2ecc71' if v > 5 else '#f39c12' if v > 0 else '#e74c3c' for v in convergence]

# Significance markers
sig = ['***', '*', '*', 'ns']

fig, ax = plt.subplots(figsize=(7, 5))

bars = ax.bar(techniques, convergence, color=colors, edgecolor='black', linewidth=0.5)

# Add value labels on bars
for bar, val, s in zip(bars, convergence, sig):
    height = bar.get_height()
    label = f'+{val}%\n{s}'
    ax.annotate(label, xy=(bar.get_x() + bar.get_width()/2, height),
                xytext=(0, 3), textcoords='offset points',
                ha='center', va='bottom', fontsize=10, fontweight='bold')

ax.axhline(y=0, color='black', linewidth=0.8)
ax.set_ylabel('Baseline Convergence (%)', fontsize=12)
ax.set_xlabel('Debiasing Technique', fontsize=12)
ax.set_ylim(-5, 35)
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
print("Charts saved to paper/figures/ (4 techniques, Outside View excluded)")
