"use client"

import { createContext, useContext, useReducer, useEffect } from "react"
import {
  initializeBoard,
  findKing,
  isKingInCheck,
  checkForCheckmate,
  getValidMovesConsideringCheck,
  getChessNotation,
} from "../utils/chessLogic"

// Create the context
const ChessContext = createContext(null)

// Initial state for our chess game
const initialState = {
  board: initializeBoard(),
  selectedPiece: null,
  validMoves: [],
  currentPlayer: "white",
  moveHistory: [],
  gameStatus: "active",
  gameOver: false,
  winner: null,
  undoStack: [],
  redoStack: [],
  lastMoveHighlight: null,
  timers: {
    white: 10 * 60,
    black: 10 * 60,
    active: false,
  },
  resignationConfirm: false,
}

// Action types
const ACTION_TYPES = {
  SELECT_PIECE: "SELECT_PIECE",
  MOVE_PIECE: "MOVE_PIECE",
  RESET_GAME: "RESET_GAME",
  UNDO_MOVE: "UNDO_MOVE",
  REDO_MOVE: "REDO_MOVE",
  TICK_TIMER: "TICK_TIMER",
  TOGGLE_TIMER: "TOGGLE_TIMER",
  CLEAR_SELECTION: "CLEAR_SELECTION",
  RESIGN_GAME: "RESIGN_GAME",
  TOGGLE_RESIGN_CONFIRM: "TOGGLE_RESIGN_CONFIRM",
  CANCEL_RESIGN: "CANCEL_RESIGN",
}

// Safe audio play function
function playSound(soundPath) {
  try {
    const audio = new Audio(soundPath)
    audio.volume = 0.5
    audio.play().catch((e) => {
      // Silently fail if audio can't play (user hasn't interacted yet)
      console.debug("Audio play failed:", e.message)
    })
  } catch (error) {
    console.debug("Audio initialization failed:", error.message)
  }
}

// Reducer function to handle all game state changes
function chessReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SELECT_PIECE: {
      const { row, col } = action.payload

      // Can't select pieces if game is over
      if (state.gameOver) {
        return state
      }

      // Check if row and col are valid board coordinates
      if (row < 0 || row >= 8 || col < 0 || col >= 8) {
        return { ...state, selectedPiece: null, validMoves: [] }
      }

      const piece = state.board[row][col]

      // Can't select an empty square
      if (!piece) {
        return { ...state, selectedPiece: null, validMoves: [] }
      }

      // Can only select your own pieces during your turn
      if (piece.color !== state.currentPlayer) {
        return { ...state, selectedPiece: null, validMoves: [] }
      }

      // Calculate valid moves for the selected piece
      const validMoves = getValidMovesConsideringCheck(state.board, row, col, piece, state.currentPlayer)

      return {
        ...state,
        selectedPiece: [row, col],
        validMoves,
      }
    }

    case ACTION_TYPES.MOVE_PIECE: {
      // Save current state for undo
      const currentState = {
        ...state,
        undoStack: [...state.undoStack],
        redoStack: [],
      }

      const { fromRow, fromCol, toRow, toCol } = action.payload

      // Create a deep copy of the board
      const newBoard = state.board.map((row) => [...row])

      // Get the piece being moved
      const piece = newBoard[fromRow][fromCol]

      // Store the captured piece (if any) for move history
      const capturedPiece = newBoard[toRow][toCol]

      // Move the piece
      newBoard[toRow][toCol] = piece
      newBoard[fromRow][fromCol] = null

      // Handle pawn promotion (if a pawn reaches the opposite end)
      if (piece.type === "pawn") {
        if ((piece.color === "white" && toRow === 0) || (piece.color === "black" && toRow === 7)) {
          // Promote to queen by default
          newBoard[toRow][toCol] = { type: "queen", color: piece.color }
        }
      }

      // Get chess notation for this move
      const notation = getChessNotation(state.board, fromRow, fromCol, toRow, toCol, piece, capturedPiece)

      // Record the move in history
      const newMoveHistory = [
        ...state.moveHistory,
        {
          from: [fromRow, fromCol],
          to: [toRow, toCol],
          piece: { ...piece },
          captured: capturedPiece ? { ...capturedPiece } : null,
          notation: notation,
        },
      ]

      // Switch to the other player's turn
      const nextPlayer = state.currentPlayer === "white" ? "black" : "white"

      // Check if the next player's king is in check or checkmate
      const kingPosition = findKing(newBoard, nextPlayer)

      // Check if the king is in check
      const isInCheck = isKingInCheck(newBoard, kingPosition, nextPlayer)

      // Check if it's checkmate (king in check and no valid moves)
      let isCheckmated = false
      let gameOver = false
      let winner = null

      if (isInCheck) {
        isCheckmated = checkForCheckmate(newBoard, nextPlayer)
        if (isCheckmated) {
          gameOver = true
          winner = state.currentPlayer
        }
      }

      // Play move sound
      playSound(capturedPiece ? "/sounds/capture.mp3" : "/sounds/move.mp3")

      // Play check/checkmate sound
      if (isInCheck) {
        setTimeout(() => {
          playSound(isCheckmated ? "/sounds/checkmate.mp3" : "/sounds/check.mp3")
        }, 300)
      }

      // Add current state to undo stack
      const newUndoStack = [...state.undoStack, currentState]

      return {
        ...state,
        board: newBoard,
        selectedPiece: null,
        validMoves: [],
        currentPlayer: nextPlayer,
        moveHistory: newMoveHistory,
        gameStatus: isCheckmated ? "checkmate" : isInCheck ? "check" : "active",
        gameOver,
        winner,
        undoStack: newUndoStack,
        redoStack: [],
        lastMoveHighlight: [fromRow, fromCol, toRow, toCol],
      }
    }

    case ACTION_TYPES.UNDO_MOVE: {
      // If there's nothing to undo, return current state
      if (state.undoStack.length === 0) {
        return state
      }

      // Get the last state from the undo stack
      const lastState = state.undoStack[state.undoStack.length - 1]

      // Remove the last state from the undo stack
      const newUndoStack = state.undoStack.slice(0, -1)

      // Add current state to redo stack
      const newRedoStack = [...state.redoStack, state]

      // Return to the previous state
      return {
        ...lastState,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      }
    }

    case ACTION_TYPES.REDO_MOVE: {
      // If there's nothing to redo, return current state
      if (state.redoStack.length === 0) {
        return state
      }

      // Get the last state from the redo stack
      const lastState = state.redoStack[state.redoStack.length - 1]

      // Remove the last state from the redo stack
      const newRedoStack = state.redoStack.slice(0, -1)

      // Add current state to undo stack
      const newUndoStack = [...state.undoStack, state]

      // Return to the next state
      return {
        ...lastState,
        undoStack: newUndoStack,
        redoStack: newRedoStack,
      }
    }

    case ACTION_TYPES.TICK_TIMER: {
      // If game is over or timers are not active, don't update
      if (state.gameOver || !state.timers.active) {
        return state
      }

      const currentPlayerColor = state.currentPlayer
      const currentTime = state.timers[currentPlayerColor]

      // If time is up
      if (currentTime <= 0) {
        return {
          ...state,
          gameOver: true,
          winner: currentPlayerColor === "white" ? "black" : "white",
          gameStatus: "timeout",
          timers: {
            ...state.timers,
            active: false,
            [currentPlayerColor]: 0,
          },
        }
      }

      // Decrement timer for current player
      return {
        ...state,
        timers: {
          ...state.timers,
          [currentPlayerColor]: currentTime - 1,
        },
      }
    }

    case ACTION_TYPES.TOGGLE_TIMER: {
      return {
        ...state,
        timers: {
          ...state.timers,
          active: !state.timers.active,
        },
      }
    }

    case ACTION_TYPES.RESET_GAME:
      return {
        ...initialState,
        board: initializeBoard(),
        moveHistory: [],
        undoStack: [],
        redoStack: [],
        timers: {
          white: 10 * 60,
          black: 10 * 60,
          active: false,
        },
      }

    case ACTION_TYPES.CLEAR_SELECTION: {
      return {
        ...state,
        selectedPiece: null,
        validMoves: [],
      }
    }

    case ACTION_TYPES.TOGGLE_RESIGN_CONFIRM: {
      return {
        ...state,
        resignationConfirm: !state.resignationConfirm,
      }
    }

    case ACTION_TYPES.CANCEL_RESIGN: {
      return {
        ...state,
        resignationConfirm: false,
      }
    }

    case ACTION_TYPES.RESIGN_GAME: {
      // The current player is resigning, so the opponent wins
      const winner = state.currentPlayer === "white" ? "black" : "white"

      // Play resignation sound
      playSound("/sounds/resign.mp3")

      return {
        ...state,
        gameOver: true,
        winner: winner,
        gameStatus: "resigned",
        resignationConfirm: false,
        timers: {
          ...state.timers,
          active: false,
        },
      }
    }

    default:
      return state
  }
}

// Provider component
export function ChessProvider({ children }) {
  const [state, dispatch] = useReducer(chessReducer, initialState)

  // Timer effect
  useEffect(() => {
    let interval
    if (state.timers.active && !state.gameOver) {
      interval = setInterval(() => {
        dispatch({ type: ACTION_TYPES.TICK_TIMER })
      }, 1000)
    }
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [state.timers.active, state.gameOver, state.currentPlayer])

  // Actions
  const selectPiece = (row, col) => {
    dispatch({ type: ACTION_TYPES.SELECT_PIECE, payload: { row, col } })
  }

  const movePiece = (fromRow, fromCol, toRow, toCol) => {
    dispatch({
      type: ACTION_TYPES.MOVE_PIECE,
      payload: { fromRow, fromCol, toRow, toCol },
    })
  }

  const resetGame = () => {
    dispatch({ type: ACTION_TYPES.RESET_GAME })
  }

  const undoMove = () => {
    dispatch({ type: ACTION_TYPES.UNDO_MOVE })
  }

  const redoMove = () => {
    dispatch({ type: ACTION_TYPES.REDO_MOVE })
  }

  const toggleTimer = () => {
    dispatch({ type: ACTION_TYPES.TOGGLE_TIMER })
  }

  const toggleResignConfirm = () => {
    dispatch({ type: ACTION_TYPES.TOGGLE_RESIGN_CONFIRM })
  }

  const cancelResign = () => {
    dispatch({ type: ACTION_TYPES.CANCEL_RESIGN })
  }

  const resignGame = () => {
    dispatch({ type: ACTION_TYPES.RESIGN_GAME })
  }

  // Handle piece selection
  const handleSquareClick = (row, col) => {
    // If game is over, don't allow moves
    if (state.gameOver) {
      return
    }

    // Start timer on first move if not already active
    if (!state.timers.active && state.moveHistory.length === 0) {
      toggleTimer()
    }

    // If no piece is selected, try to select one
    if (!state.selectedPiece) {
      selectPiece(row, col)
      return
    }

    const [selectedRow, selectedCol] = state.selectedPiece

    // If clicking the same piece, deselect it
    if (selectedRow === row && selectedCol === col) {
      dispatch({ type: ACTION_TYPES.CLEAR_SELECTION })
      return
    }

    // Check if the clicked square is a valid move
    const isValidMove = state.validMoves.some(([r, c]) => r === row && c === col)

    if (isValidMove) {
      // Move the piece
      movePiece(selectedRow, selectedCol, row, col)
    } else {
      // Try to select a different piece
      selectPiece(row, col)
    }
  }

  const value = {
    ...state,
    handleSquareClick,
    resetGame,
    undoMove,
    redoMove,
    toggleTimer,
    toggleResignConfirm,
    cancelResign,
    resignGame,
  }

  return <ChessContext.Provider value={value}>{children}</ChessContext.Provider>
}

// Custom hook to use the chess context
export function useChess() {
  const context = useContext(ChessContext)
  if (!context) {
    throw new Error("useChess must be used within a ChessProvider")
  }
  return context
}
