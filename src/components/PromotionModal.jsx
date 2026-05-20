// src/components/PromotionModal.jsx
//
// Modal that pops up when a pawn reaches the last rank, letting the player
// choose Queen / Rook / Bishop / Knight. Renders nothing when no promotion
// is pending.

"use client";

import { useChess } from "../context/ChessContext";
import "./PromotionModal.css";

const PIECE_SYMBOLS = {
  white: { queen: "♕", rook: "♖", bishop: "♗", knight: "♘" },
  black: { queen: "♛", rook: "♜", bishop: "♝", knight: "♞" },
};

const OPTIONS = [
  { code: "q", name: "queen", label: "Queen" },
  { code: "r", name: "rook", label: "Rook" },
  { code: "b", name: "bishop", label: "Bishop" },
  { code: "n", name: "knight", label: "Knight" },
];

function PromotionModal() {
  const { pendingPromotion, choosePromotion, cancelPromotion, currentPlayer } = useChess();

  if (!pendingPromotion) return null;

  // The pawn that's about to promote belongs to whoever's turn it currently
  // is — we haven't applied the move yet.
  const color = currentPlayer;

  return (
    <div className="promotion-overlay" role="dialog" aria-modal="true" aria-label="Choose promotion piece">
      <div className="promotion-modal">
        <h3 className="promotion-title">Promote pawn to:</h3>
        <div className="promotion-options">
          {OPTIONS.map((opt) => (
            <button
              key={opt.code}
              className={`promotion-button promotion-${color}`}
              onClick={() => choosePromotion(opt.code)}
              aria-label={`Promote to ${opt.label}`}
            >
              <span className="promotion-symbol">{PIECE_SYMBOLS[color][opt.name]}</span>
              <span className="promotion-label">{opt.label}</span>
            </button>
          ))}
        </div>
        <button className="promotion-cancel" onClick={cancelPromotion}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default PromotionModal;
