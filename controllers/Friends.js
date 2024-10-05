const message = require("../models/message");
const User = require("../models/user");

const Frrequest = async (req, res) => {
  const { currentUserId, selectUserId } = req.body;

  try {
    const sendreq = await User.findById(selectUserId);

    if (!sendreq) {
      res.status(400).json({ message: "User not found" });
    }
    sendreq.friendRequests.push(currentUserId);
    await sendreq.save();

    const addfri = await User.findById(currentUserId);
    if (!addfri) {
      res.status(400).json({ message: "User not found" });
    }
    addfri.sentFriendRequests.push(selectUserId);
    await addfri.save();

    res.status(200).json({ message: "The user send request is success" });
  } catch (error) {
    res.status(500).json({ message: "user friend request not sent" });
    console.log(error);
  }
};

module.exports = { Frrequest };
