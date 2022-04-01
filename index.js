//const functions = require('firebase-functions');

const express = require("express");
const app = express();
const { resolve } = require("path");
// This is your real test secret API key.
const stripe = require("stripe")(
  "sk_test_51KhqrySJgjKVvQEwrQsy7wGKF9yRlEX0GdcgTyBzKjfEIGc0MYfBCaAH2xWztj1AjRh9RfFdg8BXuKf3AXAwInAB00lWfhSrIl"
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
    publisherKey:
      "pk_test_51KhqrySJgjKVvQEwYUTn1XOegq8iLYQ7tFvI4BwSq88Q4GFf3lXQ38Tz4SRBbfHvCw9LXK4GTeaUW937VP06jlix00BPHZhEmo",
  });
});
app.get("/test", (req, res) => {
  res.send("Working");
});

app.post("/payout", (req, res) => {
  stripe.payouts.create(
    {
      amount: 100,
      currency: "usd",
      method: "instant",
      source_type: "card",
      destination: "card_1Gk3XBAaf3EX2XJtXdruEv9N",
    },
    {
      stripeAccount: "acct_1GjKMqCpjAiF3DpZ",
    },
    function (err, payout) {
      if (err) {
        res.send(err);
        console.log(err);
      }
      res.send(payout);
    }
  );
});

app.post("/transfer", (req, res) => {
  stripe.transfers.create(
    {
      amount: 1000,
      currency: "usd",
      destination: "acct_1Giz8XAaf3EX2XJt",
      transfer_group: "ORDER_95",
    },
    function (err, transfer) {
      // asynchronously called
      if (err) {
        res.send(err);
        console.log(err);
      }
      res.send(transfer);
    }
  );
});

app.post("/balance", async (re, res) => {
  stripe.balance.retrieve(function (err, balance) {
    // asynchronously called
    if (err) res.send(err);
    res.send(balance);
  });
});

app.post("/addcard", (req, res) => {
  stripe.accounts.createExternalAccount(req, function (err, card) {
    // asynchronously called
    if (err) return res.send(err);
    res.send(card);
  });
});

// app.post("/addcard", (req, res) => {
//   stripe.accounts.createExternalAccount(
//     "acct_1KjjhwHxUOYLqICx",
//     {
//       external_account: {
//         object: "card",
//         number: "4000056655665556",
//         exp_month: 5,
//         exp_year: 2021,
//         currency: "usd",
//       },
//     },
//     function (err, card) {
//       // asynchronously called
//       if (err) return res.send(err);
//       res.send(card);
//     }
//   );
// });

app.post("/createAccount", (req, res) => {
  stripe.accounts.create(req.body, function (err, account) {
    // asynchronously called
    err ? res.send(err) : res.send({ accountId: account.id });
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
