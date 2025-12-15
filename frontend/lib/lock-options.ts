/**
 * Lock Duration Options for GrowFundz
 * Maps user-friendly time periods to contract lock option values
 * Maintains parity with the smart contract's lock duration constants
 */

// Block time constants (legacy - use network-timing.ts for accurate values)
export const STACKS_BLOCK_TIME_MINUTES = 10; // Average Stacks block time in minutes (mainnet)
export const STACKS_BLOCK_TIME_SECONDS = STACKS_BLOCK_TIME_MINUTES * 60;

// Lock option constants that match the smart contract
export const LOCK_OPTIONS = {
  LOCK_1_HOUR: 1,
  LOCK_3_HOURS: 2,
  LOCK_6_HOURS: 3,
  LOCK_8_HOURS: 4,
  LOCK_1_DAY: 5,
  LOCK_5_DAYS: 6,
  LOCK_1_WEEK: 7,
  LOCK_2_WEEKS: 8,
  LOCK_1_MONTH: 9,
  LOCK_3_MONTHS: 10,
  LOCK_6_MONTHS: 11,
  LOCK_9_MONTHS: 12,
  LOCK_1_YEAR: 13,
} as const;

// Block duration constants (matching contract values)
// Based on average Stacks block time of 10 minutes per block
export const LOCK_DURATIONS_BLOCKS = {
  [LOCK_OPTIONS.LOCK_1_HOUR]: 6,      // 1 hour = 6 blocks
  [LOCK_OPTIONS.LOCK_3_HOURS]: 18,    // 3 hours = 18 blocks
  [LOCK_OPTIONS.LOCK_6_HOURS]: 36,    // 6 hours = 36 blocks
  [LOCK_OPTIONS.LOCK_8_HOURS]: 48,    // 8 hours = 48 blocks
  [LOCK_OPTIONS.LOCK_1_DAY]: 144,     // 1 day = 144 blocks
  [LOCK_OPTIONS.LOCK_5_DAYS]: 720,    // 5 days = 720 blocks
  [LOCK_OPTIONS.LOCK_1_WEEK]: 1008,   // 1 week = 1,008 blocks
  [LOCK_OPTIONS.LOCK_2_WEEKS]: 2016,  // 2 weeks = 2,016 blocks
  [LOCK_OPTIONS.LOCK_1_MONTH]: 4320,  // 1 month (30 days) = 4,320 blocks
  [LOCK_OPTIONS.LOCK_3_MONTHS]: 12960, // 3 months (90 days) = 12,960 blocks
  [LOCK_OPTIONS.LOCK_6_MONTHS]: 25920, // 6 months (180 days) = 25,920 blocks
  [LOCK_OPTIONS.LOCK_9_MONTHS]: 38880, // 9 months (270 days) = 38,880 blocks
  [LOCK_OPTIONS.LOCK_1_YEAR]: 52560,  // 1 year (365 days) = 52,560 blocks
} as const;

// User-friendly labels for the UI
export interface LockOption {
  value: number;
  label: string;
  description: string;
  blocks: number;
  category: 'short' | 'medium' | 'long';
}

/**
 * Get all available lock duration options for the UI
 * Returns an array of options with user-friendly labels and descriptions
 */
export const getLockDurationOptions = (): LockOption[] => {
  return [
    {
      value: LOCK_OPTIONS.LOCK_1_HOUR,
      label: '1 Hour',
      description: 'Quick lock for short-term savings',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_1_HOUR],
      category: 'short',
    },
    {
      value: LOCK_OPTIONS.LOCK_3_HOURS,
      label: '3 Hours',
      description: 'Short-term commitment',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_3_HOURS],
      category: 'short',
    },
    {
      value: LOCK_OPTIONS.LOCK_6_HOURS,
      label: '6 Hours',
      description: 'Half-day lock period',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_6_HOURS],
      category: 'short',
    },
    {
      value: LOCK_OPTIONS.LOCK_8_HOURS,
      label: '8 Hours',
      description: 'Work-day lock period',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_8_HOURS],
      category: 'short',
    },
    {
      value: LOCK_OPTIONS.LOCK_1_DAY,
      label: '1 Day',
      description: 'Daily savings commitment',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_1_DAY],
      category: 'medium',
    },
    {
      value: LOCK_OPTIONS.LOCK_5_DAYS,
      label: '5 Days',
      description: 'Work week commitment',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_5_DAYS],
      category: 'medium',
    },
    {
      value: LOCK_OPTIONS.LOCK_1_WEEK,
      label: '1 Week',
      description: 'Weekly savings goal',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_1_WEEK],
      category: 'medium',
    },
    {
      value: LOCK_OPTIONS.LOCK_2_WEEKS,
      label: '2 Weeks',
      description: 'Bi-weekly commitment',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_2_WEEKS],
      category: 'medium',
    },
    {
      value: LOCK_OPTIONS.LOCK_1_MONTH,
      label: '1 Month',
      description: 'Monthly savings plan',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_1_MONTH],
      category: 'long',
    },
    {
      value: LOCK_OPTIONS.LOCK_3_MONTHS,
      label: '3 Months',
      description: 'Quarterly commitment',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_3_MONTHS],
      category: 'long',
    },
    {
      value: LOCK_OPTIONS.LOCK_6_MONTHS,
      label: '6 Months',
      description: 'Half-year savings goal',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_6_MONTHS],
      category: 'long',
    },
    {
      value: LOCK_OPTIONS.LOCK_9_MONTHS,
      label: '9 Months',
      description: 'Long-term commitment',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_9_MONTHS],
      category: 'long',
    },
    {
      value: LOCK_OPTIONS.LOCK_1_YEAR,
      label: '1 Year',
      description: 'Annual savings commitment',
      blocks: LOCK_DURATIONS_BLOCKS[LOCK_OPTIONS.LOCK_1_YEAR],
      category: 'long',
    },
  ];
};

/**
 * Convert lock option value to user-friendly label
 * @param optionValue - The lock option value from the contract
 * @returns Human-readable label for the lock duration
 */
export const convertOptionToLabel = (optionValue: number): string => {
  const option = getLockDurationOptions().find(opt => opt.value === optionValue);
  return option?.label || `Unknown (${optionValue})`;
};

/**
 * Get lock duration in blocks for a given option
 * @param optionValue - The lock option value
 * @returns Number of blocks for the lock duration
 */
export const getLockDurationBlocks = (optionValue: number): number => {
  return LOCK_DURATIONS_BLOCKS[optionValue as keyof typeof LOCK_DURATIONS_BLOCKS] || 0;
};

/**
 * Calculate approximate time remaining based on blocks (legacy version)
 * @param remainingBlocks - Number of blocks remaining
 * @returns Human-readable time remaining string
 * @deprecated Use formatRemainingTimeAccurate from network-timing.ts for accurate timing
 */
export const formatRemainingTime = (remainingBlocks: number): string => {
  if (remainingBlocks <= 0) return 'Unlocked';
  
  // Account for transaction mining: if only 1 block remains, 
  // a withdrawal transaction will likely succeed when mined
  if (remainingBlocks === 1) {
    return 'Unlocking soon (next block)';
  }
  
  // Convert blocks to minutes using the constant (may be inaccurate on testnet)
  const totalMinutes = remainingBlocks * STACKS_BLOCK_TIME_MINUTES;
  
  if (totalMinutes < 60) {
    return `${totalMinutes} minutes`;
  }
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours < 24) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours} hours`;
  }
  
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  
  if (days < 30) {
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} days`;
  }
  
  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  
  if (months < 12) {
    return remainingDays > 0 ? `${months}mo ${remainingDays}d` : `${months} months`;
  }
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  return remainingMonths > 0 ? `${years}y ${remainingMonths}mo` : `${years} years`;
};

/**
 * Calculate approximate date from block height
 * @param blockHeight - The block height
 * @param currentBlock - Current block height
 * @returns Approximate date string
 */
export const getApproximateDate = (blockHeight: number, currentBlock: number): string => {
  if (blockHeight <= 0) return 'Unknown';
  
  // Calculate the difference in blocks
  const blockDifference = blockHeight - currentBlock;
  
  // Convert blocks to minutes using the constant
  const minutesDifference = blockDifference * STACKS_BLOCK_TIME_MINUTES;
  
  // Calculate the approximate date
  const now = new Date();
  const approximateDate = new Date(now.getTime() + (minutesDifference * 60 * 1000));
  
  // Format the date
  const isToday = approximateDate.toDateString() === now.toDateString();
  const isTomorrow = approximateDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
  const isYesterday = approximateDate.toDateString() === new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
  
  if (blockDifference === 0) return 'Now';
  if (isToday && blockDifference > 0) return `Today at ${approximateDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (isTomorrow) return `Tomorrow at ${approximateDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (isYesterday) return `Yesterday at ${approximateDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  
  // For dates further away, show relative time
  if (Math.abs(blockDifference) < 144) { // Less than 1 day
    return approximateDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (Math.abs(blockDifference) < 1008) { // Less than 1 week
    return approximateDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  } else {
    return approximateDate.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

/**
 * Get a user-friendly description of when the lock expires
 * @param lockExpiry - Lock expiry block height
 * @param currentBlock - Current block height
 * @returns User-friendly unlock time description
 */
export const getUnlockTimeDescription = (lockExpiry: number, currentBlock: number): string => {
  if (lockExpiry <= 0) return 'No active lock';
  if (currentBlock >= lockExpiry) return 'Unlocked now';
  
  const remainingBlocks = lockExpiry - currentBlock;
  const timeRemaining = formatRemainingTime(remainingBlocks);
  const approximateDate = getApproximateDate(lockExpiry, currentBlock);
  
  return `Unlocks in ${timeRemaining} (${approximateDate})`;
};