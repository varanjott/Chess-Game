// src/components/CapturedPieces.jsx
//
// Shows a row of captured pieces above/below the board for one side, plus
// the material score advantage. We derive captured pieces from move history
// each render — cheap and always accurate.

"use client";

import { useChess } from "../context/ChessContext";
import { createChessFromHistory, getCapturedPieces, getMaterialAdvantage } from "../utils/chessLogic";
import "./CapturedPieces.css";

const PIECE_SYMBOLS = {
  white: { queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};

// Sort captured pieces from biggest to smallest for clean visual grouping
const ORDER = { queen: 5, rook: 4, bishop: 3, knight: 2, pawn: 1 };

/**
 * @param {{ side: "white" | "black" }} props
 * The "side" prop is the color whose CAPTURES we show (i.e. side="white" =>
 * the pieces white has captured, which are black pieces).
 */
function CapturedPieces({ side }) {
  const { sanHistory, gameSetupComplete } = useChess();

  if (!gameSetupComplete) return <div className="captured-row" aria-hidden />;

  const chess = createChessFromHistory(sanHistory);
  const captured = getCapturedPieces(chess);
  const myCaptures = [...captured[side]].sort((a, b) => ORDER[b] - ORDER[a]);
  const advantage = getMaterialAdvantage(chess, side);

  // Captured pieces are shown using the OPPOSITE color's symbols
  // (because if white captures, the captured pieces are black).
  const capturedColor = side === "white" ? "black" : "white";

  return (
    <div className="captured-row" aria-label={`Pieces captured by ${side}`}>
      <div className="captured-pieces">
        {myCaptures.map((type, i) => (
          <span key={i} className={`captured-piece captured-${capturedColor}`}>
            {PIECE_SYMBOLS[capturedColor][type]}
          </span>
        ))}
      </div>
      {advantage > 0 && <span className="material-advantage">+{advantage}</span>}
    </div>
  );
}

export default CapturedPieces;
