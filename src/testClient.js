const { io } = require("socket.io-client");

const player1 = io("http://localhost:3000");
const player2 = io("http://localhost:3000");

// ✅ FIX: Both players store their own roomId and hand separately
let p1 = { roomId: null, hand: [], id: null };
let p2 = { roomId: null, hand: [], id: null };

// ─────────────────────────────────────────
// CONNECTION
// ─────────────────────────────────────────

player1.on("connect", () => {
  p1.id = player1.id;
  console.log("✅ Player1 connected:", player1.id);
  player1.emit("join_queue");
});

player2.on("connect", () => {
  p2.id = player2.id;
  console.log("✅ Player2 connected:", player2.id);
  player2.emit("join_queue");
});

// ─────────────────────────────────────────
// MATCH FOUND
// ─────────────────────────────────────────

player1.on("match_found", (data) => {
  p1.roomId = data.roomId;
  p1.hand = [...data.hand];
  console.log("\n🎮 Player1 match found!");
  console.log("   Room:", data.roomId);
  console.log("   Joker:", data.joker.color, data.joker.number);
  console.log("   Hand size:", data.hand.length);
  console.log("   Scores:", data.scores);
});

player2.on("match_found", (data) => {
  p2.roomId = data.roomId;         // ✅ FIX: player2 stores roomId too
  p2.hand = [...data.hand];
  console.log("\n🎮 Player2 match found!");
  console.log("   Room:", data.roomId);
  console.log("   Hand size:", data.hand.length);
});

// ─────────────────────────────────────────
// TURN HANDLING
// ✅ FIX: turn event is now { player, state }
// state tells us AWAIT_DRAW vs AWAIT_DISCARD
// so the client knows whether to draw first or discard directly
// ─────────────────────────────────────────

player1.on("turn", ({ player, state }) => {
  const isMyTurn = player === player1.id;
  console.log(`\n🔄 Turn: ${isMyTurn ? "Player1" : "Player2"} | State: ${state}`);
  if (!isMyTurn) return;

  setTimeout(() => {
    if (state === "AWAIT_DISCARD") {
      // Already have extra tile — discard directly, no draw needed
      const tileToDiscard = p1.hand[0];
      console.log("Player1 discarding (no draw):", tileToDiscard.color, tileToDiscard.number);
      p1.hand.splice(0, 1);
      player1.emit("discard_tile", { roomId: p1.roomId, tileId: tileToDiscard.id });

    } else {
      // Normal turn — draw then discard
      console.log("Player1 → drawing tile");
      player1.emit("draw_tile", { roomId: p1.roomId });

      setTimeout(() => {
        const tileToDiscard = p1.hand[0];
        console.log("Player1 discarding:", tileToDiscard.color, tileToDiscard.number);
        p1.hand.splice(0, 1);
        player1.emit("discard_tile", { roomId: p1.roomId, tileId: tileToDiscard.id });
      }, 500);
    }
  }, 500);
});

player2.on("turn", ({ player, state }) => {
  const isMyTurn = player === player2.id;
  if (!isMyTurn) return;
  console.log(`\n🔄 Player2 turn | State: ${state}`);

  setTimeout(() => {
    if (state === "AWAIT_DISCARD") {
      const tileToDiscard = p2.hand[0];
      console.log("Player2 discarding (no draw):", tileToDiscard.color, tileToDiscard.number);
      p2.hand.splice(0, 1);
      player2.emit("discard_tile", { roomId: p2.roomId, tileId: tileToDiscard.id });

    } else {
      console.log("Player2 → drawing tile");
      player2.emit("draw_tile", { roomId: p2.roomId });

      setTimeout(() => {
        const tileToDiscard = p2.hand[0];
        console.log("Player2 discarding:", tileToDiscard.color, tileToDiscard.number);
        p2.hand.splice(0, 1);
        player2.emit("discard_tile", { roomId: p2.roomId, tileId: tileToDiscard.id });
      }, 500);
    }
  }, 500);
});

// ─────────────────────────────────────────
// TILE EVENTS
// ─────────────────────────────────────────

player1.on("tile_drawn", (data) => {
  if (data.player === player1.id) {
    p1.hand.push(data.tile);
    console.log(`Player1 drew: ${data.tile.color} ${data.tile.number} | Hand: ${p1.hand.length} | Deck: ${data.deckCount}`);
  } else {
    console.log(`Opponent drew | Deck: ${data.deckCount}`);
  }
});

player2.on("tile_drawn", (data) => {
  if (data.player === player2.id) {
    p2.hand.push(data.tile);
    console.log(`Player2 drew: ${data.tile.color} ${data.tile.number} | Hand: ${p2.hand.length}`);
  }
});

player1.on("tile_discarded", (data) => {
  const who = data.player === player1.id ? "Player1" : "Player2";
  console.log(`♟️  ${who} discarded: ${data.tile.color} ${data.tile.number} | Pile: ${data.discardPileCount}`);
});

// ─────────────────────────────────────────
// GAME OVER
// ─────────────────────────────────────────

player1.on("game_over", (data) => {
  console.log("\n🏆 GAME OVER");

  if (!data.winner) {
    // winner is null = deck ran out, no winner
    console.log("   Result: DRAW —", data.message);
  } else {
    // someone actually won
    console.log("   Winner:", data.winner === player1.id ? "Player1" : "Player2");
    console.log("   Win type:", data.winType);
    console.log("   Points lost:", data.pointsLost);
  }

  console.log("   Final Scores:", data.scores);
  process.exit(0);
});

// ─────────────────────────────────────────
// ERROR & DISCONNECT
// ─────────────────────────────────────────

player1.on("error_message", (msg) => console.error("❌ Player1 error:", msg));
player2.on("error_message", (msg) => console.error("❌ Player2 error:", msg));

player1.on("opponent_disconnected", (data) => { console.log("⚠️ ", data.message); process.exit(0); });
player2.on("opponent_disconnected", (data) => { console.log("⚠️ ", data.message); process.exit(0); });