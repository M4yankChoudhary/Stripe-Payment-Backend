//const functions = require('firebase-functions');

const express = require("express");
const app = express();
const { resolve } = require("path");
// This is your real test secret API key.
const stripe = require("stripe")(
  "sk_test_51Hv7mcEVPhT8RTjUXpoDt0Ouq8dN1IsHZBeESVLPcp4iTbIxl4Bvc3YyUKiBpquGvmGXhcTrVuDztYHpyavwXoet00n4rNVKPU"
);
app.use(express.static("."));
app.use(express.json());
const calculateOrderAmount = (items) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  console.log(items[0].amount);
  return items[0].amount;
};
// app.post("/create-payment-intent", async (req, res) => {
//   const { items } = req.body;
//   const { currency } = req.body;
//   console.log(req.body);

//   // Create a PaymentIntent with the order amount and currency
//   const paymentIntent = await stripe.paymentIntents.create({
//     amount: calculateOrderAmount(items),
//     currency: currency,
//   });

//   // Create or retrieve the Stripe Customer object associated with your user.
//   let customer = await stripe.customers.create();

//   // Create an ephemeral key for the Customer; this allows the app to display saved payment methods and save new ones
//   const ephemeralKey = await stripe.ephemeralKeys.create(
//     { customer: customer.id },
//     { apiVersion: "2020-08-27" }
//   );

//   res.send({
//     clientSecret: paymentIntent.client_secret,
//     ephemeralK: ephemeralKey.secret,
//     current_customer: customer.id,
//     publisherKey:
//       "pk_test_51KhqrySJgjKVvQEwYUTn1XOegq8iLYQ7tFvI4BwSq88Q4GFf3lXQ38Tz4SRBbfHvCw9LXK4GTeaUW937VP06jlix00BPHZhEmo",
//   });
// });

// create payment intent for secure payment
app.post("/create-payment-intent", async (req, res) => {
  const { items } = req.body;
  const { currency } = req.body;
  console.log(req.body);

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
    clientSecret: paymentIntent.client_secret,
    ephemeralK: ephemeralKey.secret,
    current_customer: customer.id,
  });
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
  const { country } = req.body;
  const { currency } = req.body;
  const { account_holder_name } = req.body;
  const { account_holder_type } = req.body;
  const { routing_number } = req.body;
  const { account_number } = req.body;
  try {
    const token = await stripe.tokens.create({
      bank_account: {
        country: country,
        currency: currency,
        account_holder_name: account_holder_name,
        account_holder_type: account_holder_type,
        routing_number: routing_number,
        account_number: account_number,
      },
    });
    console.log(token);
    res.send({
      token: token.id,
      message: "Failed to create token!",
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
  const { currency } = req.body;
  const { destination } = req.body;
  try {
    const transfer = await stripe.transfers.create({
      amount: amount,
      currency: currency,
      destination: destination,
    });
    res.send({
      success: true,
      message: "Transfer Successful!"
    });
    console.log(transfer);
  } catch (e) {
    res.send({
      success: false,
      message: "Transfer failed!"
    });
    console.log(e);
  }
});

// get all balance of the organization
app.post("/balance", async (req, res) => {
  try {
    const balance = await stripe.balance.retrieve();
    res.send(balance);
  } catch (e) {
    res.send(e);
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
    res.send(balance);
  } catch (e) {
    res.send(e);
    console.log(e);
  }
});

// add bank account to connected(which we created with create account endpoint) account
app.post("/addBankAccount", (req, res) => {

  const { account } = req.body;
  const { token } = req.body;
  try {
    const cardToken = await stripe.accounts.createExternalAccount( account, {
      external_account: token,
    });
    res.send({token:cardToken.id, message: "Account Added", success: true});
  } catch (e) {
    res.send({
      success: false
    });
    console.log(e);
  }
});

// create a user account to connect account
app.post("/createAccount", (req, res) => {
  stripe.accounts.create(req.body, function (err, account) {
    // asynchronously called
    err
      ? res.send({
          success: false,
          accountId: null,
          error: err,
        })
      : res.send({ accountId: account.id, success: true });
  });
});

// app.post("/createAccount", (req, res) => {
//   stripe.accounts.create(
//     {
//       type: "express",
//       country: "US",
//       email: "mayank@gmail.com",
//       requested_capabilities: ["card_payments", "transfers"],
//       business_type: "individual",
//       tos_acceptance: {
//         date: Math.floor(Date.now() / 1000),
//         ip: "1.23.121.84",
//       },
//       individual: {
//         address: {
//           line1: "address_full_match",
//           postal_code: "12345",
//           state: "Texas",
//           city: "Texas",
//         },
//         dob: {
//           day: "01",
//           month: "01",
//           year: "1901",
//         },
//         email: "mayank@gmail.com",
//         first_name: "Mayank",
//         last_name: "Choudhary",
//         phone: "7976694132",
//         id_number: "000000000",
//       },
//       business_profile: {
//         url: "http://mayankchoudhary.me",
//         mcc: 7512,
//       },
//       settings: {
//         payouts: {
//           schedule: {
//             delay_days: "minimum",
//             interval: "weekly",
//             weekly_anchor: "saturday",
//           },
//           statement_descriptor: "automatic payout check",
//         },
//       },
//     },
//     function (err, account) {
//       // asynchronously called
//       err ? res.send(err) : res.send(account);
//     }
//   );
// });

// app.post('/webhook', bodyParser.raw({type: 'application/json'}), (request, response) => {
// let event;

// try {
//   event = JSON.parse(request.body);
//   console.log(event)
// } catch (err) {
//   response.status(400).send(`Webhook Error: ${err.message}`);
// }

// // Handle the event
// switch (event.type) {
//   case 'payout.failed':
//     const paypal = event.data.object;
//     console.log("failed",event)
//     break;
//   case 'payout.updated':
//     const payoutUpdated = event.data.object;
//     console.log("updated",event)
//     break;
//   case 'payout.paid':
//     const payoutPaid = event.data.object;
//     console.log("paid",event)
//     break;
//   default:
//     // Unexpected event type
//     return response.status(400).end();
// }

// // Return a response to acknowledge receipt of the event
// response.json({received: true});
// });

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Node server listening on port ${PORT}`));
