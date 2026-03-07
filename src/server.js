const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const setupGameSocket = require("./socket/gameSocket");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

setupGameSocket(io);

const PORT = 3000;

server.listen(PORT, () => {
  console.log("Server running on port", PORT);
});