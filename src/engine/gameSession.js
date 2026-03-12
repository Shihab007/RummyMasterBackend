const { v4: uuidv4 } = require("uuid");
const Deck = require("./deck");
const Validator = require("./validator");

class GameSession {
  constructor(player1Id, player2Id) {

    // ✅ FIX 1: Use UUID instead of Date.now() to prevent ID collisions
    // Two games created in the same millisecond would get the same ID with Date.now()
    this.id = uuidv4();

    this.players = [player1Id, player2Id];

    this.deck = new Deck();

    this.hands = {
      [player1Id]: [],
      [player2Id]: []
    };

    this.discardPile = [];

    // ✅ FIX 2: Scoring system — each player starts with 20 points per Okey rules
    this.scores = {
      [player1Id]: 20,
      [player2Id]: 20
    };

    // First player gets 15 tiles and starts in AWAIT_DISCARD
    this.currentTurn = player1Id;
    this.state = "AWAIT_DISCARD"; // ✅ FIX 3: starts as AWAIT_DISCARD (first player already has extra tile)
    this.winner = null;
    this.winType = null; // "normal" | "seven_pairs" | "joker_discard"

    this.setupGame();
  }

  setupGame() {
    // Draw indicator tile to determine joker
    this.indicatorTile = this.deck.draw();

    // ✅ Joker is same color as indicator, number is +1 (wraps 13 → 1)
    this.jokerColor = this.indicatorTile.color;
    this.jokerNumber = this.indicatorTile.number === 13
      ? 1
      : this.indicatorTile.number + 1;

    // Mark joker tiles in the remaining deck
    this.deck.tiles.forEach(tile => {
      if (tile.color === this.jokerColor && tile.number === this.jokerNumber) {
        tile.isJoker = true;
      }
    });

    // ✅ FIX 4: Correct dealing per Okey rules
    // Deal 14 tiles to each player first
    for (let i = 0; i < 14; i++) {
      for (let player of this.players) {
        this.hands[player].push(this.deck.draw());
      }
    }

    // First player gets one extra tile (15 total) — they discard first
    this.hands[this.players[0]].push(this.deck.draw());

    console.log(`Game setup done.`);
    console.log(`Player1 tiles: ${this.hands[this.players[0]].length}`); // should be 15
    console.log(`Player2 tiles: ${this.hands[this.players[1]].length}`); // should be 14
    console.log(`Indicator: ${this.indicatorTile.color} ${this.indicatorTile.number}`);
    console.log(`Joker: ${this.jokerColor} ${this.jokerNumber}`);
  }

  // ✅ Draw tile from the deck
  draw(playerId) {
    if (this.state !== "AWAIT_DRAW")
      throw new Error("Invalid state: must wait for draw phase");

    if (playerId !== this.currentTurn)
      throw new Error("Not your turn");

    // Deck exhausted — end game as a draw
    if (this.deck.tiles.length === 0) {
      this.state = "GAME_ENDED";
      const err = new Error("DECK_EMPTY");
      err.isDeckEmpty = true;
      throw err;
    }

    const tile = this.deck.draw();
    this.hands[playerId].push(tile);

    this.state = "AWAIT_DISCARD";
    return tile;
  }

  // ✅ FIX 5: Draw from discard pile — missing core mechanic
  drawFromDiscard(playerId) {
    if (this.state !== "AWAIT_DRAW")
      throw new Error("Invalid state: must wait for draw phase");

    if (playerId !== this.currentTurn)
      throw new Error("Not your turn");

    if (this.discardPile.length === 0)
      throw new Error("Discard pile is empty");

    // Take the top (most recent) discard
    const tile = this.discardPile.pop();
    this.hands[playerId].push(tile);

    this.state = "AWAIT_DISCARD";
    return tile;
  }

  // Discard a tile from hand
  discard(playerId, tileId) {
    if (this.state !== "AWAIT_DISCARD")
      throw new Error("Must draw first before discarding");

    if (playerId !== this.currentTurn)
      throw new Error("Not your turn");

    const hand = this.hands[playerId];
    const index = hand.findIndex(t => t.id === tileId);

    if (index === -1)
      throw new Error("Tile not found in hand");

    const [tile] = hand.splice(index, 1);
    this.discardPile.push(tile);

    // Switch turn and go back to draw phase
    this.state = "AWAIT_DRAW";
    this.switchTurn();

    return tile;
  }

  // Player declares a winning hand
  declareWin(playerId) {
    if (playerId !== this.currentTurn)
      throw new Error("Not your turn");

    if (this.state !== "AWAIT_DISCARD")
      throw new Error("Must draw before declaring win");

    const hand = this.hands[playerId];

    // Check for seven pairs first
    const isSevenPairs = Validator.isSevenPairs(hand, this.jokerColor, this.jokerNumber);

    // Check for runs/sets win
    const isRunsAndSets = Validator.isWinningHand(hand, this.jokerColor, this.jokerNumber);

    if (!isSevenPairs && !isRunsAndSets)
      throw new Error("Invalid winning hand");

    this.winner = playerId;
    this.state = "GAME_ENDED";

    // ✅ FIX 6: Apply scoring per Okey rules
    // Seven pairs = 4 points lost by each other player
    // Normal win   = 2 points lost by each other player
    const pointsLost = isSevenPairs ? 4 : 2;
    this.winType = isSevenPairs ? "seven_pairs" : "normal";

    for (const p of this.players) {
      if (p !== playerId) {
        this.scores[p] = Math.max(0, this.scores[p] - pointsLost);
      }
    }

    return {
      winner: playerId,
      winType: this.winType,
      pointsLost,
      scores: this.scores
    };
  }

  switchTurn() {
    this.currentTurn = this.players.find(p => p !== this.currentTurn);
  }

  checkWin(playerId) {
    return Validator.isWinningHand(this.hands[playerId], this.jokerColor, this.jokerNumber);
  }

  // ✅ Returns full game state — used for reconnection
  getStateForPlayer(playerId) {
    return {
      roomId: this.id,
      hand: this.hands[playerId],
      opponentTileCount: this.hands[this.players.find(p => p !== playerId)].length,
      currentTurn: this.currentTurn,
      state: this.state,
      discardPileTop: this.discardPile[this.discardPile.length - 1] || null,
      discardPileCount: this.discardPile.length,
      deckCount: this.deck.tiles.length,
      joker: { color: this.jokerColor, number: this.jokerNumber },
      scores: this.scores
    };
  }
}

module.exports = GameSession;