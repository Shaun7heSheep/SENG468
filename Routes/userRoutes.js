const express = require("express");
const router = express.Router();
const userController = require("../Controllers/userController");

// Route for adding a new user
router.post("/users", userController.addUser);

// Route for getting all users
router.get("/users", userController.getAllUsers);

// Route for getting a specific user by userId
router.get("/users/:userID", userController.getUserByUserId);

// Route for updating a specific user by userId
router.put("/users/:userID", userController.updateUserByUserId);

// Route for deleting all the users
router.delete("/users", userController.deleteAllUsers);

// Route for setting the buy amount
router.post("/users/:userID/set-buy-amount", userController.setBuyAmount);

// Route for setting the buy trigger
router.post("/users/:userID/set-buy-trigger", userController.setBuyTrigger);

// Route for cancelling the SET_BUY commands
router.post("/users/:userID/cancel-set-buy", userController.cancelSetBuy);

module.exports = router;
