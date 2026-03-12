const { v4: uuidv4 } = require("uuid");

// tile.js
class Tile {
  constructor(color, number, isFalseJoker = false) {
    this.id = uuidv4();
    this.color = color;
    this.number = number;
    this.isJoker = false;
    this.isFalseJoker = isFalseJoker; // ✅
  }
}

module.exports = Tile;