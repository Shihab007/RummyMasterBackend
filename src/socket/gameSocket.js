const matchmaking = require("../services/matchmaking");

module.exports = function setupGameSocket(io) {

  io.on("connection", (socket) => {

    console.log("Player connected:", socket.id);

    // ─────────────────────────────────────────
    // MATCHMAKING
    // ─────────────────────────────────────────

    socket.on("join_queue", () => {
      matchmaking.addPlayer(socket, io);
    });

    // ─────────────────────────────────────────
    // GAME ACTIONS
    // ─────────────────────────────────────────

    // Draw tile from the deck
    socket.on("draw_tile", ({ roomId }) => {
      const game = matchmaking.games.get(roomId);
      if (!game) return socket.emit("error_message", "Game not found");

      try {
        const tile = game.draw(socket.id);

        io.to(roomId).emit("tile_drawn", {
          player: socket.id,
          tile: tile,
          deckCount: game.deck.tiles.length,
          currentTurn: game.currentTurn,
          state: game.state
        });

      } catch (err) {
        // ✅ Deck ran out — end game gracefully as a draw
        if (err.isDeckEmpty) {
          io.to(roomId).emit("game_over", {
            winner: null,
            winType: "draw",
            message: "Deck exhausted. Game ended as a draw.",
            scores: game.scores
          });
          matchmaking.games.delete(roomId);
          console.log("Game ended (deck empty): Room", roomId);
        } else {
          socket.emit("error_message", err.message);
        }
      }
    });

    // ✅ FIX: Draw tile from the discard pile — was completely missing
    socket.on("draw_from_discard", ({ roomId }) => {
      const game = matchmaking.games.get(roomId);
      if (!game) return socket.emit("error_message", "Game not found");

      try {
        const tile = game.drawFromDiscard(socket.id);

        // Both players see this — discard pile top changes
        io.to(roomId).emit("tile_drawn_from_discard", {
          player: socket.id,
          tile: tile,
          discardPileTop: game.discardPile[game.discardPile.length - 1] || null,
          discardPileCount: game.discardPile.length,
          currentTurn: game.currentTurn,
          state: game.state
        });

      } catch (err) {
        socket.emit("error_message", err.message);
      }
    });

    // Discard a tile from hand
    socket.on("discard_tile", ({ roomId, tileId }) => {
      const game = matchmaking.games.get(roomId);
      if (!game) return socket.emit("error_message", "Game not found");

      try {
        const discarded = game.discard(socket.id, tileId);

        // Both players see the discarded tile (it's face up on discard pile)
        io.to(roomId).emit("tile_discarded", {
          player: socket.id,
          tile: discarded,
          discardPileTop: discarded,
          discardPileCount: game.discardPile.length,
          nextTurn: game.currentTurn,
          state: game.state
        });

        // ✅ Emit turn with state so next player knows to draw (not discard)
        io.to(roomId).emit("turn", {
          player: game.currentTurn,
          state: game.state  // will always be "AWAIT_DRAW" here
        });

      } catch (err) {
        socket.emit("error_message", err.message);
      }
    });

    // Player declares a winning hand
    socket.on("declare_win", ({ roomId }) => {
      const game = matchmaking.games.get(roomId);
      if (!game) return socket.emit("error_message", "Game not found");

      try {
        const result = game.declareWin(socket.id);

        // Broadcast game over to the whole room
        io.to(roomId).emit("game_over", {
          winner: result.winner,
          winType: result.winType,      // "normal" | "seven_pairs"
          pointsLost: result.pointsLost,
          scores: result.scores,
          winnerHand: game.hands[socket.id] // show winning hand to all
        });

        // Clean up the game from memory
        matchmaking.games.delete(roomId);
        console.log(`Game ended: Room ${roomId} | Winner: ${socket.id}`);

      } catch (err) {
        socket.emit("error_message", err.message);
      }
    });

    // ─────────────────────────────────────────
    // RECONNECTION
    // ─────────────────────────────────────────

    // ✅ FIX: Player reconnects mid-game — restore their state
    socket.on("reconnect_game", ({ roomId, playerId }) => {
      const game = matchmaking.games.get(roomId);

      if (!game) {
        socket.emit("error_message", "Game not found or already ended");
        return;
      }

      if (!game.players.includes(playerId)) {
        socket.emit("error_message", "You are not a player in this game");
        return;
      }

      // Re-join the socket room
      socket.join(roomId);

      // Send full game state back to reconnected player
      socket.emit("game_state", game.getStateForPlayer(playerId));

      console.log(`Player reconnected: ${playerId} → Room ${roomId}`);
    });

    // ─────────────────────────────────────────
    // DISCONNECT
    // ─────────────────────────────────────────

    // ✅ FIX: Clean up on disconnect
    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);

      // Remove from queue if they were waiting
      matchmaking.removePlayer(socket.id);

      // Check if they were in an active game
      const game = matchmaking.findGameByPlayer(socket.id);

      if (game) {
        // Notify opponent
        io.to(game.id).emit("opponent_disconnected", {
          message: "Your opponent disconnected. Game ended."
        });

        // Clean up the game
        matchmaking.games.delete(game.id);
        console.log(`Game removed due to disconnect: Room ${game.id}`);
      }
    });

  });

};