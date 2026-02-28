#!/usr/bin/env python3
"""
Generate MAD comparison bar chart with bootstrap CIs for multi-domain study.
"""

import matplotlib.pyplot as plt
import numpy as np

# Data from bootstrap analysis (bootstrap-table-v-cis.ts output)
domains = ['Salary', 'Loan', 'Medical', 'DUI', 'Fraud', 'Theft']

# MAD values by technique (from bootstrap output)
data = {
    'baseline': [25.3, 105.4, 4.4, 22.0, 44.1, 24.1],
    'devils-advocate': [14.7, 54.3, 12.0, 19.0, 58.1, 29.9],
    'premortem': [15.4, 54.9, 7.0, 27.5, 45.2, 25.7],
    'sacd': [12.0, 56.1, 10.2, 20.7, 46.1, 26.2],
    'random-control': [13.6, 53.9, 3.1, 23.5, 49.1, 25.7],
}

# 95% CIs (lo, hi) by technique
cis = {
    'baseline': [(22.9, 27.5), (42.5, 892.3), (3.7, 5.5), (21.0, 23.2), (41.7, 46.4), (22.3, 26.1)],
    'devils-advocate': [(12.2, 17.6), (38.8, 60.5), (5.8, 25.2), (16.6, 21.2), (56.0, 60.1), (28.1, 31.8)],
    'premortem': [(12.9, 18.3), (41.1, 60.8), (6.3, 7.7), (26.2, 28.6), (43.0, 47.1), (24.4, 27.0)],
    'sacd': [(9.3, 14.8), (46.0, 63.8), (9.3, 11.1), (18.6, 22.6), (43.7, 48.4), (24.7, 27.7)],
    'random-control': [(11.1, 16.7), (37.7, 60.8), (2.6, 3.7), (22.3, 24.9), (47.4, 50.8), (24.5, 27.1)],
}

# Colors for techniques
colors = {
    'baseline': '#808080',  # Gray (no intervention)
    'devils-advocate': '#2ecc71',  # Green
    'premortem': '#3498db',  # Blue
    'sacd': '#e74c3c',  # Red (highlight SACD)
    'random-control': '#9b59b6',  # Purple
}

technique_labels = {
    'baseline': 'No Intervention',
    'devils-advocate': "Devil's Advocate",
    'premortem': 'Premortem',
    'sacd': 'SACD',
    'random-control': 'Random Control',
}

fig, axes = plt.subplots(2, 3, figsize=(14, 8))
axes = axes.flatten()

techniques = list(data.keys())
x = np.arange(len(techniques))
width = 0.6

for idx, (domain, ax) in enumerate(zip(domains, axes)):
    values = [data[t][idx] for t in techniques]
    yerr_lo = [data[t][idx] - cis[t][idx][0] for t in techniques]
    yerr_hi = [cis[t][idx][1] - data[t][idx] for t in techniques]
    
    # Cap loan domain y-axis (baseline has huge variance)
    if domain == 'Loan':
        # Truncate baseline CI for visualization
        values_capped = values.copy()
        yerr_hi_capped = yerr_hi.copy()
        if yerr_hi[0] > 100:  # baseline
            yerr_hi_capped[0] = 100
    else:
        values_capped = values
        yerr_hi_capped = yerr_hi
    
    bars = ax.bar(x, values_capped, width, 
                  color=[colors[t] for t in techniques],
                  yerr=[yerr_lo, yerr_hi_capped],
                  capsize=3,
                  error_kw={'elinewidth': 1, 'capthick': 1})
    
    # Highlight best technique
    best_idx = values.index(min(values))
    bars[best_idx].set_edgecolor('black')
    bars[best_idx].set_linewidth(2)
    
    ax.set_title(domain, fontsize=12, fontweight='bold')
    ax.set_ylabel('MAD (%)', fontsize=10)
    ax.set_xticks(x)
    ax.set_xticklabels([technique_labels[t] for t in techniques], rotation=45, ha='right', fontsize=8)
    
    # Add grid
    ax.yaxis.grid(True, linestyle='--', alpha=0.3)
    ax.set_axisbelow(True)

# Add legend
handles = [plt.Rectangle((0,0),1,1, color=colors[t], label=technique_labels[t]) for t in techniques]
fig.legend(handles=handles, loc='upper center', ncol=5, bbox_to_anchor=(0.5, 1.02), fontsize=9)

plt.suptitle('Debiasing Effectiveness by Domain: Mean Absolute Deviation from Baseline\n(Lower = Better; Error bars show 95% bootstrap CI)', 
             fontsize=12, y=1.08)

plt.tight_layout()
plt.savefig('paper/figures/mad-by-domain.png', dpi=150, bbox_inches='tight', facecolor='white')
plt.savefig('paper/figures/mad-by-domain.pdf', bbox_inches='tight', facecolor='white')
print('Saved: paper/figures/mad-by-domain.png and .pdf')

# Also create a heatmap version
fig2, ax2 = plt.subplots(figsize=(10, 6))

# Create matrix (domains × techniques)
matrix = np.array([[data[t][d] for t in techniques] for d in range(len(domains))])

im = ax2.imshow(matrix, cmap='RdYlGn_r', aspect='auto')

# Add text annotations
for i in range(len(domains)):
    for j in range(len(techniques)):
        val = matrix[i, j]
        # Mark best in row with asterisk
        is_best = val == min(matrix[i, :])
        text = f'{val:.1f}*' if is_best else f'{val:.1f}'
        color = 'white' if val > 50 else 'black'
        ax2.text(j, i, text, ha='center', va='center', fontsize=9, color=color)

ax2.set_xticks(np.arange(len(techniques)))
ax2.set_yticks(np.arange(len(domains)))
ax2.set_xticklabels([technique_labels[t] for t in techniques], rotation=45, ha='right')
ax2.set_yticklabels(domains)

ax2.set_title('MAD (%) by Domain × Technique\n(* = best in domain; lower = better)', fontsize=12)

cbar = plt.colorbar(im, ax=ax2, shrink=0.8)
cbar.set_label('MAD (%)', fontsize=10)

plt.tight_layout()
plt.savefig('paper/figures/mad-heatmap.png', dpi=150, bbox_inches='tight', facecolor='white')
plt.savefig('paper/figures/mad-heatmap.pdf', bbox_inches='tight', facecolor='white')
print('Saved: paper/figures/mad-heatmap.png and .pdf')
