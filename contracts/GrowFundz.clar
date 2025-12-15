;; Error codes
(define-constant ERR-INVALID-AMOUNT u100)
(define-constant ERR-STILL-LOCKED u101)
(define-constant ERR-NO-DEPOSIT u102)
(define-constant ERR-UNAUTHORIZED u103)
(define-constant ERR-INSUFFICIENT-BALANCE u104)
(define-constant ERR-INVALID-LOCK-OPTION u105)
(define-constant ERR-BELOW-MINIMUM-DEPOSIT u114)

;; Group savings error codes
(define-constant ERR-GROUP-NOT-FOUND u106)
(define-constant ERR-GROUP-FULL u107)
(define-constant ERR-NOT-MEMBER u108)
(define-constant ERR-GROUP-LOCKED u109)
(define-constant ERR-NOT-CREATOR u110)
(define-constant ERR-ALREADY-JOINED u111)
(define-constant ERR-GROUP-NOT-STARTED u112)
(define-constant ERR-INVALID-GROUP-NAME u113)

;; Price Oracle System for $2 USD minimum enforcement
;; STX price in USD with 6 decimal precision (e.g., $0.520000 = 520000)
(define-data-var stx-usd-price uint u500000) ;; Default: $0.50

;; USD minimum deposit amount with 6 decimal precision ($2.00 = 2000000)
(define-constant USD-MINIMUM-DEPOSIT u2000000) ;; $2.00 USD

;; Price oracle update authority (contract deployer initially)
(define-data-var price-oracle-authority principal tx-sender)

;; Last price update timestamp (block height)
(define-data-var last-price-update uint u0)

;; Time-based lock duration constants (converted to blocks)
;; Based on average Stacks block time of 10 minutes per block
(define-constant ONE_HOUR u6) ;; 1 hour = 6 blocks
(define-constant THREE_HOURS u18) ;; 3 hours = 18 blocks
(define-constant SIX_HOURS u36) ;; 6 hours = 36 blocks
(define-constant EIGHT_HOURS u48) ;; 8 hours = 48 blocks
(define-constant ONE_DAY u144) ;; 1 day = 144 blocks
(define-constant FIVE_DAYS u720) ;; 5 days = 720 blocks
(define-constant ONE_WEEK u1008) ;; 1 week = 1,008 blocks
(define-constant TWO_WEEKS u2016) ;; 2 weeks = 2,016 blocks
(define-constant ONE_MONTH u4320) ;; 1 month (30 days) = 4,320 blocks
(define-constant THREE_MONTHS u12960) ;; 3 months (90 days) = 12,960 blocks
(define-constant SIX_MONTHS u25920) ;; 6 months (180 days) = 25,920 blocks
(define-constant NINE_MONTHS u38880) ;; 9 months (270 days) = 38,880 blocks
(define-constant ONE_YEAR u52560) ;; 1 year (365 days) = 52,560 blocks

;; Lock option enumeration
(define-constant LOCK-1-HOUR u1)
(define-constant LOCK-3-HOURS u2)
(define-constant LOCK-6-HOURS u3)
(define-constant LOCK-8-HOURS u4)
(define-constant LOCK-1-DAY u5)
(define-constant LOCK-5-DAYS u6)
(define-constant LOCK-1-WEEK u7)
(define-constant LOCK-2-WEEKS u8)
(define-constant LOCK-1-MONTH u9)
(define-constant LOCK-3-MONTHS u10)
(define-constant LOCK-6-MONTHS u11)
(define-constant LOCK-9-MONTHS u12)
(define-constant LOCK-1-YEAR u13)

;; Individual deposits map (legacy - single deposit per user)
(define-map deposits
    { user: principal }
    {
        amount: uint,
        deposit-block: uint,
        lock-expiry: uint,
    }
)

;; Multiple deposits system - each deposit has unique ID
(define-data-var deposit-counter uint u0)

;; Multiple deposits map - supports multiple deposits per user with optional names
(define-map user-deposits
    {
        user: principal,
        deposit-id: uint,
    }
    {
        amount: uint,
        deposit-block: uint,
        lock-expiry: uint,
        lock-option: uint,
        withdrawn: bool,
        name: (optional (string-ascii 50)),
    }
)

;; User deposit list - tracks all deposit IDs for a user
(define-map user-deposit-list
    { user: principal }
    { deposit-ids: (list 100 uint) }
)

;; Group counter for unique group IDs
(define-data-var group-counter uint u0)

;; Group savings data structure
;; Tracks all group information including members, lock status, and timing
(define-map savings-groups
    { group-id: uint }
    {
        creator: principal,
        name: (string-ascii 50),
        duration: uint,
        threshold: (optional uint),
        member-count: uint,
        closed: bool,
        locked: bool,
        start-block: (optional uint),
        lock-expiry: (optional uint),
    }
)

;; Group membership tracking
;; Maps group-id + member principal to their deposit info
(define-map group-members
    {
        group-id: uint,
        member: principal,
    }
    {
        amount: uint,
        deposit-block: uint,
        joined-block: uint,
    }
)

;; Group member list for easy iteration
;; Stores list of all members for a given group
(define-map group-member-list
    { group-id: uint }
    { members: (list 100 principal) }
)

;; Helper function to convert lock option to block duration
;; Takes a lock option (1-13) and returns the corresponding block count
(define-read-only (get-lock-duration (option uint))
    (if (is-eq option LOCK-1-HOUR)
        ONE_HOUR
        (if (is-eq option LOCK-3-HOURS)
            THREE_HOURS
            (if (is-eq option LOCK-6-HOURS)
                SIX_HOURS
                (if (is-eq option LOCK-8-HOURS)
                    EIGHT_HOURS
                    (if (is-eq option LOCK-1-DAY)
                        ONE_DAY
                        (if (is-eq option LOCK-5-DAYS)
                            FIVE_DAYS
                            (if (is-eq option LOCK-1-WEEK)
                                ONE_WEEK
                                (if (is-eq option LOCK-2-WEEKS)
                                    TWO_WEEKS
                                    (if (is-eq option LOCK-1-MONTH)
                                        ONE_MONTH
                                        (if (is-eq option LOCK-3-MONTHS)
                                            THREE_MONTHS
                                            (if (is-eq option LOCK-6-MONTHS)
                                                SIX_MONTHS
                                                (if (is-eq option LOCK-9-MONTHS)
                                                    NINE_MONTHS
                                                    (if (is-eq option LOCK-1-YEAR)
                                                        ONE_YEAR
                                                        u0 ;; Invalid option returns 0
                                                    )
                                                )
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            )
        )
    )
)

;; Create a new deposit with independent lock period and optional name
;; @param amount: Amount of STX to deposit (in microstacks)
;; @param lock-option: Time duration option (1-13, see constants above)
;; @param name: Optional name for the deposit (max 50 characters)
(define-public (create-deposit
        (amount uint)
        (lock-option uint)
        (name (optional (string-ascii 50)))
    )
    (let (
            (sender tx-sender)
            (lock-blocks (get-lock-duration lock-option))
            (deposit-id (+ (var-get deposit-counter) u1))
            (current-deposits (default-to { deposit-ids: (list) }
                (map-get? user-deposit-list { user: sender })
            ))
        )
        ;; Validate inputs
        (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))
        (asserts! (> lock-blocks u0) (err ERR-INVALID-LOCK-OPTION))
        (asserts! (>= amount (calculate-minimum-stx-amount))
            (err ERR-BELOW-MINIMUM-DEPOSIT)
        )

        ;; Validate name if provided
        (match name
            some-name (asserts! (and (> (len some-name) u0) (<= (len some-name) u50))
                (err ERR-INVALID-GROUP-NAME) ;; Reuse existing error code
            )
            true
        )

        ;; Transfer STX from user to contract
        (try! (stx-transfer? amount sender (as-contract tx-sender)))

        ;; Create new deposit record
        (map-set user-deposits {
            user: sender,
            deposit-id: deposit-id,
        } {
            amount: amount,
            deposit-block: stacks-block-height,
            lock-expiry: (+ stacks-block-height lock-blocks),
            lock-option: lock-option,
            withdrawn: false,
            name: name,
        })

        ;; Update user's deposit list
        (let ((updated-ids (unwrap!
                (as-max-len?
                    (append (get deposit-ids current-deposits) deposit-id)
                    u100
                )
                (err ERR-INVALID-AMOUNT)
                ;; Reuse error code for max deposits reached
            )))
            (map-set user-deposit-list { user: sender } { deposit-ids: updated-ids })
        )

        ;; Update deposit counter
        (var-set deposit-counter deposit-id)

        (ok deposit-id)
    )
)

;; Legacy deposit function (backward compatibility) - overwrites single deposit
;; @param amount: Amount of STX to deposit (in microstacks)
;; @param lock-option: Time duration option (1-13, see constants above)
(define-public (deposit
        (amount uint)
        (lock-option uint)
    )
    (let (
            (sender tx-sender)
            (lock-blocks (get-lock-duration lock-option))
        )
        (if (<= amount u0)
            (err ERR-INVALID-AMOUNT)
            (if (is-eq lock-blocks u0)
                (err ERR-INVALID-LOCK-OPTION)
                (if (< amount (calculate-minimum-stx-amount))
                    (err ERR-BELOW-MINIMUM-DEPOSIT)
                    (begin
                        ;; Transfer STX from user to contract
                        (try! (stx-transfer? amount sender (as-contract tx-sender)))
                        ;; Store deposit information with calculated lock expiry (legacy single deposit)
                        (map-set deposits { user: sender } {
                            amount: amount,
                            deposit-block: stacks-block-height,
                            lock-expiry: (+ stacks-block-height lock-blocks),
                        })
                        (ok amount)
                    )
                )
            )
        )
    )
)

;; Withdraw from a specific deposit after lock period expires
;; @param deposit-id: ID of the specific deposit to withdraw from
;; @param amount: Amount of STX to withdraw (in microstacks)
(define-public (withdraw-deposit
        (deposit-id uint)
        (amount uint)
    )
    (let (
            (sender tx-sender)
            (deposit-data (unwrap!
                (map-get? user-deposits {
                    user: sender,
                    deposit-id: deposit-id,
                })
                (err ERR-NO-DEPOSIT)
            ))
        )
        (let (
                (deposit-amount (get amount deposit-data))
                (lock-expiry (get lock-expiry deposit-data))
                (is-withdrawn (get withdrawn deposit-data))
            )
            ;; Check if deposit exists and hasn't been withdrawn
            (asserts! (not is-withdrawn) (err ERR-NO-DEPOSIT))
            (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))

            ;; Check if lock period has expired
            (asserts! (>= stacks-block-height lock-expiry) (err ERR-STILL-LOCKED))

            ;; Check if withdrawal amount is valid
            (asserts! (<= amount deposit-amount) (err ERR-INSUFFICIENT-BALANCE))

            ;; Transfer STX from contract back to user
            (try! (as-contract (stx-transfer? amount tx-sender sender)))

            ;; Update deposit record
            (if (is-eq amount deposit-amount)
                ;; Full withdrawal - mark as withdrawn
                (map-set user-deposits {
                    user: sender,
                    deposit-id: deposit-id,
                }
                    (merge deposit-data { withdrawn: true })
                )
                ;; Partial withdrawal - update amount
                (map-set user-deposits {
                    user: sender,
                    deposit-id: deposit-id,
                }
                    (merge deposit-data { amount: (- deposit-amount amount) })
                )
            )

            (ok amount)
        )
    )
)

;; Legacy withdraw function (backward compatibility) - single deposit system
;; @param amount: Amount of STX to withdraw (in microstacks)
(define-public (withdraw (amount uint))
    (let ((sender tx-sender))
        (let ((deposit-data (map-get? deposits { user: sender })))
            (match deposit-data
                data (let (
                        (user-balance (get amount data))
                        (lock-expiry (get lock-expiry data))
                        (deposit-block (get deposit-block data))
                    )
                    ;; Check if lock period has expired
                    (if (< stacks-block-height lock-expiry)
                        (err ERR-STILL-LOCKED)
                        (if (> amount user-balance)
                            (err ERR-INSUFFICIENT-BALANCE)
                            (begin
                                ;; Transfer STX from contract back to user
                                (try! (as-contract (stx-transfer? amount tx-sender sender)))
                                ;; Update or delete deposit record
                                (if (is-eq amount user-balance)
                                    ;; Full withdrawal - delete the record
                                    (map-delete deposits { user: sender })
                                    ;; Partial withdrawal - update the record
                                    (map-set deposits { user: sender } {
                                        amount: (- user-balance amount),
                                        deposit-block: deposit-block,
                                        lock-expiry: lock-expiry,
                                    })
                                )
                                (ok amount)
                            )
                        )
                    )
                )
                (err ERR-NO-DEPOSIT)
            )
        )
    )
)

;; Admin functionality (kept for backward compatibility but not used in new system)
;; Note: This admin constant is not used in the current contract logic
;; It's kept for backward compatibility only - can be removed in future versions
(define-constant admin tx-sender) ;; Reset to deployer address for fresh deployment

;; Read-only helper to check complete deposit information
(define-read-only (get-deposit (user principal))
    (default-to {
        amount: u0,
        deposit-block: u0,
        lock-expiry: u0,
    }
        (map-get? deposits { user: user })
    )
)

;; Read-only helper to get user balance
(define-read-only (get-balance (user principal))
    (get amount (get-deposit user))
)

;; Read-only helper to get lock expiry block height for a user
(define-read-only (get-lock-expiry (user principal))
    (get lock-expiry (get-deposit user))
)

;; Read-only helper to check if a user's deposit is currently locked
(define-read-only (is-locked (user principal))
    (let ((expiry (get-lock-expiry user)))
        (and (> expiry u0) (< stacks-block-height expiry))
    )
)

;; Read-only helper to get remaining lock time in blocks
(define-read-only (get-remaining-lock-blocks (user principal))
    (let ((expiry (get-lock-expiry user)))
        (if (and (> expiry u0) (< stacks-block-height expiry))
            (- expiry stacks-block-height)
            u0
        )
    )
)

;; =============================================================================
;; MULTIPLE DEPOSITS READ-ONLY FUNCTIONS
;; =============================================================================

;; Get all deposit IDs for a user
(define-read-only (get-user-deposit-ids (user principal))
    (default-to { deposit-ids: (list) }
        (map-get? user-deposit-list { user: user })
    )
)

;; Get specific deposit information
(define-read-only (get-user-deposit
        (user principal)
        (deposit-id uint)
    )
    (map-get? user-deposits {
        user: user,
        deposit-id: deposit-id,
    })
)

;; Get total balance across all active deposits for a user
;; NOTE: This function is deprecated due to Clarity fold limitations with user context
;; Frontend should calculate total by fetching all deposits and summing amounts
(define-read-only (get-total-user-balance (user principal))
    u0
    ;; Returns 0 - use frontend calculation instead
)

;; Get count of active deposits for a user
;; NOTE: This function is deprecated due to Clarity fold limitations with user context
;; Frontend should calculate count by fetching all deposits and filtering
(define-read-only (get-active-deposit-count (user principal))
    u0
    ;; Returns 0 - use frontend calculation instead
)

;; Check if a specific deposit is locked
(define-read-only (is-deposit-locked
        (user principal)
        (deposit-id uint)
    )
    (let ((deposit-data (map-get? user-deposits {
            user: user,
            deposit-id: deposit-id,
        })))
        (match deposit-data
            data (and
                (not (get withdrawn data))
                (< stacks-block-height (get lock-expiry data))
            )
            false
        )
    )
)

;; Get remaining blocks for a specific deposit
(define-read-only (get-deposit-remaining-blocks
        (user principal)
        (deposit-id uint)
    )
    (let ((deposit-data (map-get? user-deposits {
            user: user,
            deposit-id: deposit-id,
        })))
        (match deposit-data
            data (if (and
                    (not (get withdrawn data))
                    (< stacks-block-height (get lock-expiry data))
                )
                (- (get lock-expiry data) stacks-block-height)
                u0
            )
            u0
        )
    )
)

;; Get current deposit counter (total deposits created)
(define-read-only (get-deposit-counter)
    (var-get deposit-counter)
)

;; Get all unlocked deposits for a user (ready for withdrawal)
;; NOTE: This function is deprecated due to Clarity filter limitations with user context
;; Frontend should fetch all deposits and filter by isLocked status
(define-read-only (get-user-unlocked-deposits (user principal))
    (list)
    ;; Returns empty list - use frontend filtering instead
)

;; =============================================================================
;; PRICE ORACLE AND MINIMUM DEPOSIT MANAGEMENT
;; =============================================================================

;; Calculate minimum STX amount required for $2 USD
;; Returns amount in microstacks
(define-read-only (calculate-minimum-stx-amount)
    (let ((stx-price (var-get stx-usd-price)))
        (if (> stx-price u0)
            ;; Calculate: ($2.00 * 1,000,000 microstacks) / (price * 1,000,000 precision)
            ;; Simplified: (2,000,000 * 1,000,000) / price
            (/ (* USD-MINIMUM-DEPOSIT u1000000) stx-price)
            u4000000 ;; Fallback: 4 STX if price is invalid
        )
    )
)

;; Get current STX/USD price (6 decimal precision)
(define-read-only (get-stx-usd-price)
    (var-get stx-usd-price)
)

;; Get USD minimum deposit amount
(define-read-only (get-usd-minimum-deposit)
    USD-MINIMUM-DEPOSIT
)

;; Get current minimum deposit amount in STX (microstacks)
(define-read-only (get-minimum-deposit-amount)
    (calculate-minimum-stx-amount)
)

;; Get price oracle authority
(define-read-only (get-price-oracle-authority)
    (var-get price-oracle-authority)
)

;; Get last price update block
(define-read-only (get-last-price-update)
    (var-get last-price-update)
)

;; Update STX/USD price (oracle authority only)
;; @param new-price: New STX price in USD with 6 decimal precision
(define-public (update-stx-price (new-price uint))
    (begin
        ;; Only price oracle authority can update
        (asserts! (is-eq tx-sender (var-get price-oracle-authority))
            (err ERR-UNAUTHORIZED)
        )
        ;; Price must be positive and reasonable (between $0.01 and $100.00)
        (asserts! (and (>= new-price u10000) (<= new-price u100000000))
            (err ERR-INVALID-AMOUNT)
        )

        ;; Update price and timestamp
        (var-set stx-usd-price new-price)
        (var-set last-price-update stacks-block-height)

        (ok new-price)
    )
)

;; Update price oracle authority (current authority only)
;; @param new-authority: New price oracle authority principal
(define-public (update-price-oracle-authority (new-authority principal))
    (begin
        ;; Only current authority can transfer
        (asserts! (is-eq tx-sender (var-get price-oracle-authority))
            (err ERR-UNAUTHORIZED)
        )
        (var-set price-oracle-authority new-authority)
        (ok new-authority)
    )
)

;; Validate if amount meets minimum deposit requirement
(define-read-only (is-valid-deposit-amount (amount uint))
    (>= amount (calculate-minimum-stx-amount))
)

;; Get deposit validation info
(define-read-only (get-deposit-validation-info (amount uint))
    (let (
            (minimum-stx (calculate-minimum-stx-amount))
            (stx-price (var-get stx-usd-price))
            (usd-value (if (> stx-price u0)
                (/ (* amount stx-price) u1000000)
                u0
            ))
        )
        {
            minimum-stx-required: minimum-stx,
            stx-price: stx-price,
            usd-minimum: USD-MINIMUM-DEPOSIT,
            deposit-usd-value: usd-value,
            is-valid: (>= amount minimum-stx),
            last-price-update: (var-get last-price-update),
        }
    )
)

;; =============================================================================
;; GROUP SAVINGS FUNCTIONALITY
;; =============================================================================

;; Create a new savings group
;; @param name: Group name (max 50 characters)
;; @param lock-option: Time duration option (1-13, same as individual deposits)
;; @param threshold: Optional maximum number of members (none = unlimited)
(define-public (create-group
        (name (string-ascii 50))
        (lock-option uint)
        (threshold (optional uint))
    )
    (let (
            (creator tx-sender)
            (group-id (+ (var-get group-counter) u1))
            (lock-blocks (get-lock-duration lock-option))
        )
        ;; Validate inputs
        (asserts! (> (len name) u0) (err ERR-INVALID-GROUP-NAME))
        (asserts! (<= (len name) u50) (err ERR-INVALID-GROUP-NAME))
        (asserts! (> lock-blocks u0) (err ERR-INVALID-LOCK-OPTION))

        ;; Validate threshold if provided
        (match threshold
            some-threshold (asserts! (and (> some-threshold u0) (<= some-threshold u100))
                (err ERR-INVALID-AMOUNT)
            )
            true
        )

        ;; Create the group
        (map-set savings-groups { group-id: group-id } {
            creator: creator,
            name: name,
            duration: lock-blocks,
            threshold: threshold,
            member-count: u1,
            closed: false,
            locked: false,
            start-block: none,
            lock-expiry: none,
        })

        ;; Add creator as first member
        (map-set group-members {
            group-id: group-id,
            member: creator,
        } {
            amount: u0,
            deposit-block: u0,
            joined-block: stacks-block-height,
        })

        ;; Initialize member list with creator
        (map-set group-member-list { group-id: group-id } { members: (list creator) })

        ;; Update group counter
        (var-set group-counter group-id)

        (ok group-id)
    )
)

;; Legacy join function (backward compatibility) - joins without deposit
;; @param group-id: ID of the group to join
;; Note: This is kept for backward compatibility but new UI should use join-group-with-deposit
(define-public (join-group (group-id uint))
    (let (
            (joiner tx-sender)
            (group-data (unwrap! (map-get? savings-groups { group-id: group-id })
                (err ERR-GROUP-NOT-FOUND)
            ))
            (current-members (default-to { members: (list) }
                (map-get? group-member-list { group-id: group-id })
            ))
        )
        ;; Check if group exists and is not closed
        (asserts! (not (get closed group-data)) (err ERR-GROUP-LOCKED))

        ;; Check if user is already a member
        (asserts!
            (is-none (map-get? group-members {
                group-id: group-id,
                member: joiner,
            }))
            (err ERR-ALREADY-JOINED)
        )

        ;; Check if group has space (if threshold is set)
        (match (get threshold group-data)
            some-threshold (asserts! (< (get member-count group-data) some-threshold)
                (err ERR-GROUP-FULL)
            )
            true
        )

        ;; Add member to group without deposit
        (map-set group-members {
            group-id: group-id,
            member: joiner,
        } {
            amount: u0,
            deposit-block: u0,
            joined-block: stacks-block-height,
        })

        ;; Update member list
        (let ((updated-members (unwrap!
                (as-max-len? (append (get members current-members) joiner) u100)
                (err ERR-GROUP-FULL)
            )))
            (map-set group-member-list { group-id: group-id } { members: updated-members })
        )

        ;; Update member count and check if threshold reached
        (let ((new-member-count (+ (get member-count group-data) u1)))
            (map-set savings-groups { group-id: group-id }
                (merge group-data { member-count: new-member-count })
            )

            ;; Auto-close if threshold reached (but don't start lock yet)
            (match (get threshold group-data)
                some-threshold (if (>= new-member-count some-threshold)
                    (begin
                        (map-set savings-groups { group-id: group-id }
                            (merge group-data {
                                member-count: new-member-count,
                                closed: true,
                            })
                        )
                        (ok "joined-and-closed")
                    )
                    (ok "joined")
                )
                (ok "joined")
            )
        )
    )
)

;; Join an existing savings group with initial deposit
;; @param group-id: ID of the group to join
;; @param amount: Initial deposit amount (required to join)
(define-public (join-group-with-deposit
        (group-id uint)
        (amount uint)
    )
    (let (
            (joiner tx-sender)
            (group-data (unwrap! (map-get? savings-groups { group-id: group-id })
                (err ERR-GROUP-NOT-FOUND)
            ))
            (current-members (default-to { members: (list) }
                (map-get? group-member-list { group-id: group-id })
            ))
        )
        ;; Validate deposit amount
        (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))

        ;; Check if group exists and is not closed
        (asserts! (not (get closed group-data)) (err ERR-GROUP-LOCKED))

        ;; Check if user is already a member
        (asserts!
            (is-none (map-get? group-members {
                group-id: group-id,
                member: joiner,
            }))
            (err ERR-ALREADY-JOINED)
        )

        ;; Check if group has space (if threshold is set)
        (match (get threshold group-data)
            some-threshold (asserts! (< (get member-count group-data) some-threshold)
                (err ERR-GROUP-FULL)
            )
            true
        )

        ;; Transfer STX from user to contract (required deposit to join)
        (try! (stx-transfer? amount joiner (as-contract tx-sender)))

        ;; Add member to group with initial deposit
        (map-set group-members {
            group-id: group-id,
            member: joiner,
        } {
            amount: amount,
            deposit-block: stacks-block-height,
            joined-block: stacks-block-height,
        })

        ;; Update member list
        (let ((updated-members (unwrap!
                (as-max-len? (append (get members current-members) joiner) u100)
                (err ERR-GROUP-FULL)
            )))
            (map-set group-member-list { group-id: group-id } { members: updated-members })
        )

        ;; Update member count and check if threshold reached
        (let ((new-member-count (+ (get member-count group-data) u1)))
            (map-set savings-groups { group-id: group-id }
                (merge group-data { member-count: new-member-count })
            )

            ;; Auto-close if threshold reached (but don't start lock yet)
            (match (get threshold group-data)
                some-threshold (if (>= new-member-count some-threshold)
                    (begin
                        (map-set savings-groups { group-id: group-id }
                            (merge group-data {
                                member-count: new-member-count,
                                closed: true,
                            })
                        )
                        (ok "joined-and-closed")
                    )
                    (ok "joined")
                )
                (ok "joined")
            )
        )
    )
)

;; Close a group to prevent new members (creator only)
;; @param group-id: ID of the group to close
;; This prevents new members from joining but doesn't start the lock period yet
(define-public (close-group (group-id uint))
    (let (
            (closer tx-sender)
            (group-data (unwrap! (map-get? savings-groups { group-id: group-id })
                (err ERR-GROUP-NOT-FOUND)
            ))
        )
        ;; Only creator can close the group
        (asserts! (is-eq closer (get creator group-data)) (err ERR-NOT-CREATOR))

        ;; Group must not be closed already
        (asserts! (not (get closed group-data)) (err ERR-GROUP-LOCKED))

        ;; Close the group (prevent new members)
        (map-set savings-groups { group-id: group-id }
            (merge group-data { closed: true })
        )

        (ok true)
    )
)

;; Start the savings period for a group (creator only)
;; @param group-id: ID of the group to start
;; This starts the lock period countdown - group must be closed first
(define-public (start-group-lock (group-id uint))
    (let (
            (starter tx-sender)
            (group-data (unwrap! (map-get? savings-groups { group-id: group-id })
                (err ERR-GROUP-NOT-FOUND)
            ))
        )
        ;; Only creator can start the lock
        (asserts! (is-eq starter (get creator group-data)) (err ERR-NOT-CREATOR))

        ;; Group must be closed before starting
        (asserts! (get closed group-data) (err ERR-GROUP-NOT-STARTED))

        ;; Group must not be locked already
        (asserts! (not (get locked group-data)) (err ERR-GROUP-LOCKED))

        ;; Start the lock period
        (map-set savings-groups { group-id: group-id }
            (merge group-data {
                locked: true,
                start-block: (some stacks-block-height),
                lock-expiry: (some (+ stacks-block-height (get duration group-data))),
            })
        )

        (ok true)
    )
)

;; Deposit STX into a group vault (members only, works even when locked)
;; @param group-id: ID of the group
;; @param amount: Amount of STX to deposit (in microstacks)
(define-public (group-deposit
        (group-id uint)
        (amount uint)
    )
    (let (
            (depositor tx-sender)
            (group-data (unwrap! (map-get? savings-groups { group-id: group-id })
                (err ERR-GROUP-NOT-FOUND)
            ))
            (member-data (unwrap!
                (map-get? group-members {
                    group-id: group-id,
                    member: depositor,
                })
                (err ERR-NOT-MEMBER)
            ))
        )
        ;; Validate amount
        (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))

        ;; Only existing members can deposit (no restriction on group lock status)
        ;; This allows members to add funds even when group is locked or closed

        ;; Transfer STX from user to contract
        (try! (stx-transfer? amount depositor (as-contract tx-sender)))

        ;; Update member's deposit info
        (map-set group-members {
            group-id: group-id,
            member: depositor,
        }
            (merge member-data {
                amount: (+ (get amount member-data) amount),
                deposit-block: stacks-block-height,
            })
        )

        (ok amount)
    )
)

;; Withdraw STX from a group vault after lock period expires
;; @param group-id: ID of the group
;; @param amount: Amount of STX to withdraw (in microstacks)
(define-public (group-withdraw
        (group-id uint)
        (amount uint)
    )
    (let (
            (withdrawer tx-sender)
            (group-data (unwrap! (map-get? savings-groups { group-id: group-id })
                (err ERR-GROUP-NOT-FOUND)
            ))
            (member-data (unwrap!
                (map-get? group-members {
                    group-id: group-id,
                    member: withdrawer,
                })
                (err ERR-NOT-MEMBER)
            ))
            (lock-expiry (unwrap! (get lock-expiry group-data) (err ERR-GROUP-NOT-STARTED)))
        )
        ;; Validate amount
        (asserts! (> amount u0) (err ERR-INVALID-AMOUNT))

        ;; Check if lock period has expired
        (asserts! (>= stacks-block-height lock-expiry) (err ERR-STILL-LOCKED))

        ;; Check if user has sufficient balance
        (asserts! (>= (get amount member-data) amount)
            (err ERR-INSUFFICIENT-BALANCE)
        )

        ;; Transfer STX from contract back to user
        (try! (as-contract (stx-transfer? amount tx-sender withdrawer)))

        ;; Update member's balance
        (let ((new-amount (- (get amount member-data) amount)))
            (if (is-eq new-amount u0)
                ;; Remove member if balance is zero
                (map-delete group-members {
                    group-id: group-id,
                    member: withdrawer,
                })
                ;; Update member's balance
                (map-set group-members {
                    group-id: group-id,
                    member: withdrawer,
                }
                    (merge member-data { amount: new-amount })
                )
            )
        )

        (ok amount)
    )
)

;; =============================================================================
;; GROUP SAVINGS READ-ONLY FUNCTIONS
;; =============================================================================

;; Get group information
(define-read-only (get-group (group-id uint))
    (map-get? savings-groups { group-id: group-id })
)

;; Get member information for a specific group
(define-read-only (get-group-member
        (group-id uint)
        (member principal)
    )
    (map-get? group-members {
        group-id: group-id,
        member: member,
    })
)

;; Get all members of a group
(define-read-only (get-group-members (group-id uint))
    (default-to { members: (list) }
        (map-get? group-member-list { group-id: group-id })
    )
)

;; Get member's balance in a group
(define-read-only (get-group-balance
        (group-id uint)
        (member principal)
    )
    (match (map-get? group-members {
        group-id: group-id,
        member: member,
    })
        some-data (get amount some-data)
        u0
    )
)

;; Check if a group's lock has expired
(define-read-only (is-group-unlocked (group-id uint))
    (match (map-get? savings-groups { group-id: group-id })
        some-group (match (get lock-expiry some-group)
            some-expiry (>= stacks-block-height some-expiry)
            false
        )
        false
    )
)

;; Get remaining lock time for a group in blocks
(define-read-only (get-group-remaining-blocks (group-id uint))
    (match (map-get? savings-groups { group-id: group-id })
        some-group (match (get lock-expiry some-group)
            some-expiry (if (< stacks-block-height some-expiry)
                (- some-expiry stacks-block-height)
                u0
            )
            u0
        )
        u0
    )
)

;; Get current group counter (total number of groups created)
(define-read-only (get-group-counter)
    (var-get group-counter)
)

;; Check if user is a member of a group
(define-read-only (is-group-member
        (group-id uint)
        (member principal)
    )
    (is-some (map-get? group-members {
        group-id: group-id,
        member: member,
    }))
)
