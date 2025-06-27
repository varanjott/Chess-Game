"use client"
import Piece from "./Piece"
import "./Square.css"

function Square({ isLightSquare, piece, selected, validMove, inCheck, lastMove, onClick }) {
  // Determine the CSS classes for the square
  const squareClass = `
    square 
    ${isLightSquare ? "light-square" : "dark-square"}
    ${selected ? "selected" : ""}
    ${validMove && piece ? "capture-move" : ""}
    ${validMove && !piece ? "valid-move" : ""}
    ${inCheck ? "in-check" : ""}
    ${lastMove ? "last-move" : ""}
  `
    .trim()
    .replace(/\s+/g, " ")

  return (
    <div className={squareClass} onClick={onClick}>
      {piece && <Piece type={piece.type} color={piece.color} />}
      {validMove && !piece && <div className="move-indicator" />}
    </div>
  )
}

export default Square
