# bAIs Paper Build
# Can't build PDF without passing all pre-publication checks

.PHONY: all clean checks pdf

all: pdf

# Checks must pass before PDF can be built
checks:
	@echo "🔬 Running pre-publication checks..."
	@cd .. && ./scripts/pre-submit.sh
	@echo "✅ All checks passed"

# PDF depends on checks passing
pdf: checks main.tex references.bib
	@echo "📄 Building PDF..."
	pdflatex -interaction=nonstopmode main.tex
	bibtex main
	pdflatex -interaction=nonstopmode main.tex
	pdflatex -interaction=nonstopmode main.tex
	@echo "✅ PDF built: main.pdf"

# Quick build without checks (for iteration only, NOT for submission)
quick:
	@echo "⚠️  Quick build - NO CHECKS (do not submit!)"
	pdflatex -interaction=nonstopmode main.tex

clean:
	rm -f *.aux *.bbl *.blg *.log *.out *.toc *.pdf

# Alias for clarity
paper: pdf

help:
	@echo "Usage:"
	@echo "  make        - Run checks, then build PDF"
	@echo "  make checks - Run pre-publication checks only"
	@echo "  make quick  - Build PDF without checks (iteration only)"
	@echo "  make clean  - Remove build artifacts"
