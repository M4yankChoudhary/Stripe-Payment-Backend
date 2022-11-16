//const functions = require('firebase-functions');

const express = require("express");
const app = express();
const { resolve } = require("path");
// This is your real test secret API key.
const stripe = require("stripe")(
  "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"
 //"sk_test_51Hv7mcEVPhT8RTjUXpoDt0Ouq8dN1IsHZBeESVLPcp4iTbIxl4Bvc3YyUKiBpquGvmGXhcTrVuDztYHpyavwXoet00n4rNVKPU"
);
app.use(express.static("."));
app.use(express.json());
const calculateOrderAmount = (items) => {
  console.log(items[0].amount);
  return items[0].amount;
};


// create payment intent for secure payment
app.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;
  const { currency } = req.body;
  console.log(req.body);
  try {
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: calculateOrderAmount(items),
      currency: currency,
    });

    // Create or retrieve the Stripe Customer object associated with your user.
    let customer = await stripe.customers.create();

    // Create an ephemeral key for the Customer; this allows the app to display saved payment methods and save new ones
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: "2020-08-27" }
    );

    res.send({
      // publishableKey: "pk_test_51Hv7mcEVPhT8RTjUDqMes8WIjZXxP6g71HiT7l2TmhVwf1qgMLKPd6i7iSh0NX7Anul4qFKVOveJasQobeTBG3ju00twHUiNCk",
      publishableKey: "pk_live_51Hv7mcEVPhT8RTjU6JaPBNY0X56yhVx38liHayutrkmUQXkedtNDgz6uG35TMZXiAMJ7WqNlmgyrFMFF4UY3fTRZ00IL5TJv21",
      clientSecret: paymentIntent.client_secret,
      ephemeralK: ephemeralKey.secret,
      current_customer: customer.id,
    });
  } catch (e) {
    console.log(e)
    res.send({
      success: false
    })
  }
});

app.get("", (req, res) => {
  res.send("Server is up and running");
});

// app.post("/payout", (req, res) => {
//   stripe.accounts.createExternalAccount(
//     "acct_1KjohySAqc8rIN9R",
//     {
//       // card_1KjoBvSJgjKVvQEw4HAucGg8
//       external_account: {
//         object: "card_1KjoBvSJgjKVvQEw4HAucGg8",
//       },
//     },
//     function (err, card) {
//       // asynchronously called
//       if (err) return res.send(err);
//       res.send(card);
//     }
//   );
// });

// get btok (bank token) for adding it to a bank account
app.post("/createBankToken", async (req, res) => {
  const { account_holder_name } = req.body;
  const { routing_number } = req.body;
  const { account_number } = req.body;

  try {
    const token = await stripe.tokens.create({
      bank_account: {
        country: "GB",
        currency: "gbp",
        account_holder_name: account_holder_name,
        account_holder_type: "individual",
        routing_number: routing_number,
        account_number: account_number,
      },
    });
    console.log(token);
    res.send({
      token: token.id,
      message: "token created!",
      success: true,
    });
  } catch (e) {
    res.send({
      success: false,
    });
    console.log(e);
  }
});

// transfer money to a stripe connect account
app.post("/transfer", async (req, res) => {
  const { amount } = req.body;
  const { destination } = req.body;
  try {
    const transfer = await stripe.transfers.create({
      amount: amount,
      currency: "gbp",
      destination: destination,
    });
    res.send({
      success: true,
      message: "Transfer Successful!",
    });
    console.log(transfer);
  } catch (e) {
    res.send({
      success: false,
      message: "Transfer failed!",
    });
    console.log(e);
  }
});

// get all balance of the organization
app.post("/balance", async (req, res) => {
  try {
    const balance = await stripe.balance.retrieve();
    res.send({
      available: balance.available[0].amount,
      pending: balance.pending[0].amount,
      success: true,
    });
  } catch (e) {
    res.send({
      success: false,
    });
    console.log(e);
  }
});

// get balance of particular account
app.post("/balance/account", async (req, res) => {
  try {
    const { stripeAccount } = req.body;
    const balance = await stripe.balance.retrieve({
      stripeAccount: stripeAccount,
    });
    res.send({
      available: balance.available[0].amount,
      pending: balance.pending[0].amount,
      success: true,
    });
  } catch (e) {
    res.send({
      success: false,
    });
    console.log(e);
  }
});

// add bank account to connected(which we created with create account endpoint) account
app.post("/addBankAccount", async (req, res) => {
  const { account } = req.body;
  const { token } = req.body;
  try {
    const cardToken = await stripe.accounts.createExternalAccount(account, {
      external_account: token,
    });
    res.send({ token: cardToken.id, message: "Account Added", success: true });
  } catch (e) {
    res.send({
      success: false,
    });
    console.log(e);
  }
});

// create a user account to connect account

app.post("/createAccount", async (req, res) => {
  const { email } = req.body;
  const { first_name } = req.body;
  const { last_name } = req.body;
  try {
    const account = await stripe.accounts.create({
      type: "custom",
      country: "GB",
      email: email,
      capabilities: {
        card_payments: {
          requested: true,
        },
        transfers: {
          requested: true,
        },
      },
      business_type: "individual",
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: "1.23.121.84",
      },
      individual: {
        address: {
          line1: "address_full_match",
          postal_code: "SW1W 0NY",
          state: "Texas",
          city: "Texas",
        },
        dob: {
          day: "01",
          month: "01",
          year: "1901",
        },
        email: email,
        first_name: first_name,
        last_name: last_name,
        phone:  "7976694567",
        id_number: "lO1DEQWBbQ",
      },
      business_profile: {
        url: "https://swapshop.me/",
        mcc: 7512,
      },
    });
    res.send({
      accountId: account.id,
      message: "Account Created",
      success: true,
    });
  } catch (e) {
    res.send({
      success: false,
    });
    console.log(e);
  }
});


const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Node server listening on port ${PORT}`));
