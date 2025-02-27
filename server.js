const express = require("express");
const {
  AccountId,
  PrivateKey,
  Client,
  Hbar,
  AccountCreateTransaction,
  EvmAddress,
} = require("@hashgraph/sdk");

const app = express();

// Replace with your Hedera account ID and private key
const MY_ACCOUNT_ID = AccountId.fromString("0.0.5530044");
const MY_PRIVATE_KEY = PrivateKey.fromStringECDSA(
  "731025b6bfb69ae6f9d2c673c81a4094bf97bde8ed993fe8ecd8b84b02010aaf"
);

// Variable to store the generated account details
let accountDetails = null;

// Function to generate a new Hedera account
const generateHederaAccount = async () => {
  try {
    const client = Client.forTestnet().setOperator(
      MY_ACCOUNT_ID,
      MY_PRIVATE_KEY
    );

    // Generate a new key pair for the account
    const accountPrivateKey = PrivateKey.generateECDSA();
    const accountPublicKey = accountPrivateKey.publicKey;

    // Create a new account with an initial balance of 10 Hbar
    const txCreateAccount = new AccountCreateTransaction()
      .setKey(accountPublicKey)
      .setInitialBalance(new Hbar(10));

    // Execute the transaction
    const txCreateAccountResponse = await txCreateAccount.execute(client);
    const receiptCreateAccountTx = await txCreateAccountResponse.getReceipt(
      client
    );
    const accountId = receiptCreateAccountTx.accountId;

    if (!accountId) {
      throw new Error("Account ID not found in receipt");
    }

    // Store the account details
    accountDetails = {
      accountId: accountId.toString(),
      privateKey: accountPrivateKey.toString(),
      publicKey: accountPublicKey.toString(),
      EvmAddress: accountPublicKey.toEvmAddress().toString(),
    };

    console.log("Account generated successfully:", accountDetails);
  } catch (error) {
    console.error("Error generating Hedera account:", error);
  }
};

// Generate the account as soon as the server starts
generateHederaAccount();

// Route to display the account details in the browser
app.get("/", (req, res) => {
  if (accountDetails) {
    res.send(`
      <h1>Hedera Account Details</h1>
      <p><strong>Account ID:</strong> ${accountDetails.accountId}</p>
      <p><strong>Private Key:</strong> ${accountDetails.privateKey}</p>
      <p><strong>Public Key:</strong> ${accountDetails.publicKey}</p>
      <p><strong>EVM Addr:</strong> ${accountDetails.EvmAddress}</p>
    `);
  } else {
    res.send(
      "<h1>Account details are being generated. Please refresh the page in a few seconds.</h1>"
    );
  }
});

// Start the server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
