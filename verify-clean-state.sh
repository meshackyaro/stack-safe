#!/bin/bash

# Verification script to ensure all old deployment references are removed
# Run this before deploying to ensure clean state

echo "🧹 Verifying Clean State for Fresh Deployment"
echo "=============================================="
echo ""

ERRORS=0
WARNINGS=0

# Check 1: .env.local should have placeholder
echo "📋 Check 1: Frontend environment configuration"
if grep -q "DEPLOY_CONTRACT_FIRST" frontend/.env.local; then
    echo "✅ .env.local has placeholder address (not deployed yet)"
else
    echo "⚠️  .env.local has a contract address (might be from new deployment)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 2: Deployment plan should have placeholder
echo "📋 Check 2: Testnet deployment plan"
if grep -q "REPLACE_WITH_YOUR_TESTNET_ADDRESS" deployments/default.testnet-plan.yaml; then
    echo "✅ Deployment plan has placeholder address"
else
    echo "⚠️  Deployment plan has a specific address (might be configured for deployment)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Check 3: No verification file should exist
echo "📋 Check 3: Contract verification file"
if [ -f "frontend/.contract-verification.json" ]; then
    echo "❌ Old verification file still exists!"
    ERRORS=$((ERRORS + 1))
else
    echo "✅ No old verification file found"
fi
echo ""

# Check 4: No cache directory
echo "📋 Check 4: Cache directory"
if [ -d ".cache" ]; then
    echo "⚠️  Cache directory exists (will be regenerated on deployment)"
    WARNINGS=$((WARNINGS + 1))
else
    echo "✅ No cache directory found"
fi
echo ""

# Check 5: Contract compiles
echo "📋 Check 5: Contract compilation"
if clarinet check > /dev/null 2>&1; then
    echo "✅ Contract compiles successfully"
else
    echo "❌ Contract has compilation errors!"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# Check 6: No old addresses in test files
echo "📋 Check 6: Test files"
if grep -q "ST3QGZ6VKAQVFT5YFXWMDQGSXK1NVAH8DJ8S7M5SG" test-contract-reads.js 2>/dev/null; then
    echo "❌ Test file has old contract address!"
    ERRORS=$((ERRORS + 1))
elif grep -q "DEPLOY_CONTRACT_FIRST" test-contract-reads.js 2>/dev/null; then
    echo "✅ Test files have placeholder address (ready for deployment)"
else
    echo "✅ Test files are clean"
fi
echo ""

# Check 7: Frontend dependencies
echo "📋 Check 7: Frontend dependencies"
if [ -d "frontend/node_modules" ]; then
    echo "✅ Frontend dependencies installed"
else
    echo "⚠️  Frontend dependencies not installed (run: cd frontend && npm install)"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# Summary
echo "=============================================="
echo "📊 Verification Summary"
echo "=============================================="
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo "✅ Clean state verified! Ready for fresh deployment."
    echo ""
    echo "📝 Next Steps:"
    echo "1. Update deployments/default.testnet-plan.yaml with your deployer address"
    echo "2. Run: clarinet deployments apply --testnet"
    echo "3. Copy the deployed contract address"
    echo "4. Update frontend/.env.local with the contract address"
    echo "5. Run: cd frontend && npm run dev"
    echo ""
    echo "📚 See FRESH_DEPLOYMENT_GUIDE.md for detailed instructions"
    exit 0
else
    echo "❌ Clean state verification failed!"
    echo ""
    echo "Please fix the errors above before deploying."
    echo "Run this script again after fixing."
    exit 1
fi
