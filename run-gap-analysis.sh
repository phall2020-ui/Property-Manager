#!/bin/bash

# Functional Gap Analysis Runner
# Analyzes frontend, backend, and UI for functional gaps

echo "🔍 Property Manager - Functional Gap Analysis"
echo "=============================================="
echo ""

# Check if we're in the project root
if [ ! -f "analyze-functional-gaps.js" ]; then
    echo "❌ Error: analyze-functional-gaps.js not found"
    echo "   Please run this script from the project root directory"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "   Please install Node.js to run this analysis"
    exit 1
fi

# Run the analysis
echo "Running functional gap analysis..."
echo ""

node analyze-functional-gaps.js

# Check if the report was generated
if [ -f "FUNCTIONAL_GAP_ANALYSIS.md" ]; then
    echo ""
    echo "✅ Report generated successfully!"
    echo ""
    echo "📄 View the report at: FUNCTIONAL_GAP_ANALYSIS.md"
    echo ""
    echo "Next steps:"
    echo "  1. Review the report to understand the gaps"
    echo "  2. Prioritize high-impact issues"
    echo "  3. Create tasks to address the gaps"
    echo "  4. See GAP_ANALYSIS_README.md for detailed guidance"
    echo ""
else
    echo ""
    echo "❌ Error: Report generation failed"
    echo "   Check the output above for error messages"
    exit 1
fi
