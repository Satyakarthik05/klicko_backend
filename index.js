const express = require("express");
const bodyparser = require("body-parser");
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const jsonwebtoken = require("jsonwebtoken");
const userRouter = require("./Routes/RegisterRoute");
// import User from "./models/user";
const multer = require("multer");
const path = require("path");
const bcrypt = require("bcryptjs");
const http = require("http");
// const socketIo = require("socket.io");
const { Server } = require("socket.io");
// const cors = require("cors");

// import multer from "multer";

const User = require("./models/user");
const Messages = require("./models/message");

const app = express();
const cors = require("cors");
app.use(
  cors({
    origin: "*", // Change this to your frontend's URL
    methods: ["GET", "POST"],
    credentials: true,
  })
);
app.use(express.json());
app.use(passport.initialize());
app.use(bodyparser.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow any origin for testing
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
mongoose
  .connect(
    "mongodb+srv://satyakarthikvelivela:Satya12@messenger.eni6k.mongodb.net/"
  )
  .then(() => {
    console.log("Mongodb connected successfully");
  })
  .catch((err) => {
    console.log(err);
  });

app.use("/user", userRouter);

///register api

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Specify your upload directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Customize the filename
  },
});

const upload = multer({ storage });

// const router = express.Router();

app.post("/user/register", upload.single("image"), async (req, res) => {
  const { name, email, password } = req.body;
  const image = req.file.path; // Path to the uploaded image

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      image, // Save the image path to the database
    });

    await newUser.save();
    res.status(200).json({ message: "User registration successful" });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/users/:userId", (req, res) => {
  const loggedUserId = req.params.userId;

  User.find({ _id: { $ne: loggedUserId } })
    .then((users) => {
      res.status(200).json(users);
    })
    .catch((error) => {
      console.log("Error whileretriving users", error);
      res.status(400).json({ message: "Error retriving users" });
    });
});

app.get("/myrequests/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .populate("friendRequests", "name email image")
      .lean();

    const friendRequests = user.friendRequests;
    res.json(friendRequests);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/friend-request/accept", async (req, res) => {
  try {
    const { senderId, receipentId } = req.body;

    const sender = await User.findById(senderId);
    const reciepent = await User.findById(receipentId);

    sender.friends.push(receipentId);
    reciepent.friends.push(senderId);

    reciepent.friendRequests = reciepent.friendRequests.filter(
      (request) => request.toString() !== senderId.toString()
    );
    sender.sentFriendRequests = sender.sentFriendRequests.filter(
      (request) => request.toString() !== receipentId.toString
    );

    await sender.save();
    await reciepent.save();
    res.status(200).json({ message: "Friend request accepted successfullt" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/accepted-friends/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate(
      "friends",
      "name email image"
    );
    const acceptedFriends = user.friends;
    res.json(acceptedFriends);
  } catch (error) {
    res.status(500).json({ message: "Internal server erro" });
  }
});

app.post("/messages", upload.single("imageFile"), async (req, res) => {
  try {
    const { senderId, recepientId, messageType, message } = req.body;

    const newMessage = new Messages({
      senderId,
      recepientId,
      messageType,
      message,
      timeStamp: new Date(),
      imageUrl: messageType === "image" && req.file ? req.file.path : null,
    });

    await newMessage.save(); // Await the save operation

    // Emit the new message to the relevant room
    io.to(`${senderId}-${recepientId}`).emit("newMessage", newMessage);

    res.status(200).json({ message: "Message sent successfully" });
  } catch (error) {
    console.error(error); // Better logging
    res.status(500).json({ message: "Internal server error" }); // Corrected message
  }
});

// Endpoint to fetch the messages between two users in the chatRoom
app.get("/messages/:senderId/:recepientId", async (req, res) => {
  try {
    const { senderId, recepientId } = req.params;
    const messages = await Messages.find({
      $or: [
        { senderId: senderId, recepientId: recepientId },
        { senderId: recepientId, recepientId: senderId },
      ],
    });
    res.json(messages);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Server-side code
io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  // User joins a specific room based on the sender and recipient
  socket.on("joinRoom", ({ senderId, recepientId }) => {
    const roomId = `${senderId}-${recepientId}`;
    socket.join(roomId); // Join a room based on sender and recipient IDs

    // Also join the reverse room so both users can receive messages
    const reverseRoomId = `${recepientId}-${senderId}`;
    socket.join(reverseRoomId);
  });

  // Listen for new messages and emit them to the correct room
  socket.on("newMessage", (messageData) => {
    const roomId = `${messageData.senderId}-${messageData.recepientId}`;
    io.to(roomId).emit("newMessage", messageData);

    // Emit to the reverse room as well (recipient's side)
    const reverseRoomId = `${messageData.recepientId}-${messageData.senderId}`;
    io.to(reverseRoomId).emit("newMessage", messageData);
  });

  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

///endpoint to get the userDetails to design the chat Room header
app.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const receipentId = await User.findById(userId);

    res.json(receipentId);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server erro" });
  }
});

//delete
app.post("/deletemessages", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ message: "invalid req body" });
    }
    await Messages.deleteMany({ _id: { $in: messages } });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server erro" });
  }
});

//check friends

app.get("/friend-request/sent/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .populate("sentFriendRequests", "name email image")
      .lean();

    const sentFriendRequests = user.sentFriendRequests;
    res.json(sentFriendRequests);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server erro" });
  }
});

app.get("/friends/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    User.findById(userId)
      .populate("friends")
      .then((user) => {
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const friendIs = user.friends.map((friend) => friend._id);

        res.status(200).json(friendIs);
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server erro" });
  }
});

server.listen(4000, () => {
  console.log("Server is running successfully");
});
