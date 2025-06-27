// Function to initialize the chess board with all pieces in starting positions
export function initializeBoard() {
  // Create an 8x8 empty board
  const board = Array(8)
    .fill()
    .map(() => Array(8).fill(null))

  // Set up pawns
  for (let col = 0; col < 8; col++) {
    board[1][col] = { type: "pawn", color: "black" }
    board[6][col] = { type: "pawn", color: "white" }
  }

  // Set up rooks
  board[0][0] = { type: "rook", color: "black" }
  board[0][7] = { type: "rook", color: "black" }
  board[7][0] = { type: "rook", color: "white" }
  board[7][7] = { type: "rook", color: "white" }

  // Set up knights
  board[0][1] = { type: "knight", color: "black" }
  board[0][6] = { type: "knight", color: "black" }
  board[7][1] = { type: "knight", color: "white" }
  board[7][6] = { type: "knight", color: "white" }

  // Set up bishops
  board[0][2] = { type: "bishop", color: "black" }
  board[0][5] = { type: "bishop", color: "black" }
  board[7][2] = { type: "bishop", color: "white" }
  board[7][5] = { type: "bishop", color: "white" }

  // Set up queens
  board[0][3] = { type: "queen", color: "black" }
  board[7][3] = { type: "queen", color: "white" }

  // Set up kings
  board[0][4] = { type: "king", color: "black" }
  board[7][4] = { type: "king", color: "white" }

  return board
}

// Function to find a king on the board
export function findKing(board, color) {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece && piece.type === "king" && piece.color === color) {
        return [row, col]
      }
    }
  }
  return null // Should never happen in a valid chess game
}

// Function to check if a king is in check
export function isKingInCheck(board, kingPosition, kingColor) {
  if (!kingPosition) return false

  const [kingRow, kingCol] = kingPosition
  const opponentColor = kingColor === "white" ? "black" : "white"

  // Check if any opponent piece can attack the king
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece && piece.color === opponentColor) {
        // Get all valid moves for this opponent piece
        const validMoves = getValidMoves(board, row, col, piece)

        // Check if any of these moves can capture the king
        if (validMoves.some(([r, c]) => r === kingRow && c === kingCol)) {
          return true
        }
      }
    }
  }

  return false
}

// Function to check if it's checkmate
export function checkForCheckmate(board, kingColor) {
  // For each piece of the king's color
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col]
      if (piece && piece.color === kingColor) {
        // Get all valid moves considering check
        const validMoves = getValidMovesConsideringCheck(board, row, col, piece, kingColor)

        // If there's at least one valid move, it's not checkmate
        if (validMoves.length > 0) {
          return false
        }
      }
    }
  }

  // If no valid moves were found for any piece, it's checkmate
  return true
}

// Function to get valid moves considering check
export function getValidMovesConsideringCheck(board, row, col, piece, currentPlayer) {
  const potentialMoves = getValidMoves(board, row, col, piece)
  const validMoves = []

  // For each potential move, check if it would leave the king in check
  for (const [toRow, toCol] of potentialMoves) {
    // Create a temporary board with the move applied
    const tempBoard = board.map((r) => [...r])
    tempBoard[toRow][toCol] = piece
    tempBoard[row][col] = null

    // Find the king's position after the move
    const kingPosition =
      piece.type === "king"
        ? [toRow, toCol] // If moving the king, use the new position
        : findKing(tempBoard, currentPlayer)

    // If this move doesn't leave the king in check, it's valid
    if (!isKingInCheck(tempBoard, kingPosition, currentPlayer)) {
      validMoves.push([toRow, toCol])
    }
  }

  return validMoves
}

// Function to get valid moves for a piece
export function getValidMoves(board, row, col, piece) {
  const validMoves = []

  switch (piece.type) {
    case "pawn":
      // Pawns move differently based on their color
      if (piece.color === "white") {
        // White pawns move up (decreasing row)

        // Move forward one square
        if (row > 0 && !board[row - 1][col]) {
          validMoves.push([row - 1, col])

          // Move forward two squares from starting position
          if (row === 6 && !board[row - 2][col]) {
            validMoves.push([row - 2, col])
          }
        }

        // Capture diagonally
        if (row > 0 && col > 0 && board[row - 1][col - 1] && board[row - 1][col - 1].color !== piece.color) {
          validMoves.push([row - 1, col - 1])
        }
        if (row > 0 && col < 7 && board[row - 1][col + 1] && board[row - 1][col + 1].color !== piece.color) {
          validMoves.push([row - 1, col + 1])
        }
      } else {
        // Black pawns move down (increasing row)

        // Move forward one square
        if (row < 7 && !board[row + 1][col]) {
          validMoves.push([row + 1, col])

          // Move forward two squares from starting position
          if (row === 1 && !board[row + 2][col]) {
            validMoves.push([row + 2, col])
          }
        }

        // Capture diagonally
        if (row < 7 && col > 0 && board[row + 1][col - 1] && board[row + 1][col - 1].color !== piece.color) {
          validMoves.push([row + 1, col - 1])
        }
        if (row < 7 && col < 7 && board[row + 1][col + 1] && board[row + 1][col + 1].color !== piece.color) {
          validMoves.push([row + 1, col + 1])
        }
      }
      break

    case "rook":
      // Rooks move horizontally and vertically any number of squares

      // Check moves to the right
      for (let c = col + 1; c < 8; c++) {
        if (!board[row][c]) {
          validMoves.push([row, c])
        } else {
          if (board[row][c].color !== piece.color) {
            validMoves.push([row, c]) // Can capture opponent's piece
          }
          break // Can't move past a piece
        }
      }

      // Check moves to the left
      for (let c = col - 1; c >= 0; c--) {
        if (!board[row][c]) {
          validMoves.push([row, c])
        } else {
          if (board[row][c].color !== piece.color) {
            validMoves.push([row, c])
          }
          break
        }
      }

      // Check moves upward
      for (let r = row - 1; r >= 0; r--) {
        if (!board[r][col]) {
          validMoves.push([r, col])
        } else {
          if (board[r][col].color !== piece.color) {
            validMoves.push([r, col])
          }
          break
        }
      }

      // Check moves downward
      for (let r = row + 1; r < 8; r++) {
        if (!board[r][col]) {
          validMoves.push([r, col])
        } else {
          if (board[r][col].color !== piece.color) {
            validMoves.push([r, col])
          }
          break
        }
      }
      break

    case "knight":
      // Knights move in an L-shape: 2 squares in one direction and 1 square perpendicular
      const knightMoves = [
        [row - 2, col - 1],
        [row - 2, col + 1], // Up 2, left/right 1
        [row - 1, col - 2],
        [row - 1, col + 2], // Up 1, left/right 2
        [row + 1, col - 2],
        [row + 1, col + 2], // Down 1, left/right 2
        [row + 2, col - 1],
        [row + 2, col + 1], // Down 2, left/right 1
      ]

      // Filter out moves that are off the board or onto friendly pieces
      knightMoves.forEach(([r, c]) => {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          if (!board[r][c] || board[r][c].color !== piece.color) {
            validMoves.push([r, c])
          }
        }
      })
      break

    case "bishop":
      // Bishops move diagonally any number of squares

      // Check moves to the upper-right
      for (let r = row - 1, c = col + 1; r >= 0 && c < 8; r--, c++) {
        if (!board[r][c]) {
          validMoves.push([r, c])
        } else {
          if (board[r][c].color !== piece.color) {
            validMoves.push([r, c])
          }
          break
        }
      }

      // Check moves to the upper-left
      for (let r = row - 1, c = col - 1; r >= 0 && c >= 0; r--, c--) {
        if (!board[r][c]) {
          validMoves.push([r, c])
        } else {
          if (board[r][c].color !== piece.color) {
            validMoves.push([r, c])
          }
          break
        }
      }

      // Check moves to the lower-right
      for (let r = row + 1, c = col + 1; r < 8 && c < 8; r++, c++) {
        if (!board[r][c]) {
          validMoves.push([r, c])
        } else {
          if (board[r][c].color !== piece.color) {
            validMoves.push([r, c])
          }
          break
        }
      }

      // Check moves to the lower-left
      for (let r = row + 1, c = col - 1; r < 8 && c >= 0; r++, c--) {
        if (!board[r][c]) {
          validMoves.push([r, c])
        } else {
          if (board[r][c].color !== piece.color) {
            validMoves.push([r, c])
          }
          break
        }
      }
      break

    case "queen":
      // Queens can move like rooks and bishops combined
      // Reuse the logic for rooks (horizontal and vertical)
      const rookMoves = getValidMoves(board, row, col, { ...piece, type: "rook" })
      // Reuse the logic for bishops (diagonal)
      const bishopMoves = getValidMoves(board, row, col, { ...piece, type: "bishop" })
      // Combine the moves
      validMoves.push(...rookMoves, ...bishopMoves)
      break

    case "king":
      // Kings move one square in any direction
      const kingMoves = [
        [row - 1, col - 1],
        [row - 1, col],
        [row - 1, col + 1], // Top row
        [row, col - 1],
        [row, col + 1], // Middle row
        [row + 1, col - 1],
        [row + 1, col],
        [row + 1, col + 1], // Bottom row
      ]

      // Filter out moves that are off the board or onto friendly pieces
      kingMoves.forEach(([r, c]) => {
        if (r >= 0 && r < 8 && c >= 0 && c < 8) {
          if (!board[r][c] || board[r][c].color !== piece.color) {
            validMoves.push([r, c])
          }
        }
      })
      break
  }

  return validMoves
}

// Convert board coordinates to algebraic notation
export function coordToAlgebraic(row, col) {
  const file = String.fromCharCode(97 + col) // 'a' to 'h'
  const rank = 8 - row // 1 to 8
  return `${file}${rank}`
}

// Get the piece symbol for algebraic notation
function getPieceSymbol(pieceType) {
  switch (pieceType) {
    case "king":
      return "K"
    case "queen":
      return "Q"
    case "rook":
      return "R"
    case "bishop":
      return "B"
    case "knight":
      return "N"
    case "pawn":
      return ""
    default:
      return ""
  }
}

// Generate standard algebraic notation for a move
export function getChessNotation(board, fromRow, fromCol, toRow, toCol, piece, capturedPiece) {
  // Get basic coordinates
  const from = coordToAlgebraic(fromRow, fromCol)
  const to = coordToAlgebraic(toRow, toCol)

  // Get piece symbol (empty for pawns)
  const pieceSymbol = getPieceSymbol(piece.type)

  // Check if it's a capture
  const isCapture = capturedPiece !== null

  // Handle pawn moves
  if (piece.type === "pawn") {
    // Pawn capture
    if (isCapture) {
      return `${from[0]}x${to}`
    }
    // Regular pawn move
    return to
  }

  // Handle other pieces
  let notation = pieceSymbol

  // Add disambiguation if needed (not implemented for simplicity)

  // Add capture symbol if needed
  if (isCapture) {
    notation += "x"
  }

  // Add destination
  notation += to

  // Check for check or checkmate (will be added later in the move process)

  return notation
}

// Format time from seconds to MM:SS
export function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`
}
