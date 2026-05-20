#!/bin/bash
# Script om alle prestix verwijzingen te vervangen
# Usage: ./rename-prestix.sh

echo "=== Prestix → Hermes Rename Script ==="
echo ""

# Count occurrences
echo "Counting prestix references..."
PRESTIX_COUNT=$(grep -ri "prestix" src/ --include="*.ts" --include="*.tsx" --include="*.css" --include="*.json" | wc -l)
echo "Found $PRESTIX_COUNT references in src/"

# Replace in source files (case insensitive)
echo "Replacing prestix → hermes in source files..."
find src/ -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.css" -o -name "*.json" \) -exec sed -i 's/prestix/hermes/gI' {} +

# Replace in config files
echo "Replacing in config files..."
sed -i 's/prestix/hermes/gI' package.json 2>/dev/null
sed -i 's/prestix/hermes/gI' next.config.* 2>/dev/null
sed -i 's/prestix/hermes/gI' .env.local 2>/dev/null

# Replace in docs
echo "Replacing in docs..."
find docs/ -type f -name "*.md" -exec sed -i 's/prestix/hermes/gI' {} + 2>/dev/null

# Replace in scripts
echo "Replacing in scripts..."
find scripts/ -type f -name "*.py" -exec sed -i 's/prestix/hermes/gI' {} + 2>/dev/null
find scripts/ -type f -name "*.sh" -exec sed -i 's/prestix/hermes/gI' {} + 2>/dev/null

# Special cases: branding names
# PRESTIX.vip → HERMES.vip (but this might be a domain, so be careful)
# prestix.session → hermes.session
# prestix.admin_verified → hermes.admin_verified

echo ""
echo "Done! Verifying..."
NEW_COUNT=$(grep -ri "prestix" src/ --include="*.ts" --include="*.tsx" --include="*.css" --include="*.json" | wc -l)
echo "Remaining references: $NEW_COUNT"

if [ "$NEW_COUNT" -gt 0 ]; then
    echo ""
    echo "Remaining references:"
    grep -ri "prestix" src/ --include="*.ts" --include="*.tsx" --include="*.css" --include="*.json" | head -20
fi

echo ""
echo "=== Rename complete ==="
