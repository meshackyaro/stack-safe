# Group Savings Feature - Testing Checklist

## Prerequisites

- [ ] Contract redeployed with new `closed` field
- [ ] Frontend rebuilt and running
- [ ] Wallet connected to testnet
- [ ] Test STX available

## Test Suite 1: Group Creation

### Test 1.1: Create Unlimited Group

- [ ] Navigate to Groups → Create Group
- [ ] Enter group name: "Test Unlimited Group"
- [ ] Select lock duration: "1 Day"
- [ ] Leave member limit unchecked
- [ ] Click "Create Group"
- [ ] **Expected**: Transaction succeeds, group appears in dashboard
- [ ] **Verify**: Group status shows "Open" (gray badge)
- [ ] **Verify**: Lock duration displays "1 Day"

### Test 1.2: Create Limited Group

- [ ] Navigate to Groups → Create Group
- [ ] Enter group name: "Test Limited Group"
- [ ] Select lock duration: "1 Week"
- [ ] Check "Set member limit"
- [ ] Enter threshold: 3
- [ ] Click "Create Group"
- [ ] **Expected**: Transaction succeeds
- [ ] **Verify**: Group shows "1 / 3" members
- [ ] **Verify**: Progress bar shows 33%

### Test 1.3: Verify Lock Duration Options

- [ ] Open Create Group form
- [ ] Check all 13 lock duration options are available:
  - [ ] 1 Hour
  - [ ] 3 Hours
  - [ ] 6 Hours
  - [ ] 8 Hours
  - [ ] 1 Day
  - [ ] 5 Days
  - [ ] 1 Week
  - [ ] 2 Weeks
  - [ ] 1 Month
  - [ ] 3 Months
  - [ ] 6 Months
  - [ ] 9 Months
  - [ ] 1 Year

## Test Suite 2: Close Group Functionality

### Test 2.1: Close Unlimited Group (Creator)

- [ ] Create unlimited group
- [ ] Verify "Close Group to New Members" button appears (orange/yellow)
- [ ] Click "Close Group to New Members"
- [ ] Confirm transaction
- [ ] **Expected**: Transaction succeeds
- [ ] **Verify**: Status changes to "Closed" (purple badge)
- [ ] **Verify**: "Close Group" button disappears
- [ ] **Verify**: "Start Savings Period Now" button appears (green/blue)

### Test 2.2: Cannot Close Already Closed Group

- [ ] Use a closed group
- [ ] **Verify**: "Close Group" button does not appear
- [ ] **Verify**: Only "Start Savings" button is visible

### Test 2.3: Non-Creator Cannot See Close Button

- [ ] Join someone else's unlimited group
- [ ] View group in dashboard
- [ ] **Verify**: No "Close Group" button visible
- [ ] **Verify**: Only deposit options available

## Test Suite 3: Start Savings Functionality

### Test 3.1: Start Savings on Closed Group (Creator)

- [ ] Close an unlimited group (or use already closed group)
- [ ] Verify "Start Savings Period Now" button appears
- [ ] Click "Start Savings Period Now"
- [ ] Confirm transaction
- [ ] **Expected**: Transaction succeeds
- [ ] **Verify**: Status changes to "Active" (yellow badge)
- [ ] **Verify**: "Start Savings" button disappears
- [ ] **Verify**: Countdown timer appears
- [ ] **Verify**: Lock expiry time is displayed

### Test 3.2: Cannot Start Before Closing

- [ ] Create unlimited group (don't close it)
- [ ] **Verify**: "Start Savings" button does NOT appear
- [ ] **Verify**: Only "Close Group" button is visible

### Test 3.3: Cannot Start Already Active Group

- [ ] Use an active group
- [ ] **Verify**: No "Start Savings" button
- [ ] **Verify**: Countdown timer is displayed

## Test Suite 4: Member Joining

### Test 4.1: Join Open Group

- [ ] Browse groups
- [ ] Find an "Open" group
- [ ] Click "Join Group"
- [ ] Enter deposit amount: 5 STX
- [ ] Click "Join & Deposit"
- [ ] **Expected**: Transaction succeeds
- [ ] **Verify**: You appear in group members
- [ ] **Verify**: Your balance shows 5 STX

### Test 4.2: Cannot Join Closed Group

- [ ] Browse groups
- [ ] Find a "Closed" group
- [ ] **Verify**: No "Join Group" button
- [ ] **Verify**: Message: "This group is closed to new members"

### Test 4.3: Cannot Join Active Group

- [ ] Browse groups
- [ ] Find an "Active" group
- [ ] **Verify**: No "Join Group" button
- [ ] **Verify**: Message indicates group is no longer accepting members

### Test 4.4: Auto-Close on Threshold

- [ ] Create group with threshold: 2
- [ ] Join with second account
- [ ] **Expected**: Group auto-closes
- [ ] **Verify**: Status changes to "Closed"
- [ ] **Verify**: Member count shows "2 / 2"
- [ ] **Verify**: Creator can now start savings

## Test Suite 5: Deposit Functionality

### Test 5.1: Deposit in Active Group

- [ ] Join an active group (or start one you created)
- [ ] Enter deposit amount: 3 STX
- [ ] Click "Deposit"
- [ ] **Expected**: Transaction succeeds
- [ ] **Verify**: Balance increases by 3 STX
- [ ] **Verify**: Total balance updates

### Test 5.2: Cannot Deposit in Open Group

- [ ] Join an open group (not started)
- [ ] **Verify**: Deposit section shows "(Group not started yet)"
- [ ] **Verify**: Can still enter amount and deposit
- [ ] **Note**: Members can deposit anytime, even before start

### Test 5.3: Deposit in Closed Group (Before Start)

- [ ] Join a closed group (not yet started)
- [ ] Enter deposit amount: 2 STX
- [ ] Click "Deposit"
- [ ] **Expected**: Transaction succeeds
- [ ] **Verify**: Balance increases

## Test Suite 6: Withdrawal Functionality

### Test 6.1: Cannot Withdraw During Lock

- [ ] Use an active group with balance
- [ ] **Verify**: No withdraw section visible
- [ ] **Verify**: Message shows lock is still active

### Test 6.2: Withdraw After Lock Expires

- [ ] Use a completed group (or wait for lock to expire)
- [ ] **Verify**: Status shows "Completed" (green badge)
- [ ] Enter withdrawal amount: 2 STX
- [ ] Click "Withdraw"
- [ ] **Expected**: Transaction succeeds
- [ ] **Verify**: Balance decreases by 2 STX
- [ ] **Verify**: STX received in wallet

### Test 6.3: Withdraw Full Balance

- [ ] Use completed group with balance
- [ ] Enter full balance amount
- [ ] Click "Withdraw"
- [ ] **Expected**: Transaction succeeds
- [ ] **Verify**: Balance shows 0 STX

## Test Suite 7: UI/UX Verification

### Test 7.1: Status Badge Colors

- [ ] **Open**: Gray badge
- [ ] **Closed**: Purple badge
- [ ] **Active**: Yellow badge
- [ ] **Completed**: Green badge

### Test 7.2: Creator Buttons

- [ ] **Open Group**: Shows "Close Group" (orange/yellow)
- [ ] **Closed Group**: Shows "Start Savings" (green/blue)
- [ ] **Active Group**: No creator buttons, shows countdown
- [ ] **Completed Group**: No creator buttons, shows completion message

### Test 7.3: Member View

- [ ] Join a group as non-creator
- [ ] **Verify**: No creator buttons visible
- [ ] **Verify**: Only deposit/withdraw options shown
- [ ] **Verify**: Status messages are clear

### Test 7.4: Group Browser Filters

- [ ] Test "All Groups" filter
- [ ] Test "Open (Joinable)" filter - shows only open groups
- [ ] Test "Active (Locked)" filter - shows only active groups
- [ ] Test "Completed" filter - shows only completed groups

### Test 7.5: Search Functionality

- [ ] Enter group name in search
- [ ] **Verify**: Results filter correctly
- [ ] Clear search
- [ ] **Verify**: All groups return

## Test Suite 8: Edge Cases

### Test 8.1: Create Group as Only Member

- [ ] Create unlimited group
- [ ] Immediately close it
- [ ] Immediately start savings
- [ ] **Verify**: Works with just creator as member
- [ ] Make deposit
- [ ] **Verify**: Deposit succeeds

### Test 8.2: Multiple Groups Same Creator

- [ ] Create 3 different groups
- [ ] **Verify**: All appear in dashboard
- [ ] **Verify**: Can manage each independently
- [ ] Close one, start another
- [ ] **Verify**: States are independent

### Test 8.3: Join Multiple Groups

- [ ] Join 3 different groups
- [ ] **Verify**: All appear in dashboard
- [ ] **Verify**: Balances are tracked separately
- [ ] Deposit in each
- [ ] **Verify**: Balances update correctly

### Test 8.4: Rapid State Changes

- [ ] Create group
- [ ] Immediately close it
- [ ] Immediately start it
- [ ] **Verify**: All transactions process correctly
- [ ] **Verify**: Final state is "Active"

## Test Suite 9: Error Handling

### Test 9.1: Invalid Deposit Amount

- [ ] Try to deposit 0 STX
- [ ] **Expected**: Error message
- [ ] Try to deposit negative amount
- [ ] **Expected**: Error or prevented by UI

### Test 9.2: Insufficient Balance

- [ ] Try to deposit more STX than you have
- [ ] **Expected**: Transaction fails with clear error

### Test 9.3: Withdraw More Than Balance

- [ ] Try to withdraw more than group balance
- [ ] **Expected**: Error message

### Test 9.4: Non-Creator Actions

- [ ] Try to close someone else's group (if possible)
- [ ] **Expected**: Transaction fails
- [ ] Try to start someone else's group
- [ ] **Expected**: Transaction fails

## Test Suite 10: Integration Tests

### Test 10.1: Full Lifecycle - Unlimited Group

- [ ] Create unlimited group
- [ ] Have 2 friends join
- [ ] Close the group
- [ ] Start savings period
- [ ] All members deposit
- [ ] Wait for lock to expire (or use short duration)
- [ ] All members withdraw
- [ ] **Verify**: Complete flow works end-to-end

### Test 10.2: Full Lifecycle - Limited Group

- [ ] Create group with 3-member limit
- [ ] Have 2 friends join (total 3 with creator)
- [ ] **Verify**: Group auto-closes
- [ ] Start savings period
- [ ] All members deposit
- [ ] Wait for lock to expire
- [ ] All members withdraw
- [ ] **Verify**: Complete flow works end-to-end

## Test Results Summary

| Test Suite        | Total Tests | Passed | Failed | Notes |
| ----------------- | ----------- | ------ | ------ | ----- |
| 1. Group Creation |             |        |        |       |
| 2. Close Group    |             |        |        |       |
| 3. Start Savings  |             |        |        |       |
| 4. Member Joining |             |        |        |       |
| 5. Deposits       |             |        |        |       |
| 6. Withdrawals    |             |        |        |       |
| 7. UI/UX          |             |        |        |       |
| 8. Edge Cases     |             |        |        |       |
| 9. Error Handling |             |        |        |       |
| 10. Integration   |             |        |        |       |

## Critical Issues Found

(Document any critical issues discovered during testing)

## Minor Issues Found

(Document any minor issues or improvements needed)

## Sign-off

- [ ] All critical tests passed
- [ ] All UI elements display correctly
- [ ] All user flows work as expected
- [ ] Documentation is accurate
- [ ] Ready for production deployment

**Tester Name**: ******\_\_\_******
**Date**: ******\_\_\_******
**Signature**: ******\_\_\_******
