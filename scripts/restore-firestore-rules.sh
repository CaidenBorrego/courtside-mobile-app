#!/bin/bash

# Script to restore production Firestore rules after seeding

echo "🔒 Restoring production Firestore rules..."

# Check if backup exists
if [ ! -f "firestore.rules.backup" ]; then
    echo "❌ Error: firestore.rules.backup not found"
    echo "Please manually restore your production rules"
    exit 1
fi

# Restore the backup
cp firestore.rules.backup firestore.rules

echo "✅ Rules file restored locally"

# Deploy to Firebase
echo "📤 Deploying rules to Firebase..."
firebase deploy --only firestore:rules

if [ $? -eq 0 ]; then
    echo "✅ Production rules restored successfully!"
    echo "🗑️  Cleaning up backup file..."
    rm firestore.rules.backup
    echo "✨ Done!"
else
    echo "❌ Error deploying rules. Backup file preserved at firestore.rules.backup"
    exit 1
fi
