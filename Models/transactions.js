const mongoose = require("mongoose");

const accountTransactionSchema = new mongoose.Schema({
  transactionNum: { // transactionNum
    type: mongoose.Schema.Types.ObjectId,
    index: true,
    required: true,
    auto: true,
  },
  userID: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  action:{
    type: String
  },
  amount: {
    type: Number,
    default: 0,
  },
  server: {
    type: String,
    default: 'ownserver'
  },
  quoteserver_timestamp: {
    type: String
  },
  cryptokey: {
    type: String
  },
  isTriggered: {
    type: Boolean,
    default: false
  }
},
  { timestamps: true }
);

const AccountTransaction = mongoose.model("Transaction", accountTransactionSchema);

module.exports = AccountTransaction;
