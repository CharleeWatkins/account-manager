import { BankSystem } from "./bankSystem";

export function setupDemoData(): BankSystem {
    const bank = new BankSystem();

    bank.createAccount("Alice", 1000);
    bank.createAccount("Bob", 500);

    const now = bank.now();
    const seedTimes: number[] = [now - 60, now - 50];
    const seedAmounts: number[] = [200, 300];

    const alice = bank.findAccount("Alice");
    if (!alice) throw new Error("Alice must exist after createAccount");

    for (let i = 0; i < seedTimes.length; i++) {
        bank.updateAccountInformation(
            alice, seedAmounts[i], "WITHDRAWAL", seedTimes[i]
        );
    }

    return bank;
}