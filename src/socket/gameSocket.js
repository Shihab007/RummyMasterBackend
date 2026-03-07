const matchmaking = require("../services/matchmaking");

module.exports = function setupGameSocket(io) {

  io.on("connection", (socket) => {

    console.log("Player connected:", socket.id);

    socket.on("join_queue", () => {
      matchmaking.addPlayer(socket, io);
    });

    socket.on("draw_tile", ({ roomId }) => {
      const game = matchmaking.games.get(roomId);
      if (!game) return;

      try {
        const tile = game.draw(socket.id);

        io.to(roomId).emit("tile_drawn", {
          player: socket.id,
          tile,
          nextState: game.state
        });

      } catch (err) {
        socket.emit("error_message", err.message);
      }
    });

    socket.on("discard_tile", ({ roomId, tileId }) => {
      const game = matchmaking.games.get(roomId);
      if (!game) return;

      try {
        const discarded = game.discard(socket.id, tileId);

        io.to(roomId).emit("tile_discarded", {
          player: socket.id,
          tile: discarded,
          nextTurn: game.currentTurn
        });

      } catch (err) {
        socket.emit("error_message", err.message);
      }
    });

    socket.on("declare_win", ({ roomId }) => {
      const game = matchmaking.games.get(roomId);
      if (!game) return;

      try {
        game.declareWin(socket.id);

        io.to(roomId).emit("game_over", {
          winner: socket.id
        });

      } catch (err) {
        socket.emit("error_message", err.message);
      }
    });

    socket.on("disconnect", () => {
      console.log("Player disconnected:", socket.id);
    });

  });

};