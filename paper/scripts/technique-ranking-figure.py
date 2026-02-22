#!/usr/bin/env python3
"""
Generate technique ranking figure with Random Control baseline.

Usage: python technique-ranking-figure.py
Output: technique-ranking.png
"""

import matplotlib.pyplot as plt
import numpy as np

# Data from aggregate analysis
techniques = [
    'Outside View',
    'Devil\'s Advocate', 
    'Random Control',
    'Premortem',
    'Full SACD'
]

# Raw deltas (months toward baseline, negative = good)
raw_deltas = [-12.7, -8.2, -6.0, -3.5, -1.2]

# Models improved / total
improved = [11, 10, 10, 8, 7]
total = [11, 11, 11, 11, 11]

# Models that backfired
backfired = [0, 0, 1, 3, 4]

# Adjusted deltas (relative to Random Control)
random_control_effect = -6.0
adjusted_deltas = [d - random_control_effect for d in raw_deltas]
adjusted_deltas[2] = 0  # Random Control is the baseline

# Create figure
fig, ax = plt.subplots(figsize=(10, 6))

# Colors based on effectiveness
colors = ['#2ecc71', '#27ae60', '#95a5a6', '#e74c3c', '#c0392b']

# Bar positions
x = np.arange(len(techniques))
width = 0.6

# Plot bars
bars = ax.bar(x, raw_deltas, width, color=colors, edgecolor='black', linewidth=1.2)

# Add Random Control reference line
ax.axhline(y=random_control_effect, color='#3498db', linestyle='--', linewidth=2, 
           label=f'Random Control baseline ({random_control_effect}mo)')

# Labels and formatting
ax.set_xlabel('Debiasing Technique', fontsize=12, fontweight='bold')
ax.set_ylabel('Δ from Baseline (months)', fontsize=12, fontweight='bold')
ax.set_title('Debiasing Technique Effectiveness\n(14,220 trials across 11 models)', 
             fontsize=14, fontweight='bold')
ax.set_xticks(x)
ax.set_xticklabels(techniques, fontsize=10)

# Add value labels on bars
for bar, delta, imp, back in zip(bars, raw_deltas, improved, backfired):
    height = bar.get_height()
    label = f'{delta:.1f}mo\n({imp}/11 ✓'
    if back > 0:
        label += f', {back} ✗'
    label += ')'
    ax.annotate(label,
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, -15 if height < 0 else 5),
                textcoords="offset points",
                ha='center', va='top' if height < 0 else 'bottom',
                fontsize=9)

# Add legend
ax.legend(loc='lower right', fontsize=10)

# Grid
ax.yaxis.grid(True, linestyle=':', alpha=0.7)
ax.set_axisbelow(True)

# Adjust layout
plt.tight_layout()

# Save
plt.savefig('technique-ranking.png', dpi=150, bbox_inches='tight')
plt.savefig('technique-ranking.pdf', bbox_inches='tight')
print("Saved: technique-ranking.png, technique-ranking.pdf")

# Also create SACD model-dependency figure
fig2, ax2 = plt.subplots(figsize=(12, 6))

# SACD data by model
models = ['Haiku 4.5', 'o3', 'o4-mini', 'MiniMax', 'GPT-4.1', 
          'Sonnet', 'Kimi', 'DeepSeek', 'GPT-5.2', 'GLM-5', 'Opus 4.6']
sacd_deltas = [-21.5, -11.8, -7.4, -6.7, -2.7, -1.7, -1.2, 0.8, 2.7, 2.8, 4.5]

# Colors: green for debiasing, red for backfire
colors2 = ['#27ae60' if d < 0 else '#e74c3c' for d in sacd_deltas]

x2 = np.arange(len(models))
bars2 = ax2.bar(x2, sacd_deltas, 0.7, color=colors2, edgecolor='black', linewidth=1.2)

# Zero line
ax2.axhline(y=0, color='black', linestyle='-', linewidth=1)

# Labels
ax2.set_xlabel('Model', fontsize=12, fontweight='bold')
ax2.set_ylabel('SACD Effect (months)', fontsize=12, fontweight='bold')
ax2.set_title('Full SACD (Iterative) Effect by Model\nGreen = Debiasing, Red = Backfire', 
              fontsize=14, fontweight='bold')
ax2.set_xticks(x2)
ax2.set_xticklabels(models, fontsize=9, rotation=45, ha='right')

# Value labels
for bar, delta in zip(bars2, sacd_deltas):
    height = bar.get_height()
    ax2.annotate(f'{delta:+.1f}',
                xy=(bar.get_x() + bar.get_width() / 2, height),
                xytext=(0, 3 if height >= 0 else -12),
                textcoords="offset points",
                ha='center', va='bottom' if height >= 0 else 'top',
                fontsize=9, fontweight='bold')

ax2.yaxis.grid(True, linestyle=':', alpha=0.7)
ax2.set_axisbelow(True)

plt.tight_layout()
plt.savefig('sacd-model-dependency.png', dpi=150, bbox_inches='tight')
plt.savefig('sacd-model-dependency.pdf', bbox_inches='tight')
print("Saved: sacd-model-dependency.png, sacd-model-dependency.pdf")
