const GameSession = require("../engine/gameSession");

const queue = [];          // stores socket IDs only (not socket objects)
const socketMap = new Map(); // socketId → socket object
const games = new Map();   // roomId → GameSession

// Add player to matchmaking queue
function addPlayer(socket, io) {

  // ✅ FIX 1: Prevent duplicate queue entries
  // If player is already in queue (e.g. double-click Play), ignore
  if (queue.includes(socket.id)) {
    console.log(`Player already in queue: ${socket.id}`);
    return;
  }

  // ✅ FIX 2: Store socket reference separately, not in queue array
  // This way queue only holds IDs — lightweight and safe
  queue.push(socket.id);
  socketMap.set(socket.id, socket);

  console.log(`Player queued: ${socket.id} | Queue size: ${queue.length}`);

  // If we have 2 players, start a match
  if (queue.length >= 2) {

    const player1Id = queue.shift();
    const player2Id = queue.shift();

    const player1 = socketMap.get(player1Id);
    const player2 = socketMap.get(player2Id);

    // ✅ FIX 3: Verify both sockets are still connected before matching
    // This handles the ghost player case — if socket disconnected while in queue
    if (!player1 || !player1.connected) {
      console.log(`Ghost player detected: ${player1Id}, skipping`);
      socketMap.delete(player1Id);
      // Put player2 back in queue and try again
      if (player2 && player2.connected) {
        queue.unshift(player2Id);
      }
      return;
    }

    if (!player2 || !player2.connected) {
      console.log(`Ghost player detected: ${player2Id}, skipping`);
      socketMap.delete(player2Id);
      // Put player1 back in queue and try again
      if (player1 && player1.connected) {
        queue.unshift(player1Id);
      }
      return;
    }

    // Both players are valid — create game session
    const game = new GameSession(player1Id, player2Id);
    games.set(game.id, game);

    // Join both sockets to the room
    player1.join(game.id);
    player2.join(game.id);

    // Clean up socket map since they're now in a game
    socketMap.delete(player1Id);
    socketMap.delete(player2Id);

    console.log(`Match created: Room ${game.id} | ${player1Id} vs ${player2Id}`);
    console.log(`Joker: ${game.jokerColor} ${game.jokerNumber}`);

    // Send match data to Player 1
    player1.emit("match_found", {
      roomId: game.id,
      opponent: player2Id,
      hand: game.hands[player1Id],
      opponentTileCount: game.hands[player2Id].length, // ✅ NEW: so Unity can render face-down tiles
      joker: {
        color: game.jokerColor,
        number: game.jokerNumber
      },
      scores: game.scores // ✅ NEW: initial score state
    });

    // Send match data to Player 2
    player2.emit("match_found", {
      roomId: game.id,
      opponent: player1Id,
      hand: game.hands[player2Id],
      opponentTileCount: game.hands[player1Id].length, // ✅ NEW
      joker: {
        color: game.jokerColor,
        number: game.jokerNumber
      },
      scores: game.scores // ✅ NEW
    });

    // ✅ Emit turn WITH state so client knows whether to draw or discard
    io.to(game.id).emit("turn", {
      player: game.currentTurn,
      state: game.state  // "AWAIT_DRAW" or "AWAIT_DISCARD"
    });
  }
}

// ✅ FIX 4: Remove player from queue on disconnect
// Called from gameSocket.js disconnect handler
function removePlayer(socketId) {
  const idx = queue.indexOf(socketId);
  if (idx !== -1) {
    queue.splice(idx, 1);
    console.log(`Player removed from queue: ${socketId} | Queue size: ${queue.length}`);
  }
  socketMap.delete(socketId);
}

// Find which game a socket ID belongs to (used in disconnect handler)
function findGameByPlayer(socketId) {
  for (const [roomId, game] of games) {
    if (game.players.includes(socketId)) {
      return game;
    }
  }
  return null;
}

module.exports = {
  addPlayer,
  removePlayer,
  findGameByPlayer,
  games
};