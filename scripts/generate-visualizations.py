#!/usr/bin/env python3
"""
Generate visualizations for bAIs anchoring bias paper
"""
import json
import os
from pathlib import Path
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import numpy as np

RESULTS_DIR = Path('results')

def load_jsonl(filepath):
    """Load JSONL file and return list of dicts"""
    if not filepath.exists():
        return []
    with open(filepath) as f:
        return [json.loads(line) for line in f if line.strip()]

def mean(arr):
    """Calculate mean of array, handling empty arrays"""
    valid = [x for x in arr if x is not None]
    return sum(valid) / len(valid) if valid else float('nan')

def normalize_model_name(name):
    """Normalize model name for matching"""
    return name.split('/')[-1].replace('.', '-').lower()

def load_all_data():
    """Load all trial data from results directory"""
    data = {}
    model_full_names = {}  # Map normalized name to full name
    
    # Load anchor values for baseline means
    anchor_path = RESULTS_DIR / 'anchor-values.json'
    if anchor_path.exists():
        with open(anchor_path) as f:
            anchor_values = json.load(f)
            for m in anchor_values:
                short_name = normalize_model_name(m['model'])
                model_full_names[short_name] = m['model']
                data[short_name] = {
                    'baseline': m.get('meanOverall', 0),
                    'low_anchor': m.get('lowAnchor', 0),
                    'high_anchor': m.get('highAnchor', 0),
                    'low_mean': [],
                    'high_mean': [],
                    'sacd_low': [],
                    'sacd_high': [],
                }
    
    # Load low anchor trials
    for f in RESULTS_DIR.glob('low-anchor-*.jsonl'):
        trials = load_jsonl(f)
        for t in trials:
            if t.get('sentenceMonths') is None:
                continue
            model = normalize_model_name(t['model'])
            if model in data:
                data[model]['low_mean'].append(t['sentenceMonths'])
    
    # Load high anchor trials
    high_dir = RESULTS_DIR / 'high-anchor'
    if high_dir.exists():
        for f in high_dir.glob('*.jsonl'):
            trials = load_jsonl(f)
            for t in trials:
                if t.get('sentenceMonths') is None:
                    continue
                model = normalize_model_name(t['model'])
                if model in data:
                    data[model]['high_mean'].append(t['sentenceMonths'])
    
    # Load SACD trials
    for f in RESULTS_DIR.glob('sacd-*.jsonl'):
        trials = load_jsonl(f)
        for t in trials:
            # SACD uses 'debiasedSentence' not 'sentenceMonths'
            sentence = t.get('debiasedSentence') or t.get('sentenceMonths')
            if sentence is None:
                continue
            model = normalize_model_name(t['model'])
            if model not in data:
                continue
            # Determine if low or high anchor based on anchor value
            anchor = t.get('anchor', 0)
            low_anchor = data[model].get('low_anchor', 0)
            high_anchor = data[model].get('high_anchor', 0)
            if abs(anchor - low_anchor) < abs(anchor - high_anchor):
                data[model]['sacd_low'].append(sentence)
            else:
                data[model]['sacd_high'].append(sentence)
    
    return data

def create_anchoring_heatmap(data, output_path='figures/anchoring_heatmap.png'):
    """Create heatmap of anchoring effects across models"""
    os.makedirs('figures', exist_ok=True)
    
    models = sorted(data.keys())
    conditions = ['Low Anchor Effect', 'High Anchor Effect']
    
    # Build effect matrix
    effects = []
    for model in models:
        d = data[model]
        baseline = d['baseline']
        low_mean = mean(d['low_mean']) if d['low_mean'] else float('nan')
        high_mean = mean(d['high_mean']) if d['high_mean'] else float('nan')
        
        low_effect = low_mean - baseline if not np.isnan(low_mean) else 0
        high_effect = high_mean - baseline if not np.isnan(high_mean) else 0
        
        effects.append([low_effect, high_effect])
    
    effects = np.array(effects)
    
    # Create heatmap
    fig, ax = plt.subplots(figsize=(10, 8))
    
    # Custom colormap: blue (negative) -> white (0) -> red (positive)
    cmap = plt.cm.RdBu_r
    norm = mcolors.TwoSlopeNorm(vmin=-20, vcenter=0, vmax=20)
    
    im = ax.imshow(effects, cmap=cmap, norm=norm, aspect='auto')
    
    # Labels
    ax.set_xticks(range(len(conditions)))
    ax.set_xticklabels(conditions)
    ax.set_yticks(range(len(models)))
    ax.set_yticklabels(models)
    
    # Add values in cells
    for i in range(len(models)):
        for j in range(len(conditions)):
            val = effects[i, j]
            text = f'{val:+.1f}mo' if not np.isnan(val) else 'N/A'
            color = 'white' if abs(val) > 10 else 'black'
            ax.text(j, i, text, ha='center', va='center', color=color, fontsize=9)
    
    plt.colorbar(im, label='Effect (months from baseline)')
    ax.set_title('Anchoring Effects Across Models\n(Negative = below baseline, Positive = above)')
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f'Saved: {output_path}')

def create_sacd_comparison(data, output_path='figures/sacd_comparison.png'):
    """Create bar chart comparing anchored vs SACD-debiased responses"""
    os.makedirs('figures', exist_ok=True)
    
    # Filter to models with SACD data
    models_with_sacd = [m for m in data.keys() 
                        if data[m]['sacd_low'] or data[m]['sacd_high']]
    
    if not models_with_sacd:
        print('No SACD data available for comparison chart')
        return
    
    models = sorted(models_with_sacd)
    
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    x = np.arange(len(models))
    width = 0.35
    
    for idx, (anchor_type, title) in enumerate([('low', 'Low Anchor'), ('high', 'High Anchor')]):
        ax = axes[idx]
        
        baselines = []
        anchored = []
        debiased = []
        
        for model in models:
            d = data[model]
            baselines.append(d['baseline'])
            
            if anchor_type == 'low':
                anchored.append(mean(d['low_mean']) if d['low_mean'] else float('nan'))
                debiased.append(mean(d['sacd_low']) if d['sacd_low'] else float('nan'))
            else:
                anchored.append(mean(d['high_mean']) if d['high_mean'] else float('nan'))
                debiased.append(mean(d['sacd_high']) if d['sacd_high'] else float('nan'))
        
        # Plot bars
        ax.bar(x - width/2, anchored, width, label='Anchored', color='#e74c3c', alpha=0.8)
        ax.bar(x + width/2, debiased, width, label='SACD Debiased', color='#3498db', alpha=0.8)
        
        # Add baseline line
        for i, b in enumerate(baselines):
            ax.hlines(b, i - 0.4, i + 0.4, colors='green', linestyles='--', linewidth=2)
        
        ax.set_xlabel('Model')
        ax.set_ylabel('Sentence (months)')
        ax.set_title(f'{title} Condition')
        ax.set_xticks(x)
        ax.set_xticklabels(models, rotation=45, ha='right')
        ax.legend()
        ax.axhline(y=0, color='gray', linewidth=0.5)
    
    # Add common legend for baseline
    fig.text(0.5, 0.02, '--- Green dashed line = baseline (no anchor)', 
             ha='center', fontsize=10, color='green')
    
    plt.suptitle('SACD Debiasing Effectiveness by Model', fontsize=14)
    plt.tight_layout()
    plt.subplots_adjust(bottom=0.15)
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f'Saved: {output_path}')

def create_model_taxonomy(data, output_path='figures/model_taxonomy.png'):
    """Create scatter plot showing model taxonomy by susceptibility pattern"""
    os.makedirs('figures', exist_ok=True)
    
    models = sorted(data.keys())
    
    fig, ax = plt.subplots(figsize=(10, 8))
    
    for model in models:
        d = data[model]
        baseline = d['baseline']
        
        low_mean = mean(d['low_mean']) if d['low_mean'] else baseline
        high_mean = mean(d['high_mean']) if d['high_mean'] else baseline
        
        low_effect = low_mean - baseline
        high_effect = high_mean - baseline
        
        ax.scatter(low_effect, high_effect, s=100, alpha=0.7)
        ax.annotate(model, (low_effect, high_effect), 
                   xytext=(5, 5), textcoords='offset points', fontsize=8)
    
    # Add quadrant lines
    ax.axhline(y=0, color='gray', linestyle='--', linewidth=1)
    ax.axvline(x=0, color='gray', linestyle='--', linewidth=1)
    
    # Quadrant labels
    ax.text(-15, 15, 'Asymmetric\n(low ↓, high ↑)', ha='center', fontsize=10, alpha=0.5)
    ax.text(15, 15, 'Classic Anchoring\n(both ↑ toward anchor)', ha='center', fontsize=10, alpha=0.5)
    ax.text(-15, -15, 'Compression\n(both ↓ toward low)', ha='center', fontsize=10, alpha=0.5)
    ax.text(15, -15, 'Reverse\n(low ↑, high ↓)', ha='center', fontsize=10, alpha=0.5)
    
    ax.set_xlabel('Low Anchor Effect (months from baseline)')
    ax.set_ylabel('High Anchor Effect (months from baseline)')
    ax.set_title('Model Taxonomy by Anchoring Pattern')
    
    # Equal aspect ratio
    max_range = max(abs(ax.get_xlim()[0]), abs(ax.get_xlim()[1]),
                    abs(ax.get_ylim()[0]), abs(ax.get_ylim()[1])) * 1.1
    ax.set_xlim(-max_range, max_range)
    ax.set_ylim(-max_range, max_range)
    
    plt.tight_layout()
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.close()
    print(f'Saved: {output_path}')

def main():
    print('Loading data...')
    data = load_all_data()
    print(f'Loaded data for {len(data)} models')
    
    print('\nGenerating visualizations...')
    create_anchoring_heatmap(data)
    create_sacd_comparison(data)
    create_model_taxonomy(data)
    
    print('\nDone!')

if __name__ == '__main__':
    main()
