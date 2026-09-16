class Account {
    constructor(id, initialBalance = 0) {
        this.id = id;
        this.balance = initialBalance;
        this.successfulOutgoingHistory = [];   // [{ amount, type, timestamp }]
        this.totalOutgoingTransactions = 0;
        this.totalOutgoingTransactionAmount = 0;
        this.averageTransactionSize = 0;
    }
}

class BankSystem {
    constructor() {
        this.accounts = new Map();      // id -> Account
        this.RAPID_LIMIT = 3;           // blocked at count >= 3
        this.TIME_WINDOW = 10;          // seconds
        this.SPIKE_MULTIPLIER = 5;      // 5 x average
    }

    // Helpers
    now() {
        return Math.floor(Date.now() / 1000);
    }

    findAccount(userId) {
        return this.accounts.get(userId) || null;
    }

    createAccount(userId, initialBalance = 0) {
        const account = new Account(userId, initialBalance);
        this.accounts.set(userId, account);
        return account;
    }

    // CHECKING TRANSACTION RULES
    checkTransactionRules(account, amount, transactionType, currentTimestamp) {
        // Rule 1: Sufficient funds
        if (amount > account.balance) {
            return "FAIL: Insufficient funds";
        }

        // Rule 2: Rapid outgoing transactions
        if (transactionType === "WITHDRAWAL" || transactionType === "TRANSFER") {
            let count = 0;
            const history = account.successfulOutgoingHistory;
            for (let i = 0; i < history.length; i++) {
                const t = history[i];
                if ((currentTimestamp - t.timestamp) <= this.TIME_WINDOW) {
                    count++;
                }
            }
            if (count >= this.RAPID_LIMIT) {
                return "FAIL: Too many transactions in 10 seconds";
            }
        }

        // Rule 3: Unusual spending spike
        if (account.totalOutgoingTransactions > 0) {
            const average =
                account.totalOutgoingTransactionAmount /
                account.totalOutgoingTransactions;
            const spikeThreshold = this.SPIKE_MULTIPLIER * average;
            if (amount > spikeThreshold) {
                return "FAIL: Transaction amount is too large";
            }
        }

        return "PASS";
    }

    // UPDATING THE ACCOUNT INFORMATION
    updateAccountInformation(account, amount, transactionType, currentTimestamp) {
        if (transactionType !== "WITHDRAWAL" && transactionType !== "TRANSFER") {
            return;
        }

        account.successfulOutgoingHistory.push({
            amount: amount,
            type: transactionType,
            timestamp: currentTimestamp
        });

        account.totalOutgoingTransactions += 1;
        account.totalOutgoingTransactionAmount += amount;
        account.averageTransactionSize =
            account.totalOutgoingTransactionAmount /
            account.totalOutgoingTransactions;
    }


    // DEPOSIT
    deposit(userId, depositAmount) {
        const account = this.findAccount(userId);
        if (!account) {
            const msg = "FAIL: Account not found";
            console.log(msg);
            return { success: false, message: msg };
        }

        if (depositAmount <= 0) {
            const msg = "FAIL: Deposit amount must be greater than 0";
            console.log(msg);
            return { success: false, message: msg };
        }

        account.balance += depositAmount;

        console.log("Deposit successful.");
        console.log(`New balance: ${account.balance}`);
        return { success: true, balance: account.balance };
    }

    // WITHDRAW
    withdraw(userId, withdrawalAmount, currentTimestamp = this.now()) {
        const account = this.findAccount(userId);
        if (!account) {
            const msg = "FAIL: Account not found";
            console.log(msg);
            return { success: false, message: msg };
        }

        if (withdrawalAmount <= 0) {
            const msg = "FAIL: Withdrawal amount must be greater than 0";
            console.log(msg);
            return { success: false, message: msg };
        }

        const ruleResult = this.checkTransactionRules(
            account, withdrawalAmount, "WITHDRAWAL", currentTimestamp
        );

        if (ruleResult !== "PASS") {
            console.log(ruleResult);
            return { success: false, message: ruleResult };
        }

        account.balance -= withdrawalAmount;
        this.updateAccountInformation(
            account, withdrawalAmount, "WITHDRAWAL", currentTimestamp
        );

        console.log("Withdrawal successful.");
        console.log(`New balance: ${account.balance}`);
        return { success: true, balance: account.balance };
    }

    // TRANSFER
    transfer(senderId, recipientId, transferAmount, currentTimestamp = this.now()) {
        const sender = this.findAccount(senderId);
        const recipient = this.findAccount(recipientId);

        if (!sender) {
            const msg = "FAIL: Sender account not found";
            console.log(msg);
            return { success: false, message: msg };
        }

        if (!recipient) {
            const msg = "FAIL: Recipient account not found";
            console.log(msg);
            return { success: false, message: msg };
        }

        if (senderId === recipientId) {
            const msg = "FAIL: Cannot transfer to the same account";
            console.log(msg);
            return { success: false, message: msg };
        }

        if (transferAmount <= 0) {
            const msg = "FAIL: Transfer amount must be greater than 0";
            console.log(msg);
            return { success: false, message: msg };
        }

        const ruleResult = this.checkTransactionRules(
            sender, transferAmount, "TRANSFER", currentTimestamp
        );

        if (ruleResult !== "PASS") {
            console.log(ruleResult);
            return { success: false, message: ruleResult };
        }

        sender.balance -= transferAmount;
        recipient.balance += transferAmount;

        // So here only the sender's outgoing stats change. Receiving is not outgoing.
        this.updateAccountInformation(
            sender, transferAmount, "TRANSFER", currentTimestamp
        );

        console.log("Transfer successful.");
        console.log(`New sender balance: ${sender.balance}`);
        return { success: true, balance: sender.balance };
    }
}

module.exports = { BankSystem, Account };