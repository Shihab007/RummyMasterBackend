const Deck = require("./deck");
const Validator = require("./validator");

class GameSession {
  constructor(player1Id, player2Id) {
    this.id = Date.now().toString();

    this.players = [player1Id, player2Id];

    this.deck = new Deck();

    this.hands = {
      [player1Id]: [],
      [player2Id]: []
    };

    this.discardPile = [];

    this.currentTurn = player1Id;
    this.state = "AWAIT_DRAW";
    this.winner = null;

    this.setupGame();
  }

  setupGame() {
    // Indicator tile
    this.indicatorTile = this.deck.draw();

    // Determine joker
    this.jokerColor = this.indicatorTile.color;
    this.jokerNumber =
      this.indicatorTile.number === 13
        ? 1
        : this.indicatorTile.number + 1;

    // Mark joker tiles
    this.deck.tiles.forEach(tile => {
      if (
        tile.color === this.jokerColor &&
        tile.number === this.jokerNumber
      ) {
        tile.isJoker = true;
      }
    });

    // Deal 14 tiles
    for (let i = 0; i < 14; i++) {
      for (let player of this.players) {
        this.hands[player].push(this.deck.draw());
      }
    }
  }

  draw(playerId) {
    if (this.state !== "AWAIT_DRAW")
      throw new Error("Invalid state");

    if (playerId !== this.currentTurn)
      throw new Error("Not your turn");

    const tile = this.deck.draw();
    this.hands[playerId].push(tile);

    this.state = "AWAIT_DISCARD";
    return tile;
  }

  discard(playerId, tileId) {
    if (this.state !== "AWAIT_DISCARD")
      throw new Error("Must draw first");

    if (playerId !== this.currentTurn)
      throw new Error("Not your turn");

    const hand = this.hands[playerId];
    const index = hand.findIndex(t => t.id === tileId);

    if (index === -1)
      throw new Error("Tile not in hand");

    const [tile] = hand.splice(index, 1);
    this.discardPile.push(tile);

    this.state = "AWAIT_DRAW";
    this.switchTurn();

    return tile;
  }

  switchTurn() {
    this.currentTurn =
      this.players.find(p => p !== this.currentTurn);
  }
}

module.exports = GameSession;