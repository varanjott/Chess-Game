"use client"
import { useChess } from "../context/ChessContext"
import Square from "./Square"
import "./ChessBoard.css"

function ChessBoard() {
  const { board, selectedPiece, validMoves, handleSquareClick, gameStatus, currentPlayer, lastMoveHighlight } =
    useChess()

  // Function to check if a square is a valid move
  const isValidMove = (row, col) => {
    return validMoves.some(([r, c]) => r === row && c === col)
  }

  // Function to check if a square is selected
  const isSelected = (row, col) => {
    return selectedPiece && selectedPiece[0] === row && selectedPiece[1] === col
  }

  // Function to check if a square contains a king in check
  const isKingInCheck = (row, col) => {
    const piece = board[row][col]
    // Only highlight the king that's actually in check (the one whose turn it is now)
    return (
      (gameStatus === "check" || gameStatus === "checkmate") &&
      piece &&
      piece.type === "king" &&
      piece.color === currentPlayer
    )
  }

  // Function to check if a square is part of the last move
  const isLastMove = (row, col) => {
    if (!lastMoveHighlight) return false
    const [fromRow, fromCol, toRow, toCol] = lastMoveHighlight
    return (row === fromRow && col === fromCol) || (row === toRow && col === toCol)
  }

  // Render the board
  return (
    <div className="chess-board">
      {/* Rank labels (8-1) */}
      <div className="rank-labels">
        {[8, 7, 6, 5, 4, 3, 2, 1].map((rank) => (
          <div key={rank} className="rank-label">
            {rank}
          </div>
        ))}
      </div>

      <div className="board-with-files">
        <div className="board-inner">
          {board.map((row, rowIndex) => (
            <div key={rowIndex} className="board-row">
              {row.map((piece, colIndex) => {
                // Determine if the square is light or dark
                const isLightSquare = (rowIndex + colIndex) % 2 === 0

                // Determine if the square is selected or a valid move
                const selected = isSelected(rowIndex, colIndex)
                const validMove = isValidMove(rowIndex, colIndex)
                const inCheck = isKingInCheck(rowIndex, colIndex)
                const lastMove = isLastMove(rowIndex, colIndex)

                return (
                  <Square
                    key={`${rowIndex}-${colIndex}`}
                    isLightSquare={isLightSquare}
                    piece={piece}
                    selected={selected}
                    validMove={validMove}
                    inCheck={inCheck}
                    lastMove={lastMove}
                    onClick={() => handleSquareClick(rowIndex, colIndex)}
                  />
                )
              })}
            </div>
          ))}
        </div>

        {/* File labels (a-h) */}
        <div className="file-labels">
          {["a", "b", "c", "d", "e", "f", "g", "h"].map((file) => (
            <div key={file} className="file-label">
              {file}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ChessBoard
