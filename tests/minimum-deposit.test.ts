/**
 * Minimum Deposit Enforcement Test
 * Tests the $2 USD minimum deposit requirement across frontend and contract
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Cl } from '@stacks/transactions';
import "@hirosystems/clarinet-sdk/vitest";

// Access simnet from global context (provided by vitest-environment-clarinet)
declare const simnet: any;

const accounts = simnet.getAccounts();
const address1 = accounts.get('wallet_1')!;
const deployer = accounts.get('deployer')!

describe('Minimum Deposit Enforcement', () => {
  beforeEach(() => {
    // Reset simnet state before each test
    simnet.setEpoch('3.0');
  });

  describe('Price Oracle System', () => {
    it('should have default STX price set', () => {
      const result = simnet.callReadOnlyFn(
        'GrowFundz',
        'get-stx-usd-price',
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.uint(500000)); // $0.50 with 6 decimal precision
    });

    it('should calculate correct minimum STX amount', () => {
      const result = simnet.callReadOnlyFn(
        'GrowFundz',
        'calculate-minimum-stx-amount',
        [],
        deployer
      );
      // With $0.50 price, minimum should be 4 STX (4,000,000 microstacks)
      expect(result.result).toEqual(Cl.uint(4000000));
    });

    it('should return USD minimum deposit amount', () => {
      const result = simnet.callReadOnlyFn(
        'GrowFundz',
        'get-usd-minimum-deposit',
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.uint(2000000)); // $2.00 with 6 decimal precision
    });

    it('should validate deposit amounts correctly', () => {
      // Test valid amount (4 STX = 4,000,000 microstacks)
      const validResult = simnet.callReadOnlyFn(
        'GrowFundz',
        'is-valid-deposit-amount',
        [Cl.uint(4000000)],
        deployer
      );
      expect(validResult.result).toEqual(Cl.bool(true));

      // Test invalid amount (1 STX = 1,000,000 microstacks)
      const invalidResult = simnet.callReadOnlyFn(
        'GrowFundz',
        'is-valid-deposit-amount',
        [Cl.uint(1000000)],
        deployer
      );
      expect(invalidResult.result).toEqual(Cl.bool(false));
    });

    it('should provide comprehensive deposit validation info', () => {
      const result = simnet.callReadOnlyFn(
        'GrowFundz',
        'get-deposit-validation-info',
        [Cl.uint(5000000)], // 5 STX
        deployer
      );

      expect(result.result).toEqual(Cl.tuple({
        'minimum-stx-required': Cl.uint(4000000), // 4 STX
        'stx-price': Cl.uint(500000), // $0.50
        'usd-minimum': Cl.uint(2000000), // $2.00
        'deposit-usd-value': Cl.uint(2500000), // $2.50 (5 STX * $0.50)
        'is-valid': Cl.bool(true),
        'last-price-update': Cl.uint(0)
      }));
    });
  });

  describe('Price Oracle Authority Management', () => {
    it('should set deployer as initial price oracle authority', () => {
      const result = simnet.callReadOnlyFn(
        'GrowFundz',
        'get-price-oracle-authority',
        [],
        deployer
      );
      expect(result.result).toEqual(Cl.principal(deployer));
    });

    it('should allow authority to update STX price', () => {
      // Update price to $1.00 (1,000,000 with 6 decimal precision)
      const updateResult = simnet.callPublicFn(
        'GrowFundz',
        'update-stx-price',
        [Cl.uint(1000000)],
        deployer
      );
      expect(updateResult.result).toEqual(Cl.ok(Cl.uint(1000000)));

      // Verify price was updated
      const priceResult = simnet.callReadOnlyFn(
        'GrowFundz',
        'get-stx-usd-price',
        [],
        deployer
      );
      expect(priceResult.result).toEqual(Cl.uint(1000000));

      // Verify minimum STX amount was recalculated (should be 2 STX now)
      const minResult = simnet.callReadOnlyFn(
        'GrowFundz',
        'calculate-minimum-stx-amount',
        [],
        deployer
      );
      expect(minResult.result).toEqual(Cl.uint(2000000)); // 2 STX
    });

    it('should reject price updates from unauthorized users', () => {
      const updateResult = simnet.callPublicFn(
        'GrowFundz',
        'update-stx-price',
        [Cl.uint(750000)], // $0.75
        address1
      );
      expect(updateResult.result).toEqual(Cl.error(Cl.uint(103))); // ERR-UNAUTHORIZED
    });

    it('should reject invalid price values', () => {
      // Too low (below $0.01)
      const tooLowResult = simnet.callPublicFn(
        'GrowFundz',
        'update-stx-price',
        [Cl.uint(5000)], // $0.005
        deployer
      );
      expect(tooLowResult.result).toEqual(Cl.error(Cl.uint(100))); // ERR-INVALID-AMOUNT

      // Too high (above $100.00)
      const tooHighResult = simnet.callPublicFn(
        'GrowFundz',
        'update-stx-price',
        [Cl.uint(200000000)], // $200.00
        deployer
      );
      expect(tooHighResult.result).toEqual(Cl.error(Cl.uint(100))); // ERR-INVALID-AMOUNT
    });

    it('should allow authority transfer', () => {
      // Transfer authority to address1
      const transferResult = simnet.callPublicFn(
        'GrowFundz',
        'update-price-oracle-authority',
        [Cl.principal(address1)],
        deployer
      );
      expect(transferResult.result).toEqual(Cl.ok(Cl.principal(address1)));

      // Verify authority was transferred
      const authorityResult = simnet.callReadOnlyFn(
        'GrowFundz',
        'get-price-oracle-authority',
        [],
        deployer
      );
      expect(authorityResult.result).toEqual(Cl.principal(address1));

      // Verify new authority can update price
      const updateResult = simnet.callPublicFn(
        'GrowFundz',
        'update-stx-price',
        [Cl.uint(800000)], // $0.80
        address1
      );
      expect(updateResult.result).toEqual(Cl.ok(Cl.uint(800000)));
    });
  });

  describe('Deposit Enforcement', () => {
    beforeEach(() => {
      // Reset price to $0.50 for consistent testing
      simnet.callPublicFn(
        'GrowFundz',
        'update-stx-price',
        [Cl.uint(500000)],
        deployer // Use deployer as authority
      );
    });

    it('should reject deposits below minimum amount', () => {
      // Try to deposit 1 STX (below 4 STX minimum)
      const depositResult = simnet.callPublicFn(
        'GrowFundz',
        'deposit',
        [
          Cl.uint(1000000), // 1 STX in microstacks
          Cl.uint(5) // 1 day lock
        ],
        address1
      );
      expect(depositResult.result).toEqual(Cl.error(Cl.uint(114))); // ERR-BELOW-MINIMUM-DEPOSIT
    });

    it('should accept deposits at minimum amount', () => {
      // Deposit exactly 4 STX (minimum amount)
      const depositResult = simnet.callPublicFn(
        'GrowFundz',
        'deposit',
        [
          Cl.uint(4000000), // 4 STX in microstacks
          Cl.uint(5) // 1 day lock
        ],
        address1
      );
      expect(depositResult.result).toEqual(Cl.ok(Cl.uint(4000000)));
    });

    it('should accept deposits above minimum amount', () => {
      // Deposit 10 STX (above minimum)
      const depositResult = simnet.callPublicFn(
        'GrowFundz',
        'create-deposit',
        [
          Cl.uint(10000000), // 10 STX in microstacks
          Cl.uint(7), // 1 week lock
          Cl.some(Cl.stringAscii('Large Deposit'))
        ],
        address1
      );
      expect(depositResult.result).toEqual(Cl.ok(Cl.uint(1))); // First deposit ID
    });

    it('should enforce minimum on create-deposit function', () => {
      // Try to create deposit below minimum
      const depositResult = simnet.callPublicFn(
        'GrowFundz',
        'create-deposit',
        [
          Cl.uint(2000000), // 2 STX in microstacks
          Cl.uint(5), // 1 day lock
          Cl.some(Cl.stringAscii('Small Deposit'))
        ],
        address1
      );
      expect(depositResult.result).toEqual(Cl.error(Cl.uint(114))); // ERR-BELOW-MINIMUM-DEPOSIT
    });
  });

  describe('Dynamic Minimum Updates', () => {
    it('should update minimum when price changes', () => {
      // Change price to $2.00 (should make minimum 1 STX)
      const updateResult = simnet.callPublicFn(
        'GrowFundz',
        'update-stx-price',
        [Cl.uint(2000000)], // $2.00
        deployer // Use deployer as authority
      );
      expect(updateResult.result).toEqual(Cl.ok(Cl.uint(2000000)));

      // Check new minimum
      const minResult = simnet.callReadOnlyFn(
        'GrowFundz',
        'calculate-minimum-stx-amount',
        [],
        deployer
      );
      expect(minResult.result).toEqual(Cl.uint(1000000)); // 1 STX

      // Verify 1 STX deposit is now valid
      const validResult = simnet.callReadOnlyFn(
        'GrowFundz',
        'is-valid-deposit-amount',
        [Cl.uint(1000000)],
        deployer
      );
      expect(validResult.result).toEqual(Cl.bool(true));

      // Verify 0.5 STX deposit is still invalid
      const invalidResult = simnet.callReadOnlyFn(
        'GrowFundz',
        'is-valid-deposit-amount',
        [Cl.uint(500000)],
        deployer
      );
      expect(invalidResult.result).toEqual(Cl.bool(false));
    });

    it('should handle edge case prices correctly', () => {
      // Test with very low price ($0.01)
      simnet.callPublicFn(
        'GrowFundz',
        'update-stx-price',
        [Cl.uint(10000)], // $0.01
        deployer
      );

      const minResult = simnet.callReadOnlyFn(
        'GrowFundz',
        'calculate-minimum-stx-amount',
        [],
        deployer
      );
      expect(minResult.result).toEqual(Cl.uint(200000000)); // 200 STX

      // Test with high price ($10.00)
      simnet.callPublicFn(
        'GrowFundz',
        'update-stx-price',
        [Cl.uint(10000000)], // $10.00
        deployer
      );

      const minResult2 = simnet.callReadOnlyFn(
        'GrowFundz',
        'calculate-minimum-stx-amount',
        [],
        deployer
      );
      expect(minResult2.result).toEqual(Cl.uint(200000)); // 0.2 STX
    });
  });

  describe('Price Update Tracking', () => {
    it('should track last price update block', () => {
      const initialBlock = simnet.blockHeight;
      
      // Update price
      simnet.callPublicFn(
        'GrowFundz',
        'update-stx-price',
        [Cl.uint(1500000)], // $1.50
        deployer
      );

      // Check last update block
      const updateResult = simnet.callReadOnlyFn(
        'GrowFundz',
        'get-last-price-update',
        [],
        deployer
      );
      expect(updateResult.result).toEqual(Cl.uint(initialBlock + 1));
    });
  });
});