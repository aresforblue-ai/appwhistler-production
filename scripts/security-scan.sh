#!/bin/bash
# Security Scan Script for AppWhistler
# Run this script before making the repository public
#
# NOTE: This is a basic scanner for common issues. For comprehensive security
# scanning, consider using specialized tools like:
# - TruffleHog (secrets detection): https://github.com/trufflesecurity/trufflehog
# - detect-secrets: https://github.com/Yelp/detect-secrets
# - GitGuardian: https://www.gitguardian.com/
# - GitHub Advanced Security (for organizations)

set -e

echo "=========================================="
echo "AppWhistler Security Pre-Launch Scan"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
ERRORS=0
WARNINGS=0

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: Please run this script from the repository root${NC}"
    exit 1
fi

echo "1. Checking for tracked .env files..."
if git ls-files | grep -q "^\.env$"; then
    echo -e "${RED}✗ CRITICAL: .env file is tracked in git!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ .env file is not tracked${NC}"
fi

if git ls-files | grep -q "backend/\.env$"; then
    echo -e "${RED}✗ CRITICAL: backend/.env file is tracked in git!${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ backend/.env file is not tracked${NC}"
fi

echo ""
echo "2. Checking for sensitive files in git..."
SENSITIVE_FILES=$(git ls-files | grep -E '(secret|credential|password|private.*key|\.pem|\.key|\.cert|\.p12)' | grep -v node_modules | grep -v package-lock.json || true)
if [ -n "$SENSITIVE_FILES" ]; then
    echo -e "${YELLOW}⚠ Warning: Potentially sensitive files found:${NC}"
    echo "$SENSITIVE_FILES"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓ No obvious sensitive files in git${NC}"
fi

echo ""
echo "3. Checking for hardcoded secrets in code..."
# Check for common patterns (excluding node_modules, test files, and example/fixture files)
SECRET_PATTERNS=$(grep -r -i -E "api[_-]?key.*['\"][a-zA-Z0-9]{20,}['\"]|password.*['\"][^'\"]{8,}['\"]|secret.*['\"][a-zA-Z0-9]{20,}['\"]" \
    --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" \
    --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
    --exclude="*.test.js" --exclude="*.spec.js" --exclude="*.example" --exclude="*.fixture.js" --exclude="*.mock.js" --exclude="*.dev.js" \
    . 2>/dev/null | grep -viE "password.*test|secret.*dev|api[_-]?key.*test|api[_-]?key.*example" || true)

if [ -n "$SECRET_PATTERNS" ]; then
    echo -e "${YELLOW}⚠ Warning: Potential hardcoded secrets found (verify these are test values):${NC}"
    echo "$SECRET_PATTERNS" | head -10
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓ No obvious hardcoded secrets found${NC}"
fi

echo ""
echo "4. Checking for TODO/FIXME with internal references..."
INTERNAL_REFS=$(grep -r -i "TODO\|FIXME" --include="*.js" --include="*.jsx" --include="*.md" \
    --exclude-dir=node_modules --exclude-dir=.git \
    . 2>/dev/null | grep -i "internal\|private\|confidential" || true)

if [ -n "$INTERNAL_REFS" ]; then
    echo -e "${YELLOW}⚠ Warning: TODO/FIXME with internal references found:${NC}"
    echo "$INTERNAL_REFS" | head -5
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓ No TODOs with internal references${NC}"
fi

echo ""
echo "5. Checking npm dependencies for vulnerabilities..."
echo "   Frontend dependencies:"
if npm audit --audit-level=high --production > /dev/null 2>&1; then
    echo -e "${GREEN}   ✓ No high/critical vulnerabilities in production dependencies${NC}"
else
    echo -e "${YELLOW}   ⚠ Vulnerabilities found in dependencies${NC}"
    npm audit --audit-level=high --production
    WARNINGS=$((WARNINGS + 1))
fi

if [ -d "backend" ]; then
    echo "   Backend dependencies:"
    cd backend
    if npm audit --audit-level=high --production > /dev/null 2>&1; then
        echo -e "${GREEN}   ✓ No high/critical vulnerabilities in backend production dependencies${NC}"
    else
        echo -e "${YELLOW}   ⚠ Vulnerabilities found in backend dependencies${NC}"
        npm audit --audit-level=high --production
        WARNINGS=$((WARNINGS + 1))
    fi
    cd ..
fi

echo ""
echo "6. Checking for .env.example files..."
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓ .env.example exists${NC}"
else
    echo -e "${RED}✗ .env.example is missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "backend/.env.example" ]; then
    echo -e "${GREEN}✓ backend/.env.example exists${NC}"
else
    echo -e "${YELLOW}⚠ backend/.env.example is missing${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "7. Checking for security documentation..."
if [ -f "SECURITY.md" ]; then
    echo -e "${GREEN}✓ SECURITY.md exists${NC}"
else
    echo -e "${RED}✗ SECURITY.md is missing${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "LICENSE" ]; then
    echo -e "${GREEN}✓ LICENSE file exists${NC}"
else
    echo -e "${YELLOW}⚠ LICENSE file is missing${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "8. Checking git history for .env commits..."
ENV_COMMITS=$(git log --all --oneline -- .env 2>/dev/null | wc -l)
BACKEND_ENV_COMMITS=$(git log --all --oneline -- backend/.env 2>/dev/null | wc -l)
if [ "$ENV_COMMITS" -gt 0 ] || [ "$BACKEND_ENV_COMMITS" -gt 0 ]; then
    echo -e "${RED}✗ CRITICAL: .env file(s) found in git history${NC}"
    if [ "$ENV_COMMITS" -gt 0 ]; then
        echo "   .env: $ENV_COMMITS commits"
        git log --all --oneline -- .env | head -5
    fi
    if [ "$BACKEND_ENV_COMMITS" -gt 0 ]; then
        echo "   backend/.env: $BACKEND_ENV_COMMITS commits"
        git log --all --oneline -- backend/.env | head -5
    fi
    echo -e "${RED}   ACTION REQUIRED: Clean git history before going public!${NC}"
    echo "   Consider using: git filter-repo --path .env --path backend/.env --invert-paths"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓ .env files not found in git history${NC}"
fi

echo ""
echo "9. Checking for console.log statements..."
CONSOLE_LOGS=$(grep -r "console\.log\|console\.debug" --include="*.js" --include="*.jsx" \
    --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
    --exclude="*.test.js" --exclude="*.spec.js" \
    . 2>/dev/null | wc -l)

if [ "$CONSOLE_LOGS" -gt 10 ]; then
    echo -e "${YELLOW}⚠ Warning: $CONSOLE_LOGS console.log statements found${NC}"
    echo "   Consider removing debug logs before production"
    WARNINGS=$((WARNINGS + 1))
else
    echo -e "${GREEN}✓ Minimal console.log usage ($CONSOLE_LOGS found)${NC}"
fi

echo ""
echo "10. Checking .gitignore coverage..."
GITIGNORE_ITEMS=(".env" "node_modules" "dist" "build" "*.log" ".DS_Store")
MISSING_ITEMS=()

for item in "${GITIGNORE_ITEMS[@]}"; do
    # Use git check-ignore for accurate testing
    if command -v git >/dev/null 2>&1 && [ -d .git ]; then
        # Create a temporary test file for the pattern
        TESTFILE="/tmp/gitignore_test_${RANDOM}_${item//[\*\/]/_}"
        touch "$TESTFILE"
        
        # Test if git would ignore this file
        if ! git check-ignore -q "$TESTFILE" 2>/dev/null; then
            # Fallback: check if pattern exists in .gitignore
            if ! grep -q "${item}" .gitignore 2>/dev/null; then
                MISSING_ITEMS+=("$item")
            fi
        fi
        rm -f "$TESTFILE"
    else
        # Fallback: just check if pattern exists in .gitignore
        if ! grep -q "${item}" .gitignore 2>/dev/null; then
            MISSING_ITEMS+=("$item")
        fi
    fi
done

if [ ${#MISSING_ITEMS[@]} -eq 0 ]; then
    echo -e "${GREEN}✓ .gitignore has essential patterns${NC}"
else
    echo -e "${YELLOW}⚠ Warning: .gitignore missing patterns: ${MISSING_ITEMS[*]}${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "=========================================="
echo "Scan Complete"
echo "=========================================="
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}ERRORS: $ERRORS${NC}"
    echo -e "${RED}❌ Repository is NOT ready to go public${NC}"
    echo "   Please address all errors before making the repository public."
    echo ""
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}WARNINGS: $WARNINGS${NC}"
    echo -e "${YELLOW}⚠ Repository has warnings but may be acceptable to go public${NC}"
    echo "   Review warnings and address if necessary."
    echo ""
    exit 0
else
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo -e "${GREEN}Repository appears ready to go public${NC}"
    echo ""
    echo "Final steps:"
    echo "1. Review PRE_LAUNCH_CHECKLIST.md"
    echo "2. Configure GitHub branch protection rules (see GITHUB_SETUP.md)"
    echo "3. Enable security features in GitHub settings"
    echo "4. Make repository public: Settings → Danger Zone → Change visibility"
    echo ""
    exit 0
fi
