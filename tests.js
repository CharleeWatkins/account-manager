const { setupDemoData } = require("./demo_data");

let passed = 0;
let failed = 0;

function check(name, condition) {
    if (condition) {
        console.log(`  PASS: ${name}`);
        passed++;
    } else {
        console.log(`  FAIL: ${name}`);
        failed++;
    }
}

function silenceConsole(fn) {
    const original = console.log;
    console.log = () => {};
    try {
        return fn();
    } finally {
        console.log = original;
    }
}

function runTests() {
    console.log("\n=== TEST SUITE ===\n");

    console.log("--- Seed Sanity ---");
    {
        const bank = setupDemoData();
        const alice = bank.findAccount("Alice");
        const bob = bank.findAccount("Bob");

        check("Alice exists with balance 1000", alice && alice.balance === 1000);
        check("Bob exists with balance 500", bob && bob.balance === 500);
        check("Alice has 2 outgoing txns", alice.totalOutgoingTransactions === 2);
        check("Alice total outgoing = 500", alice.totalOutgoingTransactionAmount === 500);
        check("Alice average = 250", alice.averageTransactionSize === 250);
        check("Alice history has 2 entries", alice.successfulOutgoingHistory.length === 2);
    }

    // DEPOSIT
    console.log("\n--- Deposit ---");
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.deposit("Alice", 100));
        check("Deposit 100 to Alice succeeds", r.success);
        check("Alice balance = 1100", bank.findAccount("Alice").balance === 1100);
    }
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.deposit("Alice", -50));
        check("Deposit -50 fails", !r.success);
    }
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.deposit("Alice", 0));
        check("Deposit 0 fails", !r.success);
    }
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.deposit("Ghost", 100));
        check("Deposit to unknown account fails", !r.success);
    }

    // WITHDRAWAL — NORMAL
    console.log("\n--- Withdrawal: Normal ---");
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.withdraw("Alice", 100));
        check("Withdraw 100 from Alice succeeds", r.success);
        check("Alice balance = 900", bank.findAccount("Alice").balance === 900);
        check("Alice now has 3 outgoing txns",
            bank.findAccount("Alice").totalOutgoingTransactions === 3);
    }

    // WITHDRAWAL — INSUFFICIENT FUNDS
    console.log("\n--- Withdrawal: Insufficient Funds ---");
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.withdraw("Alice", 2000));
        check("Withdraw 2000 fails", !r.success);
        check("Reason mentions insufficient funds",
            r.message.includes("Insufficient funds"));
        check("Alice balance unchanged",
            bank.findAccount("Alice").balance === 1000);
    }

    // WITHDRAWAL — SPIKE
    console.log("\n--- Withdrawal: Spike Rule ---");
    {
        const bank = setupDemoData();
        // Alice avg = 250, threshold = 1250. 1300 > 1250 → block.
        const r = silenceConsole(() => bank.withdraw("Alice", 1300));
        check("Withdraw 1300 fails (spike)", !r.success);
        check("Reason mentions too large", r.message.includes("too large"));
        check("Alice balance unchanged",
            bank.findAccount("Alice").balance === 1000);
    }
    {
        const bank = setupDemoData();
        // 1250 == threshold → NOT > threshold → should pass.
        const r = silenceConsole(() => bank.withdraw("Alice", 1250));
        check("Withdraw exactly at threshold passes", r.success);
    }
    {
        const bank = setupDemoData();
        // 1251 > threshold → block.
        const r = silenceConsole(() => bank.withdraw("Alice", 1251));
        check("Withdraw 1 above threshold fails", !r.success);
    }

    // WITHDRAWAL — RAPID
    console.log("\n--- Withdrawal: Rapid Rule ---");
    {
        const bank = setupDemoData();
        const t = bank.now();
        const r1 = silenceConsole(() => bank.withdraw("Alice", 50, t));
        const r2 = silenceConsole(() => bank.withdraw("Alice", 50, t + 1));
        const r3 = silenceConsole(() => bank.withdraw("Alice", 50, t + 2));
        const r4 = silenceConsole(() => bank.withdraw("Alice", 50, t + 3));

        check("1st rapid withdrawal passes", r1.success);
        check("2nd rapid withdrawal passes", r2.success);
        check("3rd rapid withdrawal passes", r3.success);
        check("4th rapid withdrawal blocked", !r4.success);
        check("Reason mentions too many", r4.message.includes("Too many"));
    }
    {
        // After the 10-second window, the withdrawals should pass again.
        const bank = setupDemoData();
        const t = bank.now();
        silenceConsole(() => bank.withdraw("Alice", 50, t));
        silenceConsole(() => bank.withdraw("Alice", 50, t + 1));
        silenceConsole(() => bank.withdraw("Alice", 50, t + 2));
        const r4 = silenceConsole(() => bank.withdraw("Alice", 50, t + 12));
        check("Withdrawal after 10s window passes", r4.success);
    }

    // TRANSFER — NORMAL
    console.log("\n--- Transfer: Normal ---");
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.transfer("Alice", "Bob", 100));
        check("Transfer 100 Alice -> Bob succeeds", r.success);
        check("Alice balance = 900", bank.findAccount("Alice").balance === 900);
        check("Bob balance = 600", bank.findAccount("Bob").balance === 600);
        check("Alice outgoing txns = 3",
            bank.findAccount("Alice").totalOutgoingTransactions === 3);
        check("Bob outgoing txns = 0 (receiving is not outgoing)",
            bank.findAccount("Bob").totalOutgoingTransactions === 0);
    }

    // TRANSFER — BLOCKED CASES
    console.log("\n--- Transfer: Blocked Cases ---");
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.transfer("Alice", "Alice", 100));
        check("Transfer to self fails", !r.success);
    }
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.transfer("Alice", "Ghost", 100));
        check("Transfer to unknown recipient fails", !r.success);
    }
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.transfer("Ghost", "Bob", 100));
        check("Transfer from unknown sender fails", !r.success);
    }
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.transfer("Alice", "Bob", -10));
        check("Negative transfer fails", !r.success);
    }
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.transfer("Alice", "Bob", 0));
        check("Zero transfer fails", !r.success);
    }
    {
        const bank = setupDemoData();
        const r = silenceConsole(() => bank.transfer("Alice", "Bob", 2000));
        check("Transfer over balance fails", !r.success);
        check("Reason mentions insufficient funds",
            r.message.includes("Insufficient funds"));
    }

    // RAPID RULE INCLUDES TRANSFERS
    console.log("\n--- Rapid Rule: Transfers Count Too ---");
    {
        const bank = setupDemoData();
        const t = bank.now();
        silenceConsole(() => bank.transfer("Alice", "Bob", 50, t));
        silenceConsole(() => bank.transfer("Alice", "Bob", 50, t + 1));
        silenceConsole(() => bank.transfer("Alice", "Bob", 50, t + 2));
        const r4 = silenceConsole(() => bank.transfer("Alice", "Bob", 50, t + 3));
        check("4th rapid transfer blocked", !r4.success);
    }
    {
        
        const bank = setupDemoData();
        const t = bank.now();
        silenceConsole(() => bank.withdraw("Alice", 50, t));
        silenceConsole(() => bank.withdraw("Alice", 50, t + 1));
        silenceConsole(() => bank.transfer("Alice", "Bob", 50, t + 2));
        const r4 = silenceConsole(() => bank.withdraw("Alice", 50, t + 3));
        check("Mixed outgoing txns trigger rapid rule", !r4.success);
    }

    // DEPOSITS DO NOT CORRUPT OUTGOING STATS
    console.log("\n--- Deposits Do Not Corrupt Outgoing Stats ---");
    {
        const bank = setupDemoData();
        const alice = bank.findAccount("Alice");
        const avgBefore = alice.averageTransactionSize;
        const totalBefore = alice.totalOutgoingTransactionAmount;
        const countBefore = alice.totalOutgoingTransactions;
        const historyBefore = alice.successfulOutgoingHistory.length;

        silenceConsole(() => bank.deposit("Alice", 5000));

        check("Average unchanged after deposit",
            alice.averageTransactionSize === avgBefore);
        check("Total outgoing amount unchanged after deposit",
            alice.totalOutgoingTransactionAmount === totalBefore);
        check("Outgoing count unchanged after deposit",
            alice.totalOutgoingTransactions === countBefore);
        check("Outgoing history length unchanged after deposit",
            alice.successfulOutgoingHistory.length === historyBefore);
    }

    // FAILED TRANSACTIONS ARE NOT LOGGED
    console.log("\n--- Failed Transactions Are Not Logged ---");
    {
        const bank = setupDemoData();
        const alice = bank.findAccount("Alice");
        const countBefore = alice.successfulOutgoingHistory.length;

        // These are all fails for different reasons.
        silenceConsole(() => bank.withdraw("Alice", 2000));   // insufficient
        silenceConsole(() => bank.withdraw("Alice", 1300));   // spike
        silenceConsole(() => bank.withdraw("Alice", -50));    // invalid amount

        check("Failed attempts do not enter history",
            alice.successfulOutgoingHistory.length === countBefore);
        check("Failed attempts do not change total outgoing count",
            alice.totalOutgoingTransactions === 2);
    }

   
    console.log("\n=== SUMMARY ===");
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total:  ${passed + failed}`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

runTests();