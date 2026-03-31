// singlePlayer.js
// Connects ONE fake player to act as Unity's opponent
// Usage: node src/singlePlayer.js

const { io } = require("socket.io-client");

const opponent = io("http://localhost:3000");

let roomId = null;
let hand = [];
let myId = null;

opponent.on("connect", () => {
  myId = opponent.id;
  console.log("🤖 First opponent connected:", myId);
  console.log("⏳ Waiting for Unity to connect and join queue...");
  opponent.emit("join_queue");
});

opponent.on("match_found", (data) => {
  roomId = data.roomId;
  hand = [...data.hand];
  console.log("\n🎮 Match found!");
  console.log("   Room:", data.roomId);
  console.log("   Hand size:", data.hand.length);
  console.log("   Joker:", data.joker.color, data.joker.number);
  console.log("\n Unity should now see the match — check Unity console!");
});

opponent.on("turn", ({ player, state }) => {
  const isMyTurn = player === opponent.id;
  if (!isMyTurn) {
    console.log(`\n⏳ Unity's turn (State: ${state}) — waiting...`);
    return;
  }

  console.log(`\n🔄 First opponent turn | State: ${state}`);

  setTimeout(() => {
    if (state === "AWAIT_DISCARD") {
      discardFirst();
    } else {
      drawThenDiscard();
    }
  }, 1000); // slight delay so it feels natural
});

function drawThenDiscard() {
  console.log("🤖 Opponent drawing tile...");
  opponent.emit("draw_tile", { roomId });

  setTimeout(() => {
    discardFirst();
  }, 800);
}

function discardFirst() {
  if (hand.length === 0) {
    console.log("❌ No tiles to discard!");
    return;
  }
  const tile = hand.shift();
  console.log(`🤖 Opponent discarding: ${tile.color} ${tile.number}`);
  opponent.emit("discard_tile", { roomId, tileId: tile.id });
}

opponent.on("tile_drawn", (data) => {
  if (data.player === opponent.id) {
    hand.push(data.tile);
    console.log(`🤖 Opponent drew: ${data.tile.color} ${data.tile.number} | Hand: ${hand.length} | Deck: ${data.deckCount}`);
  } else {
    console.log(`Unity drew a tile | Deck: ${data.deckCount}`);
  }
});

opponent.on("tile_discarded", (data) => {
  const who = data.player === opponent.id ? "🤖 Opponent" : "🎮 Unity";
  console.log(`${who} discarded: ${data.tile.color} ${data.tile.number} | Pile: ${data.discardPileCount}`);
});

opponent.on("game_over", (data) => {
  console.log("\n🏆 GAME OVER");
  if (!data.winner || data.winType === "draw") {
    console.log("   Result: DRAW —", data.message);
  } else {
    const winner = data.winner === opponent.id ? "🤖 Fake Opponent" : "🎮 Unity Player";
    console.log("   Winner:", winner);
    console.log("   Win type:", data.winType);
  }
  console.log("   Scores:", data.scores);
  process.exit(0);
});

opponent.on("opponent_disconnected", (data) => {
  console.log("⚠️  Unity disconnected:", data.message);
  process.exit(0);
});

opponent.on("error_message", (msg) => {
  console.error("❌ Error:", msg);
});