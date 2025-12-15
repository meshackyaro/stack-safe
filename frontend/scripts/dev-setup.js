#!/usr/bin/env node

/**
 * Development Setup Script
 * Helps developers get started with the StackSafe frontend
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require("path");

console.log("📚 StackSafe Frontend Setup\n");

// Check if .env.local exists
const envPath = path.join(__dirname, "..", ".env.local");
if (!fs.existsSync(envPath)) {
  console.log("❌ .env.local file not found!");
  console.log("Creating default .env.local file...\n");

  const defaultEnv = `# Stacks Network Configuration
# Reset for fresh deployment - update these values after deploying the contract
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=DEPLOY_CONTRACT_FIRST
NEXT_PUBLIC_CONTRACT_NAME=StackSafe

# Network URLs
NEXT_PUBLIC_STACKS_API_URL=https://api.testnet.hiro.so

# Deployment Instructions:
# 1. Deploy the contract using: clarinet deployments apply --testnet
# 2. Update NEXT_PUBLIC_CONTRACT_ADDRESS with the deployed contract address
# 3. Ensure NEXT_PUBLIC_NETWORK matches your deployment target (testnet/mainnet)`;

  fs.writeFileSync(envPath, defaultEnv);
  console.log("✅ Created .env.local with default testnet configuration");
} else {
  console.log("✅ .env.local file exists");
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, "..", "node_modules");
if (!fs.existsSync(nodeModulesPath)) {
  console.log("❌ Dependencies not installed");
  console.log("Run: npm install");
} else {
  console.log("✅ Dependencies installed");
}

console.log("\n📋 Next Steps:");
console.log("1. Deploy contract: clarinet deployments apply --testnet");
console.log("2. Update .env.local with deployed contract address");
console.log("3. Start frontend: npm run dev");
console.log("4. Open http://localhost:3000");

console.log("\n🔧 Configuration:");
console.log("- Network: testnet (api.testnet.hiro.so)");
console.log("- Contract: StackSafe (needs deployment)");
console.log("- Frontend: localhost:3000");

console.log("\n💡 Tips:");
console.log("- Install Hiro Wallet browser extension");
console.log("- Switch wallet to testnet mode");
console.log("- Use testnet STX for testing");
console.log("- Check console for any errors");

console.log("\n🎯 Ready to build! 🚀");
