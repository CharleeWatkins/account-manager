const { BankSystem } = require("./bankSystem");

function setupDemoData() {
    const bank = new BankSystem();

    // Create accounts
    bank.createAccount("Alice", 1000);
    bank.createAccount("Bob", 500);

    // Seed Alice with two OLD outgoing transactions.
    // 60s / 50s ago → outside the 10s rapid window.
    // Result: avg = (200 + 300) / 2 = 250 → spike threshold = 1250.
    const now = bank.now();
    const seedTimes = [now - 60, now - 50];
    const seedAmounts = [200, 300];

    const alice = bank.findAccount("Alice");
    for (let i = 0; i < seedTimes.length; i++) {
        bank.updateAccountInformation(alice, seedAmounts[i], "WITHDRAWAL", seedTimes[i]);
    }

    return bank;
}

module.exports = { setupDemoData };