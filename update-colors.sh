#!/bin/bash

# Replace all hardcoded colors with monotone equivalents in src directory

echo "Updating colors to monotone theme..."

# Find all TypeScript/TSX files in src
find src -type f \( -name "*.ts" -o -name "*.tsx" \) ! -path "*/node_modules/*" ! -path "*/__tests__/*" | while read file; do
  # Skip if file doesn't exist or is empty
  [ -f "$file" ] || continue
  
  # Replace purple primary colors
  sed -i '' 's/#6200ee/#000000/g' "$file" 2>/dev/null || sed -i 's/#6200ee/#000000/g' "$file"
  sed -i '' "s/color: '#6200ee'/color: '#000000'/g" "$file" 2>/dev/null || sed -i "s/color: '#6200ee'/color: '#000000'/g" "$file"
  
  # Replace gray text colors
  sed -i '' 's/#757575/#6B7280/g' "$file" 2>/dev/null || sed -i 's/#757575/#6B7280/g' "$file"
  sed -i '' 's/#9e9e9e/#9CA3AF/g' "$file" 2>/dev/null || sed -i 's/#9e9e9e/#9CA3AF/g' "$file"
  sed -i '' 's/#bdbdbd/#D1D5DB/g' "$file" 2>/dev/null || sed -i 's/#bdbdbd/#D1D5DB/g' "$file"
  
  # Replace background colors
  sed -i '' 's/#f5f5f5/#FFFFFF/g' "$file" 2>/dev/null || sed -i 's/#f5f5f5/#FFFFFF/g' "$file"
  sed -i '' 's/#e3f2fd/#F9FAFB/g' "$file" 2>/dev/null || sed -i 's/#e3f2fd/#F9FAFB/g' "$file"
  sed -i '' 's/#e1bee7/#F3F4F6/g' "$file" 2>/dev/null || sed -i 's/#e1bee7/#F3F4F6/g' "$file"
  
  # Replace blue colors
  sed -i '' 's/#1976d2/#000000/g' "$file" 2>/dev/null || sed -i 's/#1976d2/#000000/g' "$file"
  sed -i '' 's/#2196f3/#000000/g' "$file" 2>/dev/null || sed -i 's/#2196f3/#000000/g' "$file"
  
  # Replace specific UI element colors
  sed -i '' 's/#424242/#374151/g' "$file" 2>/dev/null || sed -i 's/#424242/#374151/g' "$file"
  
done

echo "Color replacement complete!"
