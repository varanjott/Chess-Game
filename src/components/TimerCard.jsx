// src/components/TimerCard.jsx
//
// Setup screen + active timer. Setup now lets the user pick a time control
// preset (Bullet/Blitz/Rapid/Classical) in addition to game mode and
// difficulty. Active state shows the increment in the timer label so
// players know what they're playing.

"use client";

import { useChess } from "../context/ChessContext";
import { formatTime } from "../utils/chessLogic";
import { TIME_CONTROLS, findTimeControl } from "../utils/timeControls";
import { ACTION_TYPES } from "../context/ChessContext";
import "./TimerCard.css";

function TimerCard() {
  const {
    timers,
    timeControl,
    toggleTimer,
    gameOver,
    currentPlayer,
    gameMode,
    gameSetupComplete,
    difficulty,
    dispatch,
  } = useChess();

  const handleGameModeChange = (mode) =>
    dispatch({ type: ACTION_TYPES.SET_GAME_MODE, payload: mode });

  const handleDifficultyChange = (level) =>
    dispatch({ type: ACTION_TYPES.SET_DIFFICULTY, payload: level });

  const handleTimeControlChange = (id) => {
    const tc = findTimeControl(id);
    dispatch({ type: ACTION_TYPES.SET_TIME_CONTROL, payload: tc });
  };

  const handleStartGame = () => dispatch({ type: ACTION_TYPES.START_GAME });

  // ---------- Setup screen ----------
  if (!gameSetupComplete) {
    return (
      <div className="timer-card setup-card">
        <h3>Game Setup</h3>

        <div className="setup-group">
          <label>Game Mode</label>
          <div className="button-group">
            <button
              className={gameMode === "playerVsPlayer" ? "active" : ""}
              onClick={() => handleGameModeChange("playerVsPlayer")}
            >
              Vs Friend
            </button>
            <button
              className={gameMode === "playerVsAi" ? "active" : ""}
              onClick={() => handleGameModeChange("playerVsAi")}
            >
              Vs Computer
            </button>
          </div>
        </div>

        {gameMode === "playerVsAi" && (
          <div className="setup-group">
            <label>Difficulty</label>
            <select
              onChange={(e) => handleDifficultyChange(parseInt(e.target.value, 10))}
              value={difficulty}
            >
              <option value={5}>Easy</option>
              <option value={10}>Medium</option>
              <option value={15}>Hard</option>
              <option value={18}>Expert</option>
            </select>
          </div>
        )}

        <div className="setup-group">
          <label>Time Control</label>
          <div className="time-control-grid">
            {TIME_CONTROLS.map((tc) => (
              <button
                key={tc.id}
                className={`time-control-option ${
                  timeControl.id === tc.id ? "active" : ""
                }`}
                onClick={() => handleTimeControlChange(tc.id)}
              >
                <span className="tc-label">{tc.label}</span>
                <span className="tc-detail">{tc.description}</span>
              </button>
            ))}
          </div>
        </div>

        <button className="timer-button start-button" onClick={handleStartGame}>
          Start Game
        </button>
      </div>
    );
  }

  // ---------- Active game ----------
  return (
    <div className="timer-card">
      <div className="time-control-badge">
        {timeControl.label} · {timeControl.description}
      </div>

      <div
        className={`timer-panel ${currentPlayer === "white" ? "active-player" : ""}`}
      >
        <div className="timer-label">
          White: <span className="timer-value">{formatTime(timers.white)}</span>
        </div>
      </div>

      <div
        className={`timer-panel ${currentPlayer === "black" ? "active-player" : ""}`}
      >
        <div className="timer-label">
          Black: <span className="timer-value">{formatTime(timers.black)}</span>
        </div>
      </div>

      <button className="timer-button" onClick={toggleTimer} disabled={gameOver}>
        {timers.active ? "Pause" : "Resume"}
      </button>
    </div>
  );
}

export default TimerCard;
