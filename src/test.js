const GameSession = require("./engine/gameSession");

const game = new GameSession("A", "B");

console.log("Player A tiles:", game.hands["A"].length);
console.log("Player B tiles:", game.hands["B"].length);
console.log("Current turn:", game.currentTurn);
console.log("Joker:", game.jokerColor, game.jokerNumber);