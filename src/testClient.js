const { io } = require("socket.io-client");

const player1 = io("http://localhost:3000");
const player2 = io("http://localhost:3000");

let roomId;
let player1Hand;

player1.on("connect", () => {
  console.log("Player1 connected:", player1.id);
  player1.emit("join_queue");
});

player2.on("connect", () => {
  console.log("Player2 connected:", player2.id);
  player2.emit("join_queue");
});

player1.on("match_found", (data) => {
  console.log("Player1 match found");

  roomId = data.roomId;
  player1Hand = data.hand;
});

player2.on("match_found", (data) => {
  console.log("Player2 match found");
});

player1.on("turn", (turn) => {

  if (turn === player1.id) {

    console.log("Player1 turn → drawing tile");

    player1.emit("draw_tile", { roomId });

    setTimeout(() => {

      const tileToDiscard = player1Hand[0];

      console.log("Player1 discarding:", tileToDiscard.id);

      player1.emit("discard_tile", {
        roomId,
        tileId: tileToDiscard.id
      });

    }, 1000);
  }
});

player1.on("tile_drawn", (data) => {
  console.log("Tile drawn:", data.tile);
});

player1.on("tile_discarded", (data) => {
  console.log("Tile discarded:", data.tile);
});

player2.on("tile_drawn", (data) => {
  console.log("Opponent drew a tile");
});

player2.on("tile_discarded", (data) => {
  console.log("Opponent discarded:", data.tile);
});