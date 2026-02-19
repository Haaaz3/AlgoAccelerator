/**
 * Chess Puzzles (~1000 ELO)
 *
 * Real tactical puzzles with clear objectives.
 * Each puzzle is a single-move solution.
 */

export const CHESS_PUZZLES = [
  // ===== MATE IN 1 =====
  {
    id: 'm1-01',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: 'e1e8',
    goal: 'Mate in 1',
    hint: 'The back rank is weak.',
  },
  {
    id: 'm1-02',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    solution: 'f3f7',
    goal: 'Mate in 1',
    hint: 'The f7 pawn is only defended by the king.',
  },
  {
    id: 'm1-03',
    fen: '5rk1/6pp/8/8/8/8/2Q3PP/6K1 w - - 0 1',
    solution: 'c2c8',
    goal: 'Mate in 1',
    hint: 'The queen can reach the back rank.',
  },
  {
    id: 'm1-04',
    fen: '3qk3/3pp3/8/8/8/8/6Q1/4K3 w - - 0 1',
    solution: 'g2g8',
    goal: 'Mate in 1',
    hint: 'Back rank is unguarded.',
  },
  {
    id: 'm1-05',
    fen: '5k2/5P1p/5K2/8/8/8/8/8 w - - 0 1',
    solution: 'f7f8q',
    goal: 'Mate in 1',
    hint: 'Promote with checkmate.',
  },
  {
    id: 'm1-06',
    fen: '6k1/3R2pp/8/8/8/8/6PP/6K1 w - - 0 1',
    solution: 'd7d8',
    goal: 'Mate in 1',
    hint: 'Rook delivers back rank mate.',
  },
  {
    id: 'm1-07',
    fen: '6k1/5p1p/6pQ/8/8/8/5PPP/6K1 w - - 0 1',
    solution: 'h6h8',
    goal: 'Mate in 1',
    hint: 'The queen slides to h8.',
  },
  {
    id: 'm1-08',
    fen: '6k1/5p1p/6p1/8/8/8/1Q3PPP/6K1 w - - 0 1',
    solution: 'b2b8',
    goal: 'Mate in 1',
    hint: 'Queen to the back rank.',
  },
  {
    id: 'm1-09',
    fen: 'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 1',
    solution: 'h4e1',
    goal: 'Mate in 1',
    hint: 'The diagonal is wide open.',
  },
  {
    id: 'm1-10',
    fen: 'r1bqkb1r/ppppnppp/5n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1',
    solution: 'h5f7',
    goal: 'Mate in 1',
    hint: 'The knight moved away from guarding f7.',
  },

  // ===== WIN MATERIAL =====
  {
    id: 'wm-01',
    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    solution: 'c4f7',
    goal: 'Win material',
    hint: 'Check the king and attack the rook.',
  },
  {
    id: 'wm-02',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
    solution: 'f1b5',
    goal: 'Win material',
    hint: 'Pin the knight to the king.',
  },
  {
    id: 'wm-03',
    fen: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    solution: 'c4f7',
    goal: 'Win material',
    hint: 'Check wins the bishop on g4.',
  },
  {
    id: 'wm-04',
    fen: 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    solution: 'f3e5',
    goal: 'Win material',
    hint: 'Take the free pawn.',
  },
  {
    id: 'wm-05',
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1',
    solution: 'g8e7',
    goal: 'Defend',
    hint: 'Block the pin and develop.',
  },
  {
    id: 'wm-06',
    fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 0 1',
    solution: 'f6e4',
    goal: 'Win material',
    hint: 'The pawn on e4 is undefended.',
  },

  // ===== BACK RANK MATES =====
  {
    id: 'br-01',
    fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
    solution: 'd1d8',
    goal: 'Mate in 1',
    hint: 'Exchange into checkmate.',
  },
  {
    id: 'br-02',
    fen: '2kr4/ppp2ppp/8/8/8/8/PPP2PPP/2KR4 w - - 0 1',
    solution: 'd1d8',
    goal: 'Mate in 1',
    hint: 'Same idea, queenside.',
  },

  // ===== KNIGHT FORKS =====
  {
    id: 'nf-01',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1',
    solution: 'f3g5',
    goal: 'Win material',
    hint: 'Attack f7 with knight and bishop.',
  },
  {
    id: 'nf-02',
    fen: 'r3k2r/ppp2ppp/2n5/3np3/2B5/4PN2/PPP2PPP/R3K2R w KQkq - 0 1',
    solution: 'c4d5',
    goal: 'Win material',
    hint: 'Take the undefended knight.',
  },
];

/**
 * Get a random puzzle from the pool
 */
export function getRandomPuzzle() {
  const index = Math.floor(Math.random() * CHESS_PUZZLES.length);
  return CHESS_PUZZLES[index];
}

/**
 * Convert UCI move (e.g., 'e2e4') to object format for chess.js
 */
export function uciToMove(uci) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci[4] : undefined,
  };
}
