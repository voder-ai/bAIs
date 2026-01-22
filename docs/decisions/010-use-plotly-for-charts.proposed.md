---
status: proposed
date: 2026-01-22
decision-makers: [voder]
consulted: [researcher-story.map.md, user preferences]
informed: []
---

# Use Plotly.js for Publication-Quality Charts

## Context and Problem Statement

The bAIs toolkit requires chart and visualization generation for publication-quality reports that researchers can include in academic papers and presentations.

Key visualization requirements from story map:

- Story 025.0-RES-REPORT-CHARTS: Generate publication-quality charts (bar, box plots, distributions)
- Story 025.3-RES-REPORT-PUBLICATION: Generate complete publication-ready report
- Story 039.0-STU-REPORT-NARRATIVES: Generate narrative explanations with visualizations
- Support for statistical visualizations (distributions, error bars, confidence intervals)
- Export to image formats (PNG, SVG) for publication
- Professional, publication-quality aesthetics
- Node.js/headless support (no browser required for CLI tool)

User response: "don't care" - selected Plotly.js as sensible default for research visualization needs.

## Decision Drivers

- Publication-quality output (professional appearance)
- Statistical chart types (box plots, violin plots, error bars, distributions)
- Export to image formats (PNG, SVG) for papers
- TypeScript support
- Node.js/headless rendering (no browser needed)
- Good documentation and examples
- Active maintenance
- Suitable for academic/research use

## Considered Options

- Plotly.js (comprehensive, publication-quality, research-focused)
- Chart.js with node-canvas (simple, lightweight)
- D3.js (powerful but complex)
- Vega/Vega-Lite (declarative, research-oriented)

## Decision Outcome

Chosen option: "Plotly.js" because it's specifically designed for scientific and statistical visualizations with publication-quality output. It natively supports all required statistical chart types (box plots, error bars, distributions) and can render in Node.js using plotly.js-dist-min and orca/kaleido for static image export. Its aesthetic defaults are professional and suitable for academic publications.

### Consequences

- Good, because designed for scientific/statistical visualizations
- Good, because native support for box plots, violin plots, error bars
- Good, because publication-quality defaults (professional appearance)
- Good, because exports to PNG, SVG, PDF for papers
- Good, because works in Node.js via plotly.js-dist-min
- Good, because TypeScript types available
- Good, because interactive charts can be embedded in HTML reports
- Good, because widely used in research community
- Bad, because larger bundle size than simpler alternatives
- Bad, because requires Kaleido for static image export (additional dependency)
- Neutral, because learning curve moderate (but good documentation)

### Confirmation

- [ ] `plotly.js-dist-min` package installed
- [ ] `kaleido` package installed for static image export
- [ ] TypeScript types for Plotly installed (`@types/plotly.js`)
- [ ] Can generate box plots, bar charts, distribution plots
- [ ] Can export charts to PNG and SVG formats
- [ ] Charts have publication-quality appearance
- [ ] No browser/DOM required for rendering

## Pros and Cons of the Options

### Plotly.js

- Good, because designed for scientific visualizations
- Good, because native statistical chart types (box, violin, error bars)
- Good, because publication-quality aesthetics
- Good, because exports to PNG/SVG/PDF
- Good, because works in Node.js (headless)
- Good, because interactive HTML charts option
- Good, because TypeScript types available
- Good, because widely used in research
- Bad, because larger bundle size
- Bad, because requires Kaleido for image export
- Bad, because some API complexity

### Chart.js with node-canvas

- Good, because simple and lightweight
- Good, because good documentation
- Good, because node-canvas for Node.js rendering
- Good, because TypeScript support
- Bad, because limited statistical chart types (no box plots, violin plots)
- Bad, because less suitable for publication quality
- Bad, because would need custom implementations for many charts
- Bad, because not designed for research/academic use

### D3.js

- Good, because extremely powerful and flexible
- Good, because can create any visualization
- Good, because publication-quality possible
- Good, because works in Node.js with jsdom
- Bad, because very complex (low-level API)
- Bad, because requires custom implementation for all charts
- Bad, because steep learning curve
- Bad, because slow development time
- Bad, because overkill for standard statistical charts

### Vega/Vega-Lite

- Good, because declarative specification (easy to understand)
- Good, because designed for research and data analysis
- Good, because publication-quality output
- Good, because exports to PNG/SVG
- Bad, because less flexible than Plotly for customization
- Bad, because smaller community than Plotly
- Bad, because TypeScript integration less mature
- Bad, because some advanced statistical plots require custom specs

## More Information

- Plotly.js documentation: https://plotly.com/javascript/
- Plotly.js GitHub: https://github.com/plotly/plotly.js
- Kaleido (image export): https://github.com/plotly/Kaleido
- Node.js usage: https://plotly.com/javascript/static-image-export/
- Related stories:
  - 025.0-RES-REPORT-CHARTS (chart generation)
  - 025.3-RES-REPORT-PUBLICATION (publication-ready reports)
  - 039.0-STU-REPORT-NARRATIVES (visualizations with narratives)
- Related decisions:
  - [001-use-typescript-with-esm.proposed.md](001-use-typescript-with-esm.proposed.md)
- Chart types needed:
  - Bar charts (group comparisons)
  - Box plots (distribution and outliers)
  - Violin plots (distribution shape)
  - Scatter plots (correlations)
  - Histograms (distributions)
  - Error bars (confidence intervals)
