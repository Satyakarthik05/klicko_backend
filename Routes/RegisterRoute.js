const express = require("express");
const Register = require("../controllers/Registration");
const AllUsers = require("../controllers/AllUsers");
const Frrequest = require("../controllers/Friends");

const app = express.Router();

// app.post("/register", Register.Register);
app.post("/login", Register.Login);
app.post("/friendreq", Frrequest.Frrequest);

module.exports = app;
