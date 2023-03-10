const fs = require("fs");
const {XMLBuilder} = require("fast-xml-parser");
const formatXml = require("xml-formatter");
const { DOMParser } = require('xmldom');

const transactNumModel = require("../Models/transactNum");
const logModel = require("../Models/logModel");

const builder = new XMLBuilder();
const doc = new DOMParser().parseFromString('<log>\n</log>','text/xml');

// XML root element    
var root = doc.documentElement;

// log user command
exports.logUserCmnd = async (cmd, request, transactionNum) => {
    switch (cmd) {
        case "ADD":
            logModel.create({
                userCommand:{
                    timestamp: Date.now(),
                    server: 'own-server',
                    transactionNum: transactionNum,
                    command: cmd,
                    username: request.body.userID,
                    funds: request.body.amount
                }
            })
            break;
        case "QUOTE":
            logModel.create({
                userCommand: {
                    timestamp: Date.now(),
                    server: 'own-server',
                    transactionNum: transactionNum,
                    command: cmd,
                    username: request.body.user_id,
                    stockSymbol: request.body.symbol
                }
            })
            break;
        case "SET_BUY_AMOUNT": case "SET_BUY_TRIGGER": case "BUY": case "SELL": case "COMMIT_BUY": case "COMMIT_SELL": case "SET_SELL_AMOUNT": case "SET_SELL_TRIGGER":
            logModel.create({
                userCommand: {
                    timestamp: Date.now(),
                    server: 'own-server',
                    transactionNum: transactionNum,
                    command: cmd,
                    username: request.body.userID,
                    stockSymbol: request.body.symbol,
                    funds: request.body.balance
                }
            })
            break;
        case "CANCEL_SET_BUY": case "CANCEL_SET_SELL":
            logModel.create({
                userCommand: {
                    timestamp: Date.now(),
                    server: 'own-server',
                    transactionNum: transactionNum,
                    command: cmd,
                    username: request.body.userID,
                    stockSymbol: request.body.symbol
                }
            })
            break;
        case "DISPLAY_SUMMARY":
            logModel.create({
                userCommand:{
                    timestamp: Date.now(),
                    server: 'own-server',
                    transactionNum: transactionNum,
                    command: cmd,
                    username: request.body.userID,
                }
            })
            break;
    }
};

exports.logUserCmnd2 = async (cmd, userID, amount, transactionNum) => {
    switch (cmd) {
        case "COMMIT_BUY": case "COMMIT_SELL":
            logModel.create({
                userCommand: {
                    timestamp: Date.now(),
                    server: 'own-server',
                    transactionNum: transactionNum,
                    command: cmd,
                    username: userID,
                    funds: amount
                }
            })
            break;
    }
};


// log quoteServer
exports.logQuoteServer = async (userID, symbol, price, quoteTime, cryptoK, transactionNum) => {
    await logModel.findOneAndUpdate(
        { "userCommand.transactionNum": transactionNum },
        {
            $set: {
                quoteServer: {
                    timestamp: Date.now(),
                    price: price,
                    username: userID,
                    transactionNum: transactionNum,
                    stockSymbol: symbol,
                    quoteServerTime: quoteTime,
                    cryptoKey: cryptoK
                }
            }
        }
    )
};

// log Account Transactions
exports.logTransactions = async (action, request, transactionNum) => {
    await logModel.findOneAndUpdate(
        { "userCommand.transactionNum": transactionNum },
        {
            $set: {
                accountTransaction: {
                    timestamp: Date.now(),
                    server: 'own-server',
                    transactionNum: transactionNum,
                    action: action,
                    username: request.body.userID,
                    funds: request.body.amount
                }
            }
        }
    )
};

// log error events (errMsg: String)
exports.logError = async(cmd, userID, transactionNum, errMsg) => {
    await logModel.findOneAndUpdate(
        { "userCommand.errorEvent": transactionNum },
        {
            $set: {
                errorEvent: {
                    timestamp: Date.now(),
                    server: 'own-server',
                    transactionNum: transactionNum,
                    command: cmd,
                    username: userID,
                    errorMessage: errMsg
                }
            }
        }
    )
};

exports.deleteAllLog = async (request, response) => {
    await logModel.deleteMany({});
    await transactNumModel.deleteMany({});
    response.status(200).send("All logs deleted");
};

exports.dumplog = async (request, response) => {
    var userID = request.query.userID;
    if (userID) {
        response.send(`dumped! ${userID}\n`)
    } else {
        (await logModel.find({}, '-_id')).forEach(function (mongoDoc) {
            var stringified = JSON.stringify(mongoDoc);
            const xmlContent = builder.build(JSON.parse(stringified));
            const logElem = new DOMParser().parseFromString(xmlContent, 'text/xml')
            root.appendChild(logElem);
        })

        //console.log(doc.toString());
        fs.writeFile("log.xml", formatXml(doc.toString(), { collapseContent: true }), function (err, result) {
            if (err) {
                response.status(500).send(err)
            } else {
                response.send("Log file updated")
            }
        })
    }
};