/**
 * Script to check deposits directly from contract
 * Run this in browser console on the withdraw page
 */

async function checkDeposits() {
  console.log("=".repeat(60));
  console.log("🔍 CHECKING DEPOSITS DIRECTLY");
  console.log("=".repeat(60));

  // Get user address
  const userSession = localStorage.getItem("userSession");
  if (!userSession) {
    console.error("❌ No user session found");
    return;
  }

  const session = JSON.parse(userSession);
  const userAddress =
    session?.userData?.profile?.stxAddress?.testnet ||
    session?.userData?.profile?.stxAddress?.mainnet;

  console.log("👤 User Address:", userAddress);

  // Contract details
  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  const contractName = process.env.NEXT_PUBLIC_CONTRACT_NAME || "GrowFundz";

  console.log("📝 Contract:", `${contractAddress}.${contractName}`);
  console.log("\n" + "=".repeat(60));

  try {
    // Import required modules
    const { callReadOnlyFunction } = await import("./lib/contract.js");
    const { standardPrincipalCV, cvToJSON } = await import(
      "@stacks/transactions"
    );

    // Test 1: Check deposit counter
    console.log("\n📊 Test 1: Checking total deposit counter...");
    const counterResult = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: "get-deposit-counter",
      functionArgs: [],
    });
    const counter = cvToJSON(counterResult);
    console.log("Total deposits created:", counter.value);

    // Test 2: Check user deposit IDs
    console.log("\n📊 Test 2: Checking user deposit IDs...");
    const idsResult = await callReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: "get-user-deposit-ids",
      functionArgs: [standardPrincipalCV(userAddress)],
    });
    console.log("Raw result:", idsResult);
    console.log("Result value:", idsResult.value);
    const idsData = cvToJSON(idsResult);
    console.log("Parsed data:", idsData);

    // Test 3: Try to get deposit #1 directly
    console.log("\n📊 Test 3: Trying to get deposit #1 directly...");
    try {
      const deposit1Result = await callReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: "get-user-deposit",
        functionArgs: [standardPrincipalCV(userAddress), uintCV(1)],
      });
      console.log("Deposit #1 result:", deposit1Result);
      const deposit1Data = cvToJSON(deposit1Result);
      console.log("Deposit #1 data:", deposit1Data);
    } catch (e) {
      console.log("❌ Could not get deposit #1:", e.message);
    }

    // Test 4: Try to get deposit #2 directly
    console.log("\n📊 Test 4: Trying to get deposit #2 directly...");
    try {
      const { uintCV } = await import("@stacks/transactions");
      const deposit2Result = await callReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: "get-user-deposit",
        functionArgs: [standardPrincipalCV(userAddress), uintCV(2)],
      });
      console.log("Deposit #2 result:", deposit2Result);
      const deposit2Data = cvToJSON(deposit2Result);
      console.log("Deposit #2 data:", deposit2Data);
    } catch (e) {
      console.log("❌ Could not get deposit #2:", e.message);
    }

    // Test 5: Check legacy deposit
    console.log("\n📊 Test 5: Checking legacy deposit (single deposit)...");
    try {
      const legacyResult = await callReadOnlyFunction({
        contractAddress,
        contractName,
        functionName: "get-deposit",
        functionArgs: [standardPrincipalCV(userAddress)],
      });
      console.log("Legacy deposit result:", legacyResult);
      const legacyData = cvToJSON(legacyResult);
      console.log("Legacy deposit data:", legacyData);

      if (
        legacyData.value &&
        legacyData.value.amount &&
        legacyData.value.amount.value > 0
      ) {
        console.log("⚠️ FOUND LEGACY DEPOSIT!");
        console.log("Amount:", legacyData.value.amount.value / 1000000, "STX");
        console.log("This deposit was created with the old deposit() function");
        console.log("It will NOT show in the multiple deposits system");
      }
    } catch (e) {
      console.log("No legacy deposit found");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Check complete!");
  console.log("=".repeat(60));
}

// Run the check
checkDeposits();
