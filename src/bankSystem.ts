export type TransactionType = "WITHDRAWAL" | "TRANSFER";

export interface OutgoingTransaction {
    amount: number;
    type: TransactionType;
    timestamp: number;
}

export interface TransactionResult {
    success: boolean;
    balance?: number;
    message?: string;
}


export class Account {
    public id: string;
    public balance: number;

    
    public successfulOutgoingHistory: OutgoingTransaction[];

    public totalOutgoingTransactions: number;
    public totalOutgoingTransactionAmount: number;
    public averageTransactionSize: number;

    constructor(id: string, initialBalance: number = 0) {
        this.id = id;
        this.balance = initialBalance;
        this.successfulOutgoingHistory = [];
        this.totalOutgoingTransactions = 0;
        this.totalOutgoingTransactionAmount = 0;
        this.averageTransactionSize = 0;
    }
}


export class BankSystem {
    private accounts: Map<string, Account>;
    private readonly RAPID_LIMIT: number = 3;
    private readonly TIME_WINDOW: number = 10;
    private readonly SPIKE_MULTIPLIER: number = 5;

    constructor() {
        this.accounts = new Map();
    }


    // Helpers

    public now(): number {
        return Math.floor(Date.now() / 1000);
    }

    public findAccount(userId: string): Account | null {
        return this.accounts.get(userId) ?? null;
    }

    public createAccount(userId: string, initialBalance: number = 0): Account {
        const account = new Account(userId, initialBalance);
        this.accounts.set(userId, account);
        return account;
    }

    public getAccounts(): Map<string, Account> {
        return this.accounts;
    }

    // CHECKING TRANSACTION RULES
    private checkTransactionRules(
        account: Account,
        amount: number,
        transactionType: TransactionType,
        currentTimestamp: number
    ): string {
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

    // UPDATING ACCOUNT'S INFORMATION
    
    public updateAccountInformation(
        account: Account,
        amount: number,
        transactionType: TransactionType,
        currentTimestamp: number
    ): void {
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
    
    public deposit(userId: string, depositAmount: number): TransactionResult {
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

    // WITHDRAWAL
    public withdraw(
        userId: string,
        withdrawalAmount: number,
        currentTimestamp: number = this.now()
    ): TransactionResult {
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
    public transfer(
        senderId: string,
        recipientId: string,
        transferAmount: number,
        currentTimestamp: number = this.now()
    ): TransactionResult {
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

        this.updateAccountInformation(
            sender, transferAmount, "TRANSFER", currentTimestamp
        );

        console.log("Transfer successful.");
        console.log(`New sender balance: ${sender.balance}`);
        return { success: true, balance: sender.balance };
    }
}