let io;
module.exports = {
  init: (appServer, configration) => {
    io = require("socket.io")(appServer, configration);
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("io error!");
    }
    return io;
  },
};
