# GrowFundz - Decentralized Savings Vault

A decentralized savings application built on Stacks blockchain with time-locked deposits and group savings functionality.

## 🚀 Quick Start

```bash
# Install dependencies
npm install && cd frontend && npm install

# Configure environment
cp frontend/.env.example frontend/.env.local
# Edit .env.local with your contract address

# Start development server
npm run dev
```

Open http://localhost:3000

## ✨ Features

### Personal Savings

- **Multiple Independent Deposits**: Create unlimited deposits with different amounts and lock periods
- **Flexible Lock Periods**: Choose from 13 options (1 hour to 1 year)
- **Named Deposits**: Organize your savings with custom names
- **Individual Control**: Withdraw from specific deposits when unlocked

### Group Savings

- **Create Groups**: Set up savings groups with custom goals and durations
- **Join Groups**: Participate in existing savings groups
- **Manual Control**: Creators can close groups anytime
- **Individual Balances**: Each member's contributions tracked separately

### Smart Features

- **Total Balance**: Aggregates personal + group savings
- **Lock Progress**: Visual progress bars for locked deposits
- **Real-time Updates**: Balance updates every 30 seconds
- **Price Oracle**: $2 USD minimum deposit (adjusts with STX price)

## 📋 Usage

### Create a Deposit

1. Connect your wallet
2. Go to **Deposit** page
3. Enter amount, select lock period, add optional name
4. Confirm transaction
5. Deposit appears immediately on dashboard

### Withdraw Funds

1. Go to **Withdraw** page
2. See all your deposits listed
3. Unlocked deposits show "Withdraw Funds" button
4. Enter amount and confirm withdrawal

### Group Savings

1. Go to **Groups** page
2. Create a new group or browse existing ones
3. Join groups with initial deposit
4. Add more funds anytime
5. Withdraw your contributions when lock expires

## 🔧 Recent Fixes

### v2.4.0 - Group Savings System Complete Fix ✅

**Problem**: Multiple issues with the Group Savings system affecting usability and functionality.

**Issues Fixed**:

1. ✅ **Page Scrolling** - Groups page now scrolls properly on all screen sizes
2. ✅ **Lock Period Activation** - Groups with member limits auto-lock when full; unlimited groups can be manually closed by creators
3. ✅ **Manual Close Button** - Creators of unlimited groups can now close and start lock period anytime
4. ✅ **Group Name Display** - Group names displayed prominently instead of IDs; search by name
5. ✅ **Contract Synchronization** - Lock activation properly reflected in both contract and UI

**Changes**:

**Frontend**:

- Added scrolling support to groups page
- Enhanced "Close Group & Start Lock Period" button for unlimited groups
- Replaced group ID display with group names and creator addresses
- Updated search to filter by name only
- Improved status messages with clear icons and explanations
- Added comprehensive lock period information in create form

**Result**:

- ✅ All group content accessible via scrolling
- ✅ Lock periods activate correctly (automatic and manual)
- ✅ Clear UI for closing unlimited groups
- ✅ Groups easily identifiable by name
- ✅ Deposits accessible after lock activation
- ✅ Withdrawals work after lock expiry

**See**: `GROUP_SAVINGS_FIX.md` for complete details

### v2.3.0 - Withdraw Page Display Fix ✅

**Problem**: Unlocked funds ready for withdrawal not appearing on Withdraw page - showing "Make your first deposit" instead.

**Root Causes Fixed**:

1. ✅ Legacy deposit system not being checked (only checked multiple deposits)
2. ✅ Complex conditional rendering causing display issues
3. ✅ Missing fallback for deposits created with old `deposit()` function

**Changes**:

**Frontend** (`frontend/app/withdraw/page.tsx`):

- Added legacy deposit detection and conversion
- Simplified conditional rendering logic
- Updated withdrawal handler to support both deposit systems
- Removed excessive debug logging
- Created comprehensive debug tool at `/debug-deposits`

**Result**:

- ✅ Legacy deposits now appear on withdraw page
- ✅ Multiple deposits continue to work correctly
- ✅ Clear display of unlocked vs locked deposits
- ✅ Withdraw buttons appear for all unlocked deposits
- ✅ Both withdrawal methods work seamlessly

**See**: `WITHDRAW_PAGE_FIX.md` and `TESTING_GUIDE.md` for complete details

### v2.2.0 - Complete Withdrawal System Fix ✅

**Problem**: Users with unlocked deposits saw "Make your first deposit" instead of withdraw buttons.

**Root Causes Fixed**:

1. ✅ Contract helper functions used `tx-sender` instead of `user` parameter
2. ✅ Clarity's `fold`/`filter` don't support closures (can't pass user context)
3. ✅ Frontend data parsing improved for raw Clarity Values

**See**: `WITHDRAWAL_FIX_SUMMARY.md` for details

## 🐛 Troubleshooting

### "No deposits found" but I have deposits

**Quick Fix**:

1. Navigate to `/debug-deposits`
2. Click "Run Diagnostics"
3. Check if deposits appear in the output

**Common causes**:

1. Legacy deposits (now fixed in v2.3.0 - should appear automatically)
2. Wrong user address
3. Transaction not confirmed yet
4. Contract not deployed correctly

**Solution**:

- Legacy deposits now show automatically
- Check debug page for detailed information
- Verify contract address in `.env.local`
- Wait for transaction confirmation

### "Withdraw button doesn't appear"

**Check**:

1. Is deposit unlocked? (should show green "Unlocked" badge)
2. Remaining blocks should be 0
3. Deposit not already withdrawn?

**Solution**:

- Wait for lock period to expire
- Hard refresh page (Ctrl+Shift+R)
- Check `/debug-deposits` for deposit status
- Verify current block height vs lock expiry

### Using the Debug Tool

Navigate to `/debug-deposits` to see:

- All deposit IDs
- Detailed deposit information
- Legacy deposit status
- Current block height
- Any errors encountered
- Recommendations for fixing issues

**See**: `TESTING_GUIDE.md` for complete troubleshooting guide

## 🧪 Testing

### Quick Test (5 minutes)

```bash
# 1. Start server
npm run dev

# 2. In browser:
# - Connect wallet
# - Create deposit (5 STX, 1 hour)
# - Check console shows deposit created
# - Wait 1 hour
# - Go to withdraw page
# - Verify withdraw button appears
```

### Console Output (Expected)

```
🔄 Loading deposits for user: ST1...
✅ Found deposit IDs: [1]
✅ Deposit #1 info: { amount: 5, isLocked: false, remainingBlocks: 0 }
💰 Total balance calculated: 5 STX from 1 deposits
✅ Found 1 UNLOCKED deposits ready for withdrawal!
```

## 📚 Documentation

- **README.md** (this file) - Main documentation
- **GROUP_SAVINGS_FIX.md** - Group savings system fixes (v2.4.0)
- **WITHDRAW_PAGE_FIX.md** - Withdrawal page fix (v2.3.0)
- **TESTING_GUIDE.md** - Comprehensive testing instructions
- **WITHDRAWAL_FIX_SUMMARY.md** - Previous fix explanation
- **DEPLOYMENT_GUIDE.md** - Step-by-step deployment

## 🏗️ Technical Stack

- **Smart Contract**: Clarity (Stacks blockchain)
- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Wallet**: Stacks Connect
- **Network**: Stacks Testnet

## 📁 Project Structure

```
piggy-vault/
├── contracts/
│   └── GrowFundz.clar          # Main smart contract
├── frontend/
│   ├── app/                    # Next.js pages
│   │   ├── deposit/           # Deposit page
│   │   ├── withdraw/          # Withdraw page (FIXED)
│   │   └── groups/            # Group savings
│   ├── components/            # React components
│   ├── hooks/                 # Custom hooks (FIXED)
│   │   └── use-multiple-deposits.ts
│   └── lib/                   # Utilities
└── tests/                     # Contract tests
```

## 🔐 Security

- ✅ All funds secured by smart contracts
- ✅ Lock periods enforced at contract level
- ✅ Members can only withdraw own contributions
- ✅ Creator-only functions protected
- ✅ All transactions require wallet confirmation

## 🚀 Deployment

### Deploy Contract

```bash
clarinet deploy --testnet
# Update .env.local with contract address
```

### Deploy Frontend

```bash
cd frontend
npm run build
# Deploy to Vercel/Netlify
```

## 📊 Version History

- **v2.4.0** (Nov 2024) - Group savings system complete fix (scrolling, lock activation, UI improvements)
- **v2.3.0** (Nov 2024) - Withdraw page display fix + legacy deposit support + debug tool
- **v2.2.0** (Nov 2024) - Complete withdrawal system fix (contract + frontend)
- **v2.1.1** (Nov 2024) - Withdrawal fix + frontend workarounds
- **v2.1.0** (Nov 2024) - Critical fix for deposit tracking
- **v2.0.0** (Nov 2024) - Multiple deposits + group savings
- **v1.0.0** (Nov 2024) - Initial release

## 🆘 Support

### If Issues Persist:

1. **Check console logs** - They're very detailed now
2. **Run test script** - `test-contract-reads.js` in console
3. **Verify contract** - Check on Stacks Explorer
4. **Clear cache** - Hard refresh browser
5. **Restart server** - Stop and start `npm run dev`

### Debug Commands

```javascript
// In browser console:

// 1. Check user address
console.log("User:", window.localStorage.getItem("userAddress"));

// 2. Test contract directly
// Copy and paste test-contract-reads.js

// 3. Check deposit data
// Look for logs starting with 🔍, ✅, or ❌
```

## 📝 License

MIT License - see LICENSE file for details

---

**Built with ❤️ on Stacks**

**Status**: ✅ All withdrawal issues fixed and tested
