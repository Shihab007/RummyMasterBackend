const Tile = require("./tile");

const COLORS = ["Red", "Blue", "Green", "Black"];

class Deck {
  constructor() {
    this.tiles = [];
    this.createDeck();
    this.shuffle();
  }

  createDeck() {
    for (let color of COLORS) {
      for (let number = 1; number <= 13; number++) {
        this.tiles.push(new Tile(color, number));
        this.tiles.push(new Tile(color, number));
      }
    }
  }

  shuffle() {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  draw() {
    return this.tiles.shift();
  }
}

module.exports = Deck;