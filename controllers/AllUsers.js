const express = require("express");
const User = require("../models/user");

const AllUser = async (req, res) => {
  const { loggedUserId } = req.params;
  User.find({ _id: { loggedUserId } }).then((users) => {
    res
      .status(200)
      .json(users)
      .catch((err) => {
        console.log("Error retriving users", err);
        res.status(500).json({ message: "Error retriving users" });
      });
  });
};

// module.exports = { AllUser };
