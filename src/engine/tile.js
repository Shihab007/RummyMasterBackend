const { v4: uuidv4 } = require("uuid");

class Tile {
  constructor(color, number) {
    this.id = uuidv4();   // unique tile instance
    this.color = color;
    this.number = number;
    this.isJoker = false;
  }
}

module.exports = Tile;