import { hashStr } from '../core/util';

// Chess Club puzzles. Generated and verified with chess.js (every accepted move is a forced mate).
// First moves and replies are written as from+to squares, e.g. "d1h5". No castling, en passant or promotion.

export interface Puzzle {
  id: string;
  /** Position; the side to move is the solver. */
  fen: string;
  /** 1 (easiest) to 4 (hardest). */
  tier: 1 | 2 | 3 | 4;
  /** Mate in 1 or mate in 2. */
  moves: 1 | 2;
  /** Every first move that works. */
  first: string[];
  /** Mate in 2 only: the defender's reply and the mating moves, for each accepted first move. */
  line?: Record<string, { reply: string; mate: string[] }>;
  /** A name for the famous patterns. */
  note?: string;
}

export const PUZZLES: Puzzle[] = [
  {
    id: 'c0',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    tier: 1,
    moves: 1,
    first: ['e1e8'],
    note: 'Back-rank mate',
  },
  {
    id: 'c1',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
    tier: 1,
    moves: 1,
    first: ['h5f7'],
    note: 'Scholar’s mate',
  },
  {
    id: 'c2',
    fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
    tier: 2,
    moves: 1,
    first: ['g5f7'],
    note: 'Smothered mate',
  },
  {
    id: 'c3',
    fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1',
    tier: 1,
    moves: 1,
    first: ['g1g7'],
    note: 'Queen and king',
  },
  {
    id: 'c4',
    fen: '6k1/1R6/8/8/8/8/8/R5K1 w - - 0 1',
    tier: 1,
    moves: 1,
    first: ['a1a8'],
    note: 'Two rooks',
  },
  {
    id: 'c5',
    fen: '4k3/R7/4K3/8/8/8/8/8 w - - 0 1',
    tier: 1,
    moves: 1,
    first: ['a7a8'],
    note: 'Rook and king',
  },
  {
    id: 'c6',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
    tier: 1,
    moves: 1,
    first: ['d8h4'],
    note: 'Fool’s mate',
  },
  {
    id: 'c7',
    fen: '7k/8/5N2/8/8/8/8/K6R w - - 0 1',
    tier: 2,
    moves: 1,
    first: ['h1h7'],
    note: 'Arabian mate',
  },
  {
    id: 'c8',
    fen: '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
    tier: 1,
    moves: 1,
    first: ['d1d8'],
    note: 'Back-rank queen',
  },
  { id: 'p9', fen: '6k1/8/6K1/R7/8/3Q4/8/8 w - - 0 1', tier: 1, moves: 1, first: ['a5a8', 'd3d8'] },
  { id: 'p10', fen: '6R1/8/8/5K1k/8/8/8/8 w - - 0 1', tier: 1, moves: 1, first: ['g8h8'] },
  { id: 'p11', fen: '8/8/8/R7/8/6P1/5K2/7k w - - 0 1', tier: 1, moves: 1, first: ['a5h5'] },
  { id: 'p12', fen: '8/5R1Q/8/6k1/8/5K2/6r1/8 w - - 0 1', tier: 1, moves: 1, first: ['f7f5'] },
  { id: 'p13', fen: '8/8/3N4/5n2/2K4k/5R2/6Q1/8 w - - 0 1', tier: 1, moves: 1, first: ['f3h3'] },
  { id: 'p14', fen: '3b4/3R4/5p2/8/8/7K/8/7k w - - 0 1', tier: 1, moves: 1, first: ['d7d1'] },
  { id: 'p15', fen: 'N7/8/8/8/3p4/7p/k1K5/2R3Q1 w - - 0 1', tier: 1, moves: 1, first: ['c1a1'] },
  { id: 'p16', fen: '6k1/4R3/8/8/Q7/8/8/1K6 w - - 0 1', tier: 1, moves: 1, first: ['a4a8', 'a4e8'] },
  { id: 'p17', fen: '8/2r1R3/8/5N2/7N/7K/8/7k w - - 0 1', tier: 1, moves: 1, first: ['e7e1'] },
  { id: 'p18', fen: 'k7/7R/1K6/8/8/2R5/8/1b6 w - - 0 1', tier: 1, moves: 1, first: ['h7h8', 'c3c8'] },
  { id: 'p19', fen: '2k5/8/2K3B1/8/8/8/7R/8 w - - 0 1', tier: 1, moves: 1, first: ['h2h8'] },
  { id: 'p20', fen: '3B1K1k/8/8/6R1/8/6b1/8/1R2r3 w - - 0 1', tier: 1, moves: 1, first: ['g5h5'] },
  { id: 'p21', fen: '6Q1/2k5/7N/2K5/4R3/8/8/8 w - - 0 1', tier: 1, moves: 1, first: ['e4e7'] },
  { id: 'p22', fen: '5K1k/R5N1/8/8/8/6R1/8/8 w - - 0 1', tier: 1, moves: 1, first: ['g3h3'] },
  { id: 'p23', fen: '1QK3R1/3P4/8/7k/8/8/8/8 w - - 0 1', tier: 1, moves: 1, first: ['b8h2'] },
  { id: 'p24', fen: '7b/R7/8/n7/1Q2K3/8/8/k6N w - - 0 1', tier: 1, moves: 1, first: ['a7a5'] },
  {
    id: 'p25',
    fen: '2b2k1r/1p1ppp1p/1q6/2pP2p1/8/2P4N/r3PPPP/b3KB1R b K - 1 14',
    tier: 2,
    moves: 1,
    first: ['b6b1'],
  },
  {
    id: 'p26',
    fen: '2b2k1r/1p1ppp1p/8/2pP2p1/1q4P1/2P4N/r3PP1P/b3KB1R b K - 0 15',
    tier: 2,
    moves: 1,
    first: ['b4b1'],
  },
  {
    id: 'p27',
    fen: '2b2k1r/1p1ppp1p/8/2pP2N1/6P1/1qP5/r3PP1P/b3KB1R b K - 0 16',
    tier: 2,
    moves: 1,
    first: ['b3b1', 'a1c3'],
  },
  {
    id: 'p28',
    fen: '2b2k1r/1p2pp1p/r3P3/2p5/6P1/1qP5/4PP1P/b3KB1R b K - 0 18',
    tier: 2,
    moves: 1,
    first: ['a1c3'],
  },
  {
    id: 'p29',
    fen: '2b2k1r/1p2pp1p/r3P3/2p5/6P1/2q5/4PP1P/b2K1B1R b - - 1 19',
    tier: 2,
    moves: 1,
    first: ['a6d6'],
  },
  {
    id: 'p30',
    fen: '1R1nk3/3b1ppr/1Q1bp2p/4P3/5P2/n5P1/3N3P/4KBNR w - - 9 22',
    tier: 2,
    moves: 1,
    first: ['b6d8'],
  },
  {
    id: 'p31',
    fen: '1Qb1krn1/1p1ppp2/1p6/1N6/3bPP2/3P3N/P3K1P1/5B1R w - - 1 20',
    tier: 2,
    moves: 1,
    first: ['b8c8'],
  },
  {
    id: 'p32',
    fen: 'r2k1b2/1Pp1p1pr/p4n2/3p1p1p/6P1/q7/R2PPP1P/2B1KBNR b K - 0 16',
    tier: 2,
    moves: 1,
    first: ['a3c1'],
  },
  {
    id: 'p33',
    fen: 'B2k1b2/2p1p1pr/p4n2/3p1p2/6p1/q7/R2PPP1P/2B1KBNR b K - 0 17',
    tier: 2,
    moves: 1,
    first: ['a3c1'],
  },
  {
    id: 'p34',
    fen: 'B2k1b2/2p1p1p1/p4n2/3p1p2/6p1/q7/R2PPP1R/2B1KBN1 b - - 0 18',
    tier: 2,
    moves: 1,
    first: ['a3c1'],
  },
  {
    id: 'p35',
    fen: 'rn3b1r/p4pp1/1pk2n1p/3p1P2/PP4PK/3P3P/2q5/1RB3NR b - - 0 22',
    tier: 2,
    moves: 1,
    first: ['c2f2'],
  },
  {
    id: 'p36',
    fen: '2b1kb1Q/1Bpp1p2/1p6/p3p3/P1P1P3/Bq6/3P3P/RN4KR w - - 0 23',
    tier: 2,
    moves: 1,
    first: ['h8f8'],
  },
  {
    id: 'p37',
    fen: '1nb4r/r2k1p1p/8/ppp1P1q1/1P2n3/6P1/P3PP1P/RN2KBNR b KQ - 0 12',
    tier: 2,
    moves: 1,
    first: ['g5c1'],
  },
  {
    id: 'p38',
    fen: '1nb4r/r2k1p2/8/ppp1P1qp/1P2n2P/6P1/P3PP2/RN2KBNR b KQ - 0 13',
    tier: 2,
    moves: 1,
    first: ['g5c1'],
  },
  {
    id: 'p39',
    fen: '1r3bnr/ppB2kpp/4p3/5p1n/P1P1p3/NP1q2P1/5P1P/R3K1NR b - - 0 14',
    tier: 2,
    moves: 1,
    first: ['f8b4'],
  },
  {
    id: 'p40',
    fen: 'rnb1k1nr/pppp3p/8/5pq1/1QP1P3/8/PP2PPPP/RN2KBNR b KQkq - 0 8',
    tier: 2,
    moves: 1,
    first: ['g5c1'],
  },
  {
    id: 'p41',
    fen: '1Q1K4/8/8/Q7/8/2p5/8/6k1 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['b8g3'],
    line: { b8g3: { reply: 'g1f1', mate: ['a5a6', 'a5b5'] } },
  },
  {
    id: 'p42',
    fen: '5n2/8/2K5/k7/3NR3/8/8/8 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['d4b3'],
    line: { d4b3: { reply: 'a5a6', mate: ['e4a4'] } },
  },
  {
    id: 'p43',
    fen: '8/7k/1R6/8/8/2Q5/7K/8 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['c3c7'],
    line: { c3c7: { reply: 'h7g8', mate: ['b6b8'] } },
  },
  {
    id: 'p44',
    fen: 'R7/1k3b2/3Q4/4K2B/8/7b/8/8 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['a8b8', 'h5f3'],
    line: { a8b8: { reply: 'b7a7', mate: ['d6b6'] }, h5f3: { reply: 'f7d5', mate: ['f3d5'] } },
  },
  {
    id: 'p45',
    fen: '8/8/3R4/k6p/4R3/8/1K6/8 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['e4e5'],
    line: { e4e5: { reply: 'a5b4', mate: ['d6d4'] } },
  },
  {
    id: 'p46',
    fen: '6B1/K7/p6P/5Q2/8/8/7k/8 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['f5f2'],
    line: { f5f2: { reply: 'h2h3', mate: ['g8e6'] } },
  },
  {
    id: 'p47',
    fen: '8/2KB2Q1/8/7k/8/3N4/8/8 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['d3f4'],
    line: { d3f4: { reply: 'h5h4', mate: ['g7g4'] } },
  },
  {
    id: 'p48',
    fen: '4B3/8/8/6R1/2K5/4R3/k7/8 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['g5g2', 'e3e2'],
    line: { g5g2: { reply: 'a2b1', mate: ['e3e1'] }, e3e2: { reply: 'a2b1', mate: ['g5g1'] } },
  },
  {
    id: 'p49',
    fen: '4NR2/4R3/8/8/8/2K3k1/8/8 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['e7g7'],
    line: { e7g7: { reply: 'g3h4', mate: ['f8h8'] } },
  },
  {
    id: 'p50',
    fen: '2QK3k/8/8/8/2Bn2R1/8/8/8 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['g4g8'],
    line: { g4g8: { reply: 'h8h7', mate: ['c8h3'] } },
  },
  {
    id: 'p51',
    fen: '8/1K6/8/k7/5Q2/8/2n5/2Q5 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['c1d2'],
    line: { c1d2: { reply: 'a5b5', mate: ['d2d5'] } },
  },
  {
    id: 'p52',
    fen: '2RR4/7K/8/7k/8/R7/8/8 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['c8c5', 'd8d5'],
    line: { c8c5: { reply: 'h5h4', mate: ['d8d4'] }, d8d5: { reply: 'h5h4', mate: ['c8c4'] } },
  },
  {
    id: 'p53',
    fen: '5R2/8/8/8/6k1/8/4R3/6K1 w - - 0 1',
    tier: 3,
    moves: 2,
    first: ['e2g2'],
    line: { e2g2: { reply: 'g4h5', mate: ['f8h8'] } },
  },
  {
    id: 'p54',
    fen: '8/8/3K4/5R1N/8/1R6/7k/8 w - - 0 1',
    tier: 4,
    moves: 2,
    first: ['f5g5'],
    line: { f5g5: { reply: 'h2h1', mate: ['b3h3'] } },
  },
  {
    id: 'p55',
    fen: '8/8/K7/5R2/8/k7/5R2/8 w - - 0 1',
    tier: 4,
    moves: 2,
    first: ['a6b5', 'f5b5'],
    line: { a6b5: { reply: 'a3b3', mate: ['f5f3'] }, f5b5: { reply: 'a3a4', mate: ['f2a2'] } },
  },
  {
    id: 'p56',
    fen: '8/8/8/8/8/5K2/1N2R3/7k w - - 0 1',
    tier: 4,
    moves: 2,
    first: ['f3g3'],
    line: { f3g3: { reply: 'h1g1', mate: ['e2e1'] } },
  },
  {
    id: 'p57',
    fen: '8/8/3Q4/1R6/8/8/8/2K3k1 w - - 0 1',
    tier: 4,
    moves: 2,
    first: ['b5b2'],
    line: { b5b2: { reply: 'g1f1', mate: ['d6d1'] } },
  },
  {
    id: 'p58',
    fen: '8/2K5/k7/8/8/8/3R4/8 w - - 0 1',
    tier: 4,
    moves: 2,
    first: ['d2d5'],
    line: { d2d5: { reply: 'a6a7', mate: ['d5a5'] } },
  },
  {
    id: 'p59',
    fen: '8/8/k7/2p5/8/7K/8/2Q3Q1 w - - 0 1',
    tier: 4,
    moves: 2,
    first: ['c1b2'],
    line: { c1b2: { reply: 'a6a7', mate: ['g1a1'] } },
  },
];

/** Pick `plan.length` puzzles of the wanted difficulties, avoiding ones seen recently. */
export function choosePuzzles(
  plan: readonly number[],
  rng: () => number,
  history: number[],
  pool: readonly Puzzle[] = PUZZLES,
): Puzzle[] {
  const chosen: Puzzle[] = [];
  const recent = new Set(history);
  const usable = (p: Puzzle) => !chosen.includes(p);
  for (const tier of plan) {
    const order = [tier, tier - 1, tier + 1, tier - 2, tier + 2].filter((t) => t >= 1 && t <= 4);
    let pick: Puzzle | undefined;
    for (const pass of [0, 1]) {
      for (const t of order) {
        const c = pool.filter((p) => p.tier === t && usable(p) && (pass === 1 || !recent.has(hashStr(p.id))));
        if (c.length) {
          pick = c[Math.floor(rng() * c.length)];
          break;
        }
      }
      if (pick) break;
    }
    if (pick) chosen.push(pick);
  }
  return chosen;
}
