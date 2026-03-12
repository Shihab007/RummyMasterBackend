class Validator {

  // Check if a tile is the joker
  static isJoker(tile, jokerColor, jokerNumber) {
    return tile.color === jokerColor && tile.number === jokerNumber;
  }

  // ✅ FIX 1: Try Form Set — Same Number, DISTINCT Colors (was missing distinct color check)
  static tryFormSet(tile, tiles, jokerColor, jokerNumber) {
    const jokers = tiles.filter(t => this.isJoker(t, jokerColor, jokerNumber));

    const sameNumber = tiles.filter(
      t => t.number === tile.number && !this.isJoker(t, jokerColor, jokerNumber)
    );

    // ✅ FIX: Deduplicate by color — a set cannot have two tiles of the same color
    // e.g. Red-5, Red-5, Blue-5 is NOT a valid set
    const uniqueColorTiles = [];
    const seenColors = new Set();
    for (const t of sameNumber) {
      if (!seenColors.has(t.color)) {
        seenColors.add(t.color);
        uniqueColorTiles.push(t);
      }
    }

    // Set can be 3 or 4 tiles max (4 colors max)
    const totalCount = uniqueColorTiles.length + jokers.length;
    if (totalCount < 3) return false;

    for (let size = 3; size <= Math.min(totalCount, 4); size++) {
      const needed = size - uniqueColorTiles.length;

      if (needed >= 0 && needed <= jokers.length) {
        let remainingTiles = [...tiles];

        // Remove the unique color tiles used
        uniqueColorTiles.forEach(t => {
          const idx = remainingTiles.findIndex(x => x.id === t.id);
          if (idx !== -1) remainingTiles.splice(idx, 1);
        });

        // Remove jokers used to fill the set
        for (let i = 0; i < needed; i++) {
          const jokerIdx = remainingTiles.findIndex(t =>
            this.isJoker(t, jokerColor, jokerNumber)
          );
          if (jokerIdx !== -1) remainingTiles.splice(jokerIdx, 1);
        }

        if (this.canFormGroups(remainingTiles, jokerColor, jokerNumber))
          return true;
      }
    }

    return false;
  }

  // Try Form Run — Same Color, Consecutive Numbers
  // Jokers can fill gaps in the sequence
  static tryFormRun(tile, tiles, jokerColor, jokerNumber) {
    // ✅ Skip if this tile itself is a joker — let canFormGroups handle joker-first hands
    if (this.isJoker(tile, jokerColor, jokerNumber)) return false;

    const color = tile.color;

    const jokers = tiles.filter(t => this.isJoker(t, jokerColor, jokerNumber));

    const sameColor = tiles
      .filter(t => t.color === color && !this.isJoker(t, jokerColor, jokerNumber))
      .sort((a, b) => a.number - b.number);

    if (sameColor.length + jokers.length < 3) return false;

    for (let i = 0; i < sameColor.length; i++) {
      let sequence = [sameColor[i]];
      let remainingJokers = [...jokers];

      for (let j = i + 1; j < sameColor.length; j++) {
        const expected = sequence[sequence.length - 1].number + 1;
        const actual = sameColor[j].number;

        if (actual === expected) {
          // Consecutive — add to sequence directly
          sequence.push(sameColor[j]);
        } else {
          // Gap — try to fill with jokers
          const gap = actual - expected;

          if (gap <= remainingJokers.length) {
            for (let g = 0; g < gap; g++) {
              sequence.push({ fake: true }); // joker placeholder
              remainingJokers.pop();
            }
            sequence.push(sameColor[j]);
          } else {
            break; // Gap too large, can't fill
          }
        }

        if (sequence.length >= 3) {
          let remainingTiles = [...tiles];

          sequence.forEach(seqTile => {
            if (seqTile.fake) {
              // Remove one joker
              const jokerIdx = remainingTiles.findIndex(t =>
                this.isJoker(t, jokerColor, jokerNumber)
              );
              if (jokerIdx !== -1) remainingTiles.splice(jokerIdx, 1);
            } else {
              const idx = remainingTiles.findIndex(t => t.id === seqTile.id);
              if (idx !== -1) remainingTiles.splice(idx, 1);
            }
          });

          if (this.canFormGroups(remainingTiles, jokerColor, jokerNumber))
            return true;
        }
      }

      // ✅ Also try starting a run with jokers BEFORE this tile
      // e.g. joker, joker, Red-5 is a valid run
      if (jokers.length >= 2 && sequence.length < 3) {
        let prefixSequence = [];
        let prefixJokers = [...jokers];

        for (let k = 0; k < prefixJokers.length && prefixSequence.length < 2; k++) {
          prefixSequence.push({ fake: true });
        }
        prefixSequence.push(sameColor[i]);

        if (prefixSequence.length >= 3) {
          let remainingTiles = [...tiles];

          prefixSequence.forEach(seqTile => {
            if (seqTile.fake) {
              const jokerIdx = remainingTiles.findIndex(t =>
                this.isJoker(t, jokerColor, jokerNumber)
              );
              if (jokerIdx !== -1) remainingTiles.splice(jokerIdx, 1);
            } else {
              const idx = remainingTiles.findIndex(t => t.id === seqTile.id);
              if (idx !== -1) remainingTiles.splice(idx, 1);
            }
          });

          if (this.canFormGroups(remainingTiles, jokerColor, jokerNumber))
            return true;
        }
      }
    }

    return false;
  }

  // ✅ FIX 2: Seven Pairs win condition — was completely missing
  // A winning hand of at least 7 pairs (identical color + number)
  // Jokers can substitute for any unpaired tile
  static isSevenPairs(tiles, jokerColor, jokerNumber) {
    const jokers = tiles.filter(t => this.isJoker(t, jokerColor, jokerNumber));
    const nonJokers = tiles.filter(t => !this.isJoker(t, jokerColor, jokerNumber));

    // Count occurrences of each tile (color + number)
    const groups = {};
    for (const t of nonJokers) {
      const key = `${t.color}-${t.number}`;
      groups[key] = (groups[key] || 0) + 1;
    }

    let pairs = 0;
    let unpaired = 0;

    for (const count of Object.values(groups)) {
      pairs += Math.floor(count / 2);
      unpaired += count % 2;
    }

    // Each joker can either:
    // a) pair with an unpaired tile
    // b) pair with another joker
    let jokersLeft = jokers.length;
    const usedForUnpaired = Math.min(jokersLeft, unpaired);
    pairs += usedForUnpaired;
    jokersLeft -= usedForUnpaired;
    pairs += Math.floor(jokersLeft / 2); // two jokers = one pair

    return pairs >= 7;
  }

  // Main win check — runs/sets OR seven pairs
  static isWinningHand(tiles, jokerColor, jokerNumber) {
    return (
      this.canFormGroups([...tiles], jokerColor, jokerNumber) ||
      this.isSevenPairs([...tiles], jokerColor, jokerNumber)
    );
  }

  static canFormGroups(tiles, jokerColor, jokerNumber) {
    if (tiles.length === 0) return true;

    const firstTile = tiles[0];

    return (
      this.tryFormSet(firstTile, tiles, jokerColor, jokerNumber) ||
      this.tryFormRun(firstTile, tiles, jokerColor, jokerNumber)
    );
  }
}

module.exports = Validator;