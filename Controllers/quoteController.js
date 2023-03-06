const net = require("net");
const logController = require("./logController");

exports.getStockPrice = async (request, response) => {
  let userID = request.query.user_id;
  let symbol = request.query.symbol;

  try {
    quoteData = await getQuote(userID, symbol);
    response.status(200).send(quoteData);
  } catch (error) {
    response.status(500).send(error);
  }
};

// Connect to QuoteServer and get quote
function getQuote(userID, symbol) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({
      host: "quoteserve.seng.uvic.ca",
      port: 4444,
    });
    client.on("connect", () => {
      client.write(`${symbol},${userID}\n`);
    });
    client.on("data", (data) => {
      var response = data.toString("utf-8");
      resolve(response);
      var arr = response.split(",");

      // store quoteserver response for logging
      logController.logQuoteServer(userID,symbol,arr[0],arr[3],arr[4]);
    });
    client.on("error", (err) => {
      reject(err);
    });
  });
}