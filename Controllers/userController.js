const userModel = require("../Models/users");
const logController = require("./logController")
const io = require("socket.io-client");
const transactionNumController = require("./transactNumController")

// Add a new user
exports.addUser = async (request, response) => {
  // get and update current transactionNum
  var numDoc = await transactionNumController.getNextTransactNum()
  // log user command
  logController.logUserCmnd("ADD",request,numDoc.value);
  try {
    // insert new if not exist, else increase balance
    const updatedUser = await userModel.findOneAndUpdate(
      { userID: request.body.userID },
      { $inc: { balance: request.body.balance } },
      { new: true, upsert: true }
    );
    // log accountTransaction
    logController.logTransactions("add", request, numDoc.value);
    response.status(200).send(updatedUser);
  } catch (error) {
    response.status(500).send(error);
  }
};

// Get all users
exports.getAllUsers = async (request, response) => {
  try {
    const users = await userModel.find({});
    response.status(200).send(users);
  } catch (error) {
    response.status(500).send(error);
  }
};

// Get a specific user by userId
exports.getUserByUserId = async (request, response) => {
  try {
    const user = await userModel.findOne({ userID: request.params.userID });
    if (!user) {
      return response.status(404).send(user);
    }
    response.status(200).send(user);
  } catch (error) {
    response.status(500).send(error);
  }
};

// Update a specific user by userId
exports.updateUserByUserId = async (request, response) => {
  try {
    const updatedUser = await userModel.findOneAndUpdate(
      { userID: request.body.userID },
      request.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updatedUser) {
      return response.status(404).send(updatedUser);
    }
    response.status(200).send(updatedUser);
  } catch (error) {
    response.status(500).send(error);
  }
};

// SET_BUY_AMOUNT
exports.setBuyAmount = async (request, response) => {
  const stockSymbol = request.body.symbol;
  const stockAmount = request.body.amount;
  const user = await userModel.findOne({ userID: request.body.userID });
  if (!user) {
    return response.status(404).send("User not found");
  }
  if (user.balance < stockAmount) {
    return response.status(400).send("Insufficient balance");
  }

  let stockReserveAccountExists = false;
  // Iterate the object in user's reserveAccount.
  // If reserveAccount already exists for that specific stock, increment the amountReserved
  user.reserveAccount.forEach((account) => {
    if (
      account.action === "buy" &&
      account.symbol === stockSymbol &&
      account.status !== "cancelled" &&
      account.status !== "completed"
    ) {
      account.amountReserved += stockAmount;
      stockReserveAccountExists = true;
    }
  });

  // Else, create the reserve account for that specific stock
  if (!stockReserveAccountExists) {
    user.reserveAccount.push({
      action: "buy",
      symbol: stockSymbol,
      amountReserved: stockAmount,
      status: "init",
    });
  }

  user.balance -= stockAmount;

  const updatedUser = await user.save();
  response.status(200).send(updatedUser);
};

// SET_BUY_TRIGGER
exports.setBuyTrigger = async (request, response) => {
  const userId = request.body.userID;
  const stockSymbol = request.body.symbol;
  const triggerPrice = request.body.amount;
  const user = await userModel.findOne({ userID: userId });
  if (!user) {
    return response.status(404).send("User not found");
  }
  let stockReserveAccountExists = false;
  user.reserveAccount.forEach((account) => {
    if (
      account.action === "buy" &&
      account.symbol === stockSymbol &&
      account.status !== "cancelled" &&
      account.status !== "completed"
    ) {
      account.triggerPrice = triggerPrice;
      account.status = "triggered";
      stockReserveAccountExists = true;
    }
  });

  if (!stockReserveAccountExists) {
    return response
      .status(400)
      .send(
        "User must have specified a SET_BUY_AMOUNT prior to running SET_BUY_TRIGGER"
      );
  }
  const updatedUser = await user.save();
  response.status(200).send(updatedUser);

  // todo: now starts checking for the stock price continually
  // if stock price dropped below triggerPrice, run the BUY command to buy that stock
  this.subscribeStockUpdates(userId, stockSymbol);
};

// CANCEL_SET_BUY
exports.cancelSetBuy = async (request, response) => {
  const stockSymbol = request.body.symbol;
  const user = await userModel.findOne({ userID: request.body.userID });
  if (!user) {
    return response.status(404).send("User not found");
  }
  let stockReserveAccountExists = false;
  user.reserveAccount.forEach((account) => {
    if (
      account.action === "buy" &&
      account.symbol === stockSymbol &&
      (account.status === "init" || account.status === "triggered")
    ) {
      user.balance += account.amountReserved;
      account.status = "cancelled";
      stockReserveAccountExists = true;
    }
  });

  if (!stockReserveAccountExists) {
    return response.status(400).send("No SET_BUY commands specified");
  }
  const updatedUser = await user.save();
  response.status(200).send(updatedUser);
};

// SET_SELL_AMOUNT
exports.setSellAmount = async (request, response) => {
  const stockSymbol = request.body.symbol;
  const stockAmount = request.body.amount;
  const user = await userModel.findOne({ userID: request.body.userID });
  if (!user) {
    return response.status(404).send("User not found");
  }
  if (user.balance < stockAmount) {
    return response.status(400).send("Insufficient balance");
  }

  let stockReserveAccountExists = false;
  // Iterate the object in user's reserveAccount.
  // If reserveAccount already exists for that specific stock, increment the amountReserved
  user.reserveAccount.forEach((account) => {
    if (
      account.action === "sell" &&
      account.symbol === stockSymbol &&
      account.status !== "cancelled" &&
      account.status !== "completed"
    ) {
      account.amountReserved += stockAmount;
      stockReserveAccountExists = true;
    }
  });

  // Else, create the reserve account for that specific stock
  if (!stockReserveAccountExists) {
    user.reserveAccount.push({
      action: "sell",
      symbol: stockSymbol,
      amountReserved: stockAmount,
      status: "init",
    });
  }

  user.balance -= stockAmount;

  const updatedUser = await user.save();
  response.status(200).send(updatedUser);
};

// SET_SELL_TRIGGER
exports.setSellTrigger = async (request, response) => {
  const stockSymbol = request.body.symbol;
  const triggerPrice = request.body.amount;
  const user = await userModel.findOne({ userID: request.body.userID });
  if (!user) {
    return response.status(404).send("User not found");
  }
  let stockReserveAccountExists = false;
  user.reserveAccount.forEach((account) => {
    if (
      account.action === "sell" &&
      account.symbol === stockSymbol &&
      account.status !== "cancelled" &&
      account.status !== "completed"
    ) {
      account.triggerPrice = triggerPrice;
      account.status = "triggered";
      stockReserveAccountExists = true;
    }
  });

  if (!stockReserveAccountExists) {
    return response
      .status(400)
      .send(
        "User must have specified a SET_SELL_AMOUNT prior to running SET_SELL_TRIGGER"
      );
  }
  const updatedUser = await user.save();
  response.status(200).send(updatedUser);

  // todo: now starts checking for the stock price continually
  // if stock price dropped below triggerPrice, run the SELL command to SELL that stock
};

// CANCEL_SET_SELL
exports.cancelSetSell = async (request, response) => {
  const stockSymbol = request.body.symbol;
  const user = await userModel.findOne({ userID: request.body.userID });
  if (!user) {
    return response.status(404).send("User not found");
  }
  let stockReserveAccountExists = false;
  user.reserveAccount.forEach((account) => {
    if (
      account.action === "sell" &&
      account.symbol === stockSymbol &&
      (account.status === "init" || account.status === "triggered")
    ) {
      user.balance += account.amountReserved;
      account.status = "cancelled";
      stockReserveAccountExists = true;
    }
  });

  if (!stockReserveAccountExists) {
    return response.status(400).send("No SET_SELL commands specified");
  }
  const updatedUser = await user.save();
  response.status(200).send(updatedUser);
};

// Delete all the users
exports.deleteAllUsers = async (request, response) => {
  await userModel.deleteMany({});
  response.status(200).send("All users deleted");
};

exports.subscribeStockUpdates = async (userId, symbol) => {
  const socket = io("http://quoteserve.seng.uvic.ca:4444");

  socket.emit("subscribe", `${symbol},${userId}`);

  socket.on("stockPrice", (data) => {
    console.log("Server returns: ", data)
  });
}
