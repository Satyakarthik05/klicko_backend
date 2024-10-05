const mongoose = require("mongoose");
const express = require("express");
const User = require("../models/user");
const message = require("../models/message");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
secret = "Satya12@";

const Register = async (req, res) => {
  const { name, email, password, image } = req.body;

  try {
    const register = await User.findOne({ email: email });
    if (register) {
      return res.status(400).json({ message: "Email already exists" });
    } else {
      const hashPassword = await bcrypt.hash(password, 10);

      const newUser = new User({
        name,
        email,
        password: hashPassword,
        image,
      });

      await newUser.save();
      res.status(200).json({ message: "user registration successful" });
      console.log("Registration Success");
    }
  } catch (error) {
    console.log(error);
  }
};

const Login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid Username or Password" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid Username or Password" });
    }

    const token = jwt.sign({ userId: user._id }, secret, {
      expiresIn: "1h",
    });

    res.status(200).json({ message: "Login Successful", token });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Invalid Username or Password" });
  }
};

module.exports = { Register, Login };
