import "./Piece.css"

function Piece({ type, color }) {
  // Unicode chess pieces
  const pieceSymbols = {
    white: {
      king: "♔",
      queen: "♕",
      rook: "♖",
      bishop: "♗",
      knight: "♘",
      pawn: "♙",
    },
    black: {
      king: "♚",
      queen: "♛",
      rook: "♜",
      bishop: "♝",
      knight: "♞",
      pawn: "♟",
    },
  }

  // Get the Unicode symbol for the piece
  const symbol = pieceSymbols[color]?.[type] || "?"

  return <div className={`piece ${color}-piece`}>{symbol}</div>
}

export default Piece
