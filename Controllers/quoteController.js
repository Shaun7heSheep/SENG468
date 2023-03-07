const net = require("net");
const logController = require("./logController");
const transactionNumController = require("./transactNumController");

exports.getStockPrice = async (request, response) => {
  // get and update current transactionNum
  var numDoc = await transactionNumController.getNextTransactNum()
  // log user command
  logController.logUserCmnd("QUOTE",request,numDoc.value);

  let userID = request.query.user_id;
  let symbol = request.query.symbol;


  try {
    quoteData = await this.getQuote(userID, symbol, numDoc.value);
    response.status(200).send(quoteData);
  } catch (error) {
    response.status(500).send(error);
  }
};

// Connect to QuoteServer and get quote
exports.getQuote = (userID, symbol, transactionNum) => {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({
      host: "quoteserve.seng.uvic.ca",
      port: 4444,
    });
    client.on("connect", () => {
      console.log("Connected to quoteserver");
      client.write(`${symbol},${userID}\n`);
    });
    client.on("data", (data) => {
      var response = data.toString("utf-8");
      resolve(response);
      var arr = response.split(",");
      // store quoteserver response for logging
      logController.logQuoteServer(userID,symbol,arr[0],arr[3],arr[4], transactionNum);
    });
    client.on("error", (err) => {
      reject(err);
    });
  });
}
