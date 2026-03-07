const GameSession = require("../engine/gameSession");

const queue = [];
const games = new Map();

function addPlayer(socket, io) {

  queue.push(socket);

  if (queue.length >= 2) {

    const player1 = queue.shift();
    const player2 = queue.shift();

    const game = new GameSession(player1.id, player2.id);

    games.set(game.id, game);

    player1.join(game.id);
    player2.join(game.id);

    player1.emit("match_found", {
      roomId: game.id,
      opponent: player2.id,
      hand: game.hands[player1.id],
      joker: {
        color: game.jokerColor,
        number: game.jokerNumber
      }
    });

    player2.emit("match_found", {
      roomId: game.id,
      opponent: player1.id,
      hand: game.hands[player2.id],
      joker: {
        color: game.jokerColor,
        number: game.jokerNumber
      }
    });

    io.to(game.id).emit("turn", game.currentTurn);

  }

}

module.exports = {
   addPlayer,
   games
};