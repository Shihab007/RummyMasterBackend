class Validator {
  static isJoker(tile, jokerColor, jokerNumber) {
    return tile.color === jokerColor && tile.number === jokerNumber;
  }

  // from here Try Form Set (Same Number, Different Colors)
  static tryFormSet(tile, tiles, jokerColor, jokerNumber) {
    const jokers = tiles.filter((t) =>
      this.isJoker(t, jokerColor, jokerNumber),
    );

    const sameNumber = tiles.filter(
      (t) =>
        t.number === tile.number && !this.isJoker(t, jokerColor, jokerNumber),
    );

    const uniqueColors = new Set(sameNumber.map((t) => t.color));

    let totalCount = sameNumber.length + jokers.length;

    if (totalCount < 3) return false;

    for (let size = 3; size <= totalCount; size++) {
      let needed = size - sameNumber.length;

      if (needed <= jokers.length) {
        let remainingTiles = [...tiles];

        // remove actual same number tiles
        sameNumber.forEach((t) => {
          const idx = remainingTiles.findIndex((x) => x.id === t.id);
          remainingTiles.splice(idx, 1);
        });

        // remove used jokers
        for (let i = 0; i < needed; i++) {
          const jokerIndex = remainingTiles.findIndex((t) =>
            this.isJoker(t, jokerColor, jokerNumber),
          );
          remainingTiles.splice(jokerIndex, 1);
        }

        if (this.canFormGroups(remainingTiles, jokerColor, jokerNumber))
          return true;
      }
    }

    return false;
  }

  // from here Try Form Run (Same Color, Consecutive Numbers)
  static tryFormRun(tile, tiles, jokerColor, jokerNumber) {
    const color = tile.color;

    const jokers = tiles.filter((t) =>
      this.isJoker(t, jokerColor, jokerNumber),
    );

    const sameColor = tiles
      .filter(
        (t) => t.color === color && !this.isJoker(t, jokerColor, jokerNumber),
      )
      .sort((a, b) => a.number - b.number);

    if (sameColor.length + jokers.length < 3) return false;

    for (let i = 0; i < sameColor.length; i++) {
      let sequence = [sameColor[i]];
      let remainingJokers = [...jokers];

      for (let j = i + 1; j < sameColor.length; j++) {
        const expected = sequence[sequence.length - 1].number + 1;

        if (sameColor[j].number === expected) {
          sequence.push(sameColor[j]);
        } else {
          let gap = sameColor[j].number - expected;

          if (gap <= remainingJokers.length) {
            while (gap > 0) {
              sequence.push({ fake: true });
              remainingJokers.pop();
              gap--;
            }
            sequence.push(sameColor[j]);
          } else {
            break;
          }
        }

        if (sequence.length >= 3) {
          let remainingTiles = [...tiles];

          sequence.forEach((seqTile) => {
            if (seqTile.fake) {
              const jokerIndex = remainingTiles.findIndex((t) =>
                this.isJoker(t, jokerColor, jokerNumber),
              );
              remainingTiles.splice(jokerIndex, 1);
            } else {
              const idx = remainingTiles.findIndex((t) => t.id === seqTile.id);
              remainingTiles.splice(idx, 1);
            }
          });

          if (this.canFormGroups(remainingTiles, jokerColor, jokerNumber))
            return true;
        }
      }
    }

    return false;
  }

  static isWinningHand(tiles, jokerColor, jokerNumber) {
    return this.canFormGroups([...tiles], jokerColor, jokerNumber);
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
