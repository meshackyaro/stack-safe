/**
 * Test script to verify contract read functions
 * Run this in browser console on the withdraw page
 */

// Copy this entire script and paste it in browser console

async function testContractReads() {
  console.log("🧪 Testing Contract Read Functions...\n");

  // Get user address from wallet context
  const userAddress =
    window.localStorage.getItem("userAddress") || "YOUR_ADDRESS_HERE";
  console.log("👤 User Address:", userAddress);

  // Contract details
  const contractAddress = "DEPLOY_CONTRACT_FIRST";
  const contractName = "StackSafe";
  const network = "testnet";

  console.log("📝 Contract:", `${contractAddress}.${contractName}`);
  console.log("🌐 Network:", network);
  console.log("\n---\n");

  // Test 1: Check if contract exists
  console.log("Test 1: Checking if contract exists...");
  try {
    const response = await fetch(
      `https://api.testnet.hiro.so/v2/contracts/interface/${contractAddress}/${contractName}`
    );
    if (response.ok) {
      console.log("✅ Contract exists on network");
    } else {
      console.log("❌ Contract NOT found on network");
      console.log("Response status:", response.status);
      return;
    }
  } catch (err) {
    console.log("❌ Error checking contract:", err);
    return;
  }

  console.log("\n---\n");

  // Test 2: Get deposit counter
  console.log("Test 2: Getting deposit counter...");
  try {
    const response = await fetch(
      `https://api.testnet.hiro.so/v2/contracts/call-read/${contractAddress}/${contractName}/get-deposit-counter`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: userAddress,
          arguments: [],
        }),
      }
    );
    const data = await response.json();
    console.log("Deposit Counter:", data);

    if (data.okay && data.result) {
      const counter = parseInt(data.result.replace("u", ""));
      console.log("✅ Total deposits created:", counter);

      if (counter === 0) {
        console.log("⚠️ No deposits have been created yet!");
        console.log("💡 Create a deposit first on the /deposit page");
        return;
      }
    }
  } catch (err) {
    console.log("❌ Error getting deposit counter:", err);
  }

  console.log("\n---\n");

  // Test 3: Get user deposit IDs
  console.log("Test 3: Getting user deposit IDs...");
  try {
    const response = await fetch(
      `https://api.testnet.hiro.so/v2/contracts/call-read/${contractAddress}/${contractName}/get-user-deposit-ids`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: userAddress,
          arguments: [`0x${userAddress.slice(2)}`], // Convert principal to hex
        }),
      }
    );
    const data = await response.json();
    console.log("Raw Response:", data);

    if (data.okay && data.result) {
      console.log("✅ Got response from get-user-deposit-ids");
      console.log("Result:", data.result);

      // Try to parse the result
      if (data.result.includes("deposit-ids")) {
        console.log("✅ Response contains deposit-ids field");
      } else {
        console.log("⚠️ Response does NOT contain deposit-ids field");
      }
    } else {
      console.log("❌ Failed to get deposit IDs");
      console.log("Error:", data);
    }
  } catch (err) {
    console.log("❌ Error getting deposit IDs:", err);
  }

  console.log("\n---\n");

  // Test 4: Try to get deposit #1 info
  console.log("Test 4: Getting deposit #1 info...");
  try {
    const response = await fetch(
      `https://api.testnet.hiro.so/v2/contracts/call-read/${contractAddress}/${contractName}/get-user-deposit`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: userAddress,
          arguments: [
            `0x${userAddress.slice(2)}`, // user principal
            "u1", // deposit-id
          ],
        }),
      }
    );
    const data = await response.json();
    console.log("Deposit #1 Response:", data);

    if (data.okay && data.result && !data.result.includes("none")) {
      console.log("✅ Deposit #1 exists!");
      console.log("Data:", data.result);
    } else {
      console.log("⚠️ Deposit #1 not found or empty");
    }
  } catch (err) {
    console.log("❌ Error getting deposit #1:", err);
  }

  console.log("\n---\n");
  console.log("🏁 Test Complete!");
  console.log("\n💡 Next Steps:");
  console.log("1. If contract not found → Deploy contract");
  console.log("2. If deposit counter is 0 → Create deposits");
  console.log("3. If deposit IDs empty → Check user address matches");
  console.log(
    "4. If deposit #1 not found → Verify deposits were created correctly"
  );
}

// Run the test
testContractReads();
