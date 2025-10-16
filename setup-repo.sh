#!/bin/bash

# CourtSide Mobile App - Repository Setup Script

echo "🏀 Setting up CourtSide Mobile App Repository..."

# Check if required tools are installed
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    else
        echo "✅ $1 is installed"
    fi
}

echo "Checking required tools..."
check_tool "node"
check_tool "npm"
check_tool "git"

# Install global dependencies if not present
echo "Installing global dependencies..."
npm list -g @expo/cli &> /dev/null || npm install -g @expo/cli
npm list -g eas-cli &> /dev/null || npm install -g eas-cli
npm list -g firebase-tools &> /dev/null || npm install -g firebase-tools

# Install project dependencies
echo "Installing project dependencies..."
npm install

# Initialize git if not already done
if [ ! -d ".git" ]; then
    echo "Initializing git repository..."
    git init
fi

# Add all files and make initial commit
echo "Making initial commit..."
git add .
git commit -m "Initial commit: CourtSide mobile app setup" || echo "Files already committed"

echo "🎉 Repository setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a GitHub repository and push your code:"
echo "   gh repo create your-username/courtside-mobile-app --public --push"
echo ""
echo "2. Set up Expo project:"
echo "   expo login"
echo "   eas build:configure"
echo ""
echo "3. Set up Firebase:"
echo "   firebase login"
echo "   firebase init"
echo ""
echo "4. Configure GitHub secrets in your repository settings:"
echo "   - EXPO_TOKEN"
echo "   - FIREBASE_TOKEN"
echo "   - APPLE_ID (for iOS)"
echo "   - APPLE_APP_SPECIFIC_PASSWORD (for iOS)"
echo "   - GOOGLE_SERVICE_ACCOUNT_KEY (for Android)"
echo ""
echo "5. Create environment files (.env.development, .env.production)"
echo ""
echo "📖 See DEPLOYMENT.md for detailed instructions"