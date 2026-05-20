// src/utils/chessLogic.js
// Thin adapter layer over chess.js to keep our React components decoupled
// from the library and to translate between [row, col] grid coords used by
// our UI and the algebraic squares (e.g. "e4") used by chess.js.

import { Chess } from "chess.js";

// ---------- Coordinate helpers ----------

/**
 * Convert [row, col] (0-indexed, row 0 = rank 8) to algebraic like "e4".
 */
export function coordToSquare(row, col) {
  const file = String.fromCharCode(97 + col); // 'a'..'h'
  const rank = 8 - row; // 8..1
  return `${file}${rank}`;
}

/**
 * Convert algebraic like "e4" to [row, col].
 */
export function squareToCoord(square) {
  const col = square.charCodeAt(0) - 97;
  const row = 8 - parseInt(square[1], 10);
  return [row, col];
}

// ---------- Game state derivation ----------

/**
 * Build an 8x8 grid of pieces in our app's shape:
 *   { type: "pawn"|"knight"|..., color: "white"|"black" } | null
 * from a chess.js board() output.
 */
export function chessJsBoardToGrid(chessBoard) {
  const typeMap = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" };
  return chessBoard.map((row) =>
    row.map((cell) => {
      if (!cell) return null;
      return {
        type: typeMap[cell.type],
        color: cell.color === "w" ? "white" : "black",
      };
    })
  );
}

/**
 * Get all legal destination squares (as [row, col] pairs) for the piece on a given square.
 * Returns [] if the piece isn't the side to move or there's no piece there.
 */
export function getValidMovesFor(chessInstance, row, col) {
  const square = coordToSquare(row, col);
  const moves = chessInstance.moves({ square, verbose: true });
  return moves.map((m) => squareToCoord(m.to));
}

/**
 * Check if a given move from -> to would be a promotion.
 * Returns true only if the moving piece is a pawn AND the destination is on
 * the last rank for its color.
 */
export function isPromotionMove(chessInstance, fromRow, fromCol, toRow, toCol) {
  const fromSq = coordToSquare(fromRow, fromCol);
  const toSq = coordToSquare(toRow, toCol);
  const moves = chessInstance.moves({ square: fromSq, verbose: true });
  return moves.some((m) => m.to === toSq && m.promotion);
}

/**
 * Find the king of a given color. Returns [row, col] or null.
 */
export function findKing(chessInstance, color) {
  const board = chessInstance.board();
  const target = color === "white" ? "w" : "b";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const cell = board[r][c];
      if (cell && cell.type === "k" && cell.color === target) {
        return [r, c];
      }
    }
  }
  return null;
}

/**
 * Compute material balance from the side of `viewer`.
 * Returns positive number when `viewer` is up material, negative when down.
 * Standard piece values; kings excluded.
 */
export function getMaterialAdvantage(chessInstance, viewer = "white") {
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  let whiteScore = 0;
  let blackScore = 0;
  const board = chessInstance.board();
  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.color === "w") whiteScore += values[cell.type];
      else blackScore += values[cell.type];
    }
  }
  const diff = whiteScore - blackScore;
  return viewer === "white" ? diff : -diff;
}

/**
 * Compute captured pieces by reconstructing from move history.
 * Returns { white: [...], black: [...] } where each list contains the piece
 * types that the player of that color has captured FROM the opponent.
 *
 * E.g. white captured a black pawn → result.white = ['pawn']
 */
export function getCapturedPieces(chessInstance) {
  const typeMap = { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen" };
  const captured = { white: [], black: [] };
  const history = chessInstance.history({ verbose: true });
  for (const move of history) {
    if (!move.captured) continue;
    const capturedBy = move.color === "w" ? "white" : "black";
    captured[capturedBy].push(typeMap[move.captured]);
  }
  return captured;
}

// ---------- Time formatting ----------

export function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remaining = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
}

// ---------- Factory ----------

/**
 * Create a fresh chess.js instance. Wrapped so the context doesn't import
 * chess.js directly.
 */
export function createChess(fen) {
  return fen ? new Chess(fen) : new Chess();
}

/**
 * Create a chess.js instance from PGN history. Used for reconstructing state
 * after undo/redo to keep things deterministic.
 */
export function createChessFromHistory(sanHistory) {
  const chess = new Chess();
  for (const san of sanHistory) {
    const result = chess.move(san);
    if (!result) {
      // History is corrupt; bail out rather than continue with a wrong state
      throw new Error(`Failed to replay move: ${san}`);
    }
  }
  return chess;
}
