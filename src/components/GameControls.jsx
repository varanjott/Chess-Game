"use client"

import { useEffect, useRef } from "react"
import { useChess } from "../context/ChessContext"
import "./GameControls.css"

function GameControls() {
  const {
    currentPlayer,
    moveHistory,
    resetGame,
    undoMove,
    redoMove,
    gameStatus,
    gameOver,
    winner,
    toggleResignConfirm,
    resignGame,
    cancelResign,
    resignationConfirm,
    redoStack,
  } = useChess()

  // Add this ref for the moves list container
  const movesListRef = useRef(null)

  // Add this effect to auto-scroll to the bottom when moves are added
  useEffect(() => {
    if (movesListRef.current) {
      movesListRef.current.scrollTop = movesListRef.current.scrollHeight
    }
  }, [moveHistory])

  // Get status message
  const getStatusMessage = () => {
    if (gameOver) {
      if (gameStatus === "resigned") {
        return `Game Over! ${winner === "white" ? "White" : "Black"} wins by resignation!`
      } else if (gameStatus === "timeout") {
        return `Game Over! ${winner === "white" ? "White" : "Black"} wins on time!`
      } else if (winner) {
        return `Game Over! ${winner === "white" ? "White" : "Black"} wins by checkmate!`
      }
      return `Game Over! Draw by stalemate.`
    } else if (gameStatus === "check") {
      return `${currentPlayer === "white" ? "White" : "Black"} is in check!`
    }
    return null
  }

  const statusMessage = getStatusMessage()

  return (
    <div className="controls-card">
      <div className="current-turn">
        <h3>Current Turn</h3>
        <div className={`turn-indicator ${currentPlayer}`}>{currentPlayer === "white" ? "White" : "Black"}</div>
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
                {Array.from({ length: Math.ceil(moveHistory.length / 2) }).map((_, index) => (
                  <tr key={index} className={index % 2 === 0 ? "even-row" : "odd-row"}>
                    <td className="move-number">{index + 1}.</td>
                    <td className="move-white">
                      {moveHistory[index * 2] ? (
                        <span className="move-notation">
                          {moveHistory[index * 2].notation}
                          {moveHistory[index * 2] === moveHistory[moveHistory.length - 1] &&
                            gameStatus === "check" &&
                            "+"}
                          {moveHistory[index * 2] === moveHistory[moveHistory.length - 1] &&
                            gameStatus === "checkmate" &&
                            "#"}
                        </span>
                      ) : null}
                    </td>
                    <td className="move-black">
                      {moveHistory[index * 2 + 1] ? (
                        <span className="move-notation">
                          {moveHistory[index * 2 + 1].notation}
                          {moveHistory[index * 2 + 1] === moveHistory[moveHistory.length - 1] &&
                            gameStatus === "check" &&
                            "+"}
                          {moveHistory[index * 2 + 1] === moveHistory[moveHistory.length - 1] &&
                            gameStatus === "checkmate" &&
                            "#"}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {statusMessage && <div className={`status-message ${gameOver ? "game-over" : "check"}`}>{statusMessage}</div>}

      <div className="action-buttons">
        <div className="move-buttons">
          <button className="undo-button" onClick={undoMove} disabled={moveHistory.length === 0 || gameOver}>
            <span className="button-icon">↶</span> Undo Move
          </button>
          <button className="redo-button" onClick={redoMove} disabled={redoStack.length === 0 || gameOver}>
            <span className="button-icon">↷</span> Redo Move
          </button>
        </div>

        <button className="reset-button" onClick={resetGame}>
          {gameOver ? "New Game" : "Reset Game"}
        </button>

        {resignationConfirm ? (
          <div className="resign-confirm">
            <p>Are you sure?</p>
            <div className="confirm-buttons">
              <button className="confirm-yes" onClick={resignGame}>
                Yes
              </button>
              <button className="confirm-no" onClick={cancelResign}>
                No
              </button>
            </div>
          </div>
        ) : (
          <button className="resign-button" onClick={toggleResignConfirm} disabled={gameOver}>
            Resign
          </button>
        )}
      </div>
    </div>
  )
}

export default GameControls
