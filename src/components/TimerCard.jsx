"use client"
import { useChess } from "../context/ChessContext"
import { formatTime } from "../utils/chessLogic"
import "./TimerCard.css"

function TimerCard() {
  const { timers, toggleTimer, gameOver, currentPlayer } = useChess()

  return (
    <div className="timer-card">
      <div className={`timer-panel ${currentPlayer === "white" ? "active-player" : ""}`}>
        <div className="timer-label">
          White: <span className="timer-value">{formatTime(timers.white)}</span>
        </div>
      </div>

      <div className={`timer-panel ${currentPlayer === "black" ? "active-player" : ""}`}>
        <div className="timer-label">
          Black: <span className="timer-value">{formatTime(timers.black)}</span>
        </div>
      </div>

      <button className="timer-button" onClick={toggleTimer} disabled={gameOver}>
        {timers.active ? "Pause" : "Start"}
      </button>
    </div>
  )
}

export default TimerCard
