// src/components/GameControls.jsx
//
// Move history panel + action buttons. Adds:
//   - Proper status messages for draws (with reason) and timeouts
//   - PGN export button (active when there are moves)
//   - Undo/redo work in AI mode (undoes the player's move + AI reply)

"use client";

import { useEffect, useRef } from "react";
import { useChess } from "../context/ChessContext";
import { createChessFromHistory } from "../utils/chessLogic";
import { downloadPgn } from "../utils/pgnExport";
import "./GameControls.css";

function GameControls() {
  const {
    currentPlayer,
    moveHistory,
    sanHistory,
    resetGame,
    undoMove,
    redoMove,
    gameStatus,
    gameOver,
    winner,
    drawReason,
    toggleResignConfirm,
    resignGame,
    cancelResign,
    resignationConfirm,
    redoStack,
    isAiThinking,
    gameMode,
  } = useChess();

  const movesListRef = useRef(null);

  useEffect(() => {
    if (movesListRef.current) {
      movesListRef.current.scrollTop = movesListRef.current.scrollHeight;
    }
  }, [moveHistory]);

  // ---------- Status message ----------
  const getStatusMessage = () => {
    if (gameOver) {
      const winnerLabel = winner === "white" ? "White" : "Black";
      if (gameStatus === "resigned") return `Game Over! ${winnerLabel} wins by resignation.`;
      if (gameStatus === "timeout") return `Game Over! ${winnerLabel} wins on time.`;
      if (gameStatus === "draw") {
        const reason = drawReason ? ` by ${drawReason}` : "";
        return `Game Over! Draw${reason}.`;
      }
      if (gameStatus === "checkmate") return `Game Over! ${winnerLabel} wins by checkmate.`;
      return "Game Over!";
    }
    if (gameStatus === "check") {
      return `${currentPlayer === "white" ? "White" : "Black"} is in check!`;
    }
    return null;
  };

  const statusMessage = getStatusMessage();

  // ---------- PGN export ----------
  const handleExportPgn = () => {
    if (sanHistory.length === 0) return;
    const chess = createChessFromHistory(sanHistory);
    let result = "*";
    if (gameOver) {
      if (gameStatus === "draw") result = "1/2-1/2";
      else if (winner === "white") result = "1-0";
      else if (winner === "black") result = "0-1";
    }
    const blackName = gameMode === "playerVsAi" ? "Stockfish" : "Black";
    downloadPgn(chess, {
      whiteName: "White",
      blackName,
      result,
      event: gameMode === "playerVsAi" ? "Vs Computer" : "Casual Game",
    });
  };

  return (
    <div className="controls-card">
      <div className="current-turn">
        <h3>Current Turn</h3>
        <div className={`turn-indicator ${currentPlayer}`}>
          {isAiThinking
            ? "Computer is thinking..."
            : currentPlayer === "white"
            ? "White"
            : "Black"}
        </div>
      </div>

      <div className="move-history">
        <div className="history-header">
          <h3>Move History</h3>
          <div className="divider"></div>
        </div>
        <div className="history-content" ref={movesListRef}>
          {moveHistory.length === 0 ? (
            <div className="no-moves">No moves yet</div>
          ) : (
            <table className="moves-table">
              <tbody>
                {Array.from({ length: Math.ceil(moveHistory.length / 2) }, (_, pairIndex) => (
                  <tr
                    key={pairIndex}
                    className={pairIndex % 2 === 0 ? "even-row" : "odd-row"}
                  >
                    <td className="move-number">{pairIndex + 1}.</td>
                    <td className="move-notation">
                      {moveHistory[pairIndex * 2]?.notation || ""}
                    </td>
                    <td className="move-notation">
                      {moveHistory[pairIndex * 2 + 1]?.notation || ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {statusMessage && (
        <div className="status-message">
          <p>{statusMessage}</p>
        </div>
      )}

      <div className="action-buttons">
        <div className="move-buttons">
          <button
            className="undo-button"
            onClick={undoMove}
            disabled={
              moveHistory.length === 0 ||
              isAiThinking ||
              (gameMode === "playerVsAi" && moveHistory.length < 2)
            }
          >
            <span className="button-icon">↶</span> Undo
          </button>
          <button
            className="redo-button"
            onClick={redoMove}
            disabled={redoStack.length === 0 || isAiThinking}
          >
            <span className="button-icon">↷</span> Redo
          </button>
        </div>

        <button
          className="export-button"
          onClick={handleExportPgn}
          disabled={sanHistory.length === 0}
        >
          <span className="button-icon">⬇</span> Export PGN
        </button>

        <div className="game-buttons">
          <button className="reset-button" onClick={resetGame}>
            <span className="button-icon">🔄</span> New Game
          </button>

          {!gameOver &&
            (!resignationConfirm ? (
              <button className="resign-button" onClick={toggleResignConfirm}>
                <span className="button-icon">🏳️</span> Resign
              </button>
            ) : (
              <div className="resign-confirm">
                <button className="confirm-resign" onClick={resignGame}>
                  Confirm Resign
                </button>
                <button className="cancel-resign" onClick={cancelResign}>
                  Cancel
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

export default GameControls;
