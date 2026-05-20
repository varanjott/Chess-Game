// src/context/ChessContext.jsx
//
// Game state + actions. Big refactor from the original:
//   - chess.js owns all rule logic (castling, en passant, draws, etc.)
//   - State stores PGN-style move history (SAN strings); the chess.js
//     instance is rebuilt from history when undoing/redoing. This keeps
//     the reducer pure (no live mutable engine in state).
//   - AI uses real Stockfish via Web Worker, with proper depth control.
//   - Pawn promotion goes through a modal instead of auto-queening.
//   - Fischer increment supported.

"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  createChess,
  createChessFromHistory,
  chessJsBoardToGrid,
  getValidMovesFor,
  isPromotionMove,
  squareToCoord,
  coordToSquare,
} from "../utils/chessLogic";
import { initAI, getAIMove, destroyAI } from "../utils/aiService";
import { DEFAULT_TIME_CONTROL } from "../utils/timeControls";

const ChessContext = createContext(null);

// ---------- Helpers ----------

/**
 * Given a chess.js instance, derive the values our UI needs to render.
 * Pure read-only — never mutates the engine.
 */
function deriveDisplayState(chess) {
  const grid = chessJsBoardToGrid(chess.board());
  const turn = chess.turn() === "w" ? "white" : "black";

  let gameStatus = "active";
  let gameOver = false;
  let winner = null;
  let drawReason = null;

  if (chess.isCheckmate()) {
    gameStatus = "checkmate";
    gameOver = true;
    // The side to move is the loser.
    winner = turn === "white" ? "black" : "white";
  } else if (chess.isStalemate()) {
    gameStatus = "draw";
    gameOver = true;
    drawReason = "stalemate";
  } else if (chess.isInsufficientMaterial()) {
    gameStatus = "draw";
    gameOver = true;
    drawReason = "insufficient material";
  } else if (chess.isThreefoldRepetition()) {
    gameStatus = "draw";
    gameOver = true;
    drawReason = "threefold repetition";
  } else if (chess.isDraw()) {
    // catches the 50-move rule and any other draw conditions chess.js knows
    gameStatus = "draw";
    gameOver = true;
    drawReason = "50-move rule";
  } else if (chess.inCheck()) {
    gameStatus = "check";
  }

  // sanHistory drives undo/redo, PGN export, and AI replay
  const sanHistory = chess.history();

  // Build a list of move objects the GameControls can render. We re-derive
  // this from chess.js verbose history on every change — simple and correct.
  const verbose = chess.history({ verbose: true });
  const moveHistory = verbose.map((m) => ({
    notation: m.san,
    from: squareToCoord(m.from),
    to: squareToCoord(m.to),
    captured: !!m.captured,
  }));

  // Highlight the most recent move
  const last = verbose[verbose.length - 1];
  const lastMoveHighlight = last
    ? [...squareToCoord(last.from), ...squareToCoord(last.to)]
    : null;

  return {
    grid,
    currentPlayer: turn,
    gameStatus,
    gameOver,
    winner,
    drawReason,
    moveHistory,
    sanHistory,
    lastMoveHighlight,
    fen: chess.fen(),
  };
}

// ---------- Initial state ----------

const initialState = {
  // History-driven: this is the source of truth for the position
  sanHistory: [],
  redoStack: [],

  // Derived from sanHistory at every reducer call
  grid: chessJsBoardToGrid(createChess().board()),
  currentPlayer: "white",
  moveHistory: [],
  gameStatus: "active",
  gameOver: false,
  winner: null,
  drawReason: null,
  lastMoveHighlight: null,
  fen: createChess().fen(),

  // UI selection state
  selectedSquare: null, // [row, col] | null
  validMoves: [], // [[row, col], ...]

  // Promotion modal state
  pendingPromotion: null, // { fromRow, fromCol, toRow, toCol } | null

  // Timer state
  timeControl: DEFAULT_TIME_CONTROL,
  timers: {
    white: DEFAULT_TIME_CONTROL.minutes * 60,
    black: DEFAULT_TIME_CONTROL.minutes * 60,
    active: false,
  },

  // Resignation flow
  resignationConfirm: false,

  // Game mode
  gameMode: "playerVsAi", // 'playerVsPlayer' | 'playerVsAi'
  difficulty: 10, // Stockfish search depth
  isAiThinking: false,
  gameSetupComplete: false,
};

// ---------- Action types ----------

const A = {
  SELECT_SQUARE: "SELECT_SQUARE",
  CLEAR_SELECTION: "CLEAR_SELECTION",
  MAKE_MOVE: "MAKE_MOVE",
  REQUEST_PROMOTION: "REQUEST_PROMOTION",
  CANCEL_PROMOTION: "CANCEL_PROMOTION",
  UNDO: "UNDO",
  REDO: "REDO",
  RESET_GAME: "RESET_GAME",
  TICK: "TICK",
  TOGGLE_TIMER: "TOGGLE_TIMER",
  TOGGLE_RESIGN: "TOGGLE_RESIGN",
  CANCEL_RESIGN: "CANCEL_RESIGN",
  RESIGN: "RESIGN",
  SET_GAME_MODE: "SET_GAME_MODE",
  SET_DIFFICULTY: "SET_DIFFICULTY",
  SET_TIME_CONTROL: "SET_TIME_CONTROL",
  START_GAME: "START_GAME",
  SET_AI_THINKING: "SET_AI_THINKING",
};

// ---------- Sound (best-effort) ----------
//
// Sound files live in public/sounds/. If they're missing the audio element
// throws on load — we swallow the error so the game still works. Set this
// to false to skip sound entirely (e.g. during dev with no sound files).
const SOUNDS_ENABLED = true;

function playSound(path) {
  if (!SOUNDS_ENABLED) return;
  try {
    const audio = new Audio(path);
    audio.volume = 0.4;
    // Both `play()` rejection and `error` event can fire if the file 404s;
    // we listen for the error event to avoid the Network tab noise on some
    // browsers, but the play() catch is enough functionally.
    audio.addEventListener("error", () => {}, { once: true });
    audio.play().catch(() => {});
  } catch {
    /* noop */
  }
}

// ---------- Reducer ----------

function reducer(state, action) {
  switch (action.type) {
    case A.SET_GAME_MODE:
      return { ...state, gameMode: action.payload };

    case A.SET_DIFFICULTY:
      return { ...state, difficulty: action.payload };

    case A.SET_TIME_CONTROL: {
      const tc = action.payload;
      return {
        ...state,
        timeControl: tc,
        timers: { white: tc.minutes * 60, black: tc.minutes * 60, active: false },
      };
    }

    case A.START_GAME:
      return {
        ...state,
        gameSetupComplete: true,
        timers: { ...state.timers, active: true },
      };

    case A.SET_AI_THINKING:
      return { ...state, isAiThinking: action.payload };

    case A.SELECT_SQUARE: {
      if (state.gameOver || state.pendingPromotion) return state;
      const { row, col } = action.payload;
      const piece = state.grid[row][col];
      if (!piece || piece.color !== state.currentPlayer) {
        return { ...state, selectedSquare: null, validMoves: [] };
      }
      const chess = createChessFromHistory(state.sanHistory);
      const validMoves = getValidMovesFor(chess, row, col);
      return { ...state, selectedSquare: [row, col], validMoves };
    }

    case A.CLEAR_SELECTION:
      return { ...state, selectedSquare: null, validMoves: [] };

    case A.REQUEST_PROMOTION:
      return { ...state, pendingPromotion: action.payload };

    case A.CANCEL_PROMOTION:
      return { ...state, pendingPromotion: null, selectedSquare: null, validMoves: [] };

    case A.MAKE_MOVE: {
      const { fromRow, fromCol, toRow, toCol, promotion } = action.payload;
      const chess = createChessFromHistory(state.sanHistory);
      const moveResult = chess.move({
        from: coordToSquare(fromRow, fromCol),
        to: coordToSquare(toRow, toCol),
        promotion: promotion || undefined,
      });

      // Illegal move → no state change
      if (!moveResult) {
        return { ...state, selectedSquare: null, validMoves: [], pendingPromotion: null };
      }

      // Apply Fischer increment to the player who just moved
      const movedColor = moveResult.color === "w" ? "white" : "black";
      const incremented = state.timers.active
        ? {
            ...state.timers,
            [movedColor]: state.timers[movedColor] + state.timeControl.increment,
          }
        : state.timers;

      const display = deriveDisplayState(chess);

      // Sound effects
      if (display.gameStatus === "checkmate") playSound("/sounds/checkmate.mp3");
      else if (display.gameStatus === "check") playSound("/sounds/check.mp3");
      else if (moveResult.captured) playSound("/sounds/capture.mp3");
      else playSound("/sounds/move.mp3");

      // Stop the clock if the game ended
      const finalTimers =
        display.gameOver ? { ...incremented, active: false } : incremented;

      return {
        ...state,
        ...display,
        sanHistory: [...state.sanHistory, moveResult.san],
        redoStack: [], // any new move kills the redo branch
        selectedSquare: null,
        validMoves: [],
        pendingPromotion: null,
        timers: finalTimers,
      };
    }

    case A.UNDO: {
      if (state.sanHistory.length === 0) return state;
      const newHistory = state.sanHistory.slice(0, -1);
      const popped = state.sanHistory[state.sanHistory.length - 1];
      const chess = createChessFromHistory(newHistory);
      return {
        ...state,
        ...deriveDisplayState(chess),
        sanHistory: newHistory,
        redoStack: [...state.redoStack, popped],
        selectedSquare: null,
        validMoves: [],
        pendingPromotion: null,
      };
    }

    case A.REDO: {
      if (state.redoStack.length === 0) return state;
      const next = state.redoStack[state.redoStack.length - 1];
      const newRedo = state.redoStack.slice(0, -1);
      const newHistory = [...state.sanHistory, next];
      const chess = createChessFromHistory(newHistory);
      return {
        ...state,
        ...deriveDisplayState(chess),
        sanHistory: newHistory,
        redoStack: newRedo,
        selectedSquare: null,
        validMoves: [],
        pendingPromotion: null,
      };
    }

    case A.RESET_GAME: {
      const chess = createChess();
      const tc = state.timeControl;
      return {
        ...initialState,
        timeControl: tc,
        timers: { white: tc.minutes * 60, black: tc.minutes * 60, active: false },
        // Carry the user's mode/difficulty selections forward
        gameMode: state.gameMode,
        difficulty: state.difficulty,
        gameSetupComplete: false,
        ...deriveDisplayState(chess),
        sanHistory: [],
      };
    }

    case A.TICK: {
      if (state.gameOver || !state.timers.active) return state;
      const color = state.currentPlayer;
      const remaining = state.timers[color];
      if (remaining <= 1) {
        // Time out — the side whose clock hit zero loses
        return {
          ...state,
          gameOver: true,
          winner: color === "white" ? "black" : "white",
          gameStatus: "timeout",
          timers: { ...state.timers, [color]: 0, active: false },
        };
      }
      return {
        ...state,
        timers: { ...state.timers, [color]: remaining - 1 },
      };
    }

    case A.TOGGLE_TIMER:
      return { ...state, timers: { ...state.timers, active: !state.timers.active } };

    case A.TOGGLE_RESIGN:
      return { ...state, resignationConfirm: !state.resignationConfirm };

    case A.CANCEL_RESIGN:
      return { ...state, resignationConfirm: false };

    case A.RESIGN: {
      const winner = state.currentPlayer === "white" ? "black" : "white";
      playSound("/sounds/resign.mp3");
      return {
        ...state,
        gameOver: true,
        winner,
        gameStatus: "resigned",
        resignationConfirm: false,
        timers: { ...state.timers, active: false },
      };
    }

    default:
      return state;
  }
}

// ---------- Provider ----------

export function ChessProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Engine instance is recreated each render where needed, but we keep an
  // abort controller for in-flight AI requests so we can cancel cleanly on
  // unmount or reset.
  const aiAbortRef = useRef(null);

  // Init Stockfish on mount, tear down on unmount
  useEffect(() => {
    initAI().catch((err) => {
      console.error("Stockfish init failed:", err);
    });
    return () => {
      if (aiAbortRef.current) aiAbortRef.current.abort();
      destroyAI();
    };
  }, []);

  // Trigger AI move when it's the AI's turn
  useEffect(() => {
    const isAisTurn =
      state.gameMode === "playerVsAi" &&
      state.currentPlayer === "black" &&
      !state.gameOver &&
      state.gameSetupComplete &&
      !state.pendingPromotion;

    if (!isAisTurn) return;

    const controller = new AbortController();
    aiAbortRef.current = controller;
    dispatch({ type: A.SET_AI_THINKING, payload: true });

    let cancelled = false;
    getAIMove(state.fen, state.difficulty, controller.signal)
      .then((moveLan) => {
        if (cancelled || controller.signal.aborted) return;
        if (!moveLan) {
          dispatch({ type: A.SET_AI_THINKING, payload: false });
          return;
        }
        // Long algebraic from Stockfish: "e2e4" or "e7e8q"
        const fromCol = moveLan.charCodeAt(0) - 97;
        const fromRow = 8 - parseInt(moveLan[1], 10);
        const toCol = moveLan.charCodeAt(2) - 97;
        const toRow = 8 - parseInt(moveLan[3], 10);
        const promo = moveLan.length === 5 ? moveLan[4] : undefined;
        dispatch({
          type: A.MAKE_MOVE,
          payload: { fromRow, fromCol, toRow, toCol, promotion: promo },
        });
        dispatch({ type: A.SET_AI_THINKING, payload: false });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("AI move failed:", err);
          dispatch({ type: A.SET_AI_THINKING, payload: false });
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // We intentionally key off fen (the canonical position) rather than
    // sanHistory.length, so the effect runs exactly once per real position.
  }, [
    state.fen,
    state.gameMode,
    state.gameOver,
    state.difficulty,
    state.currentPlayer,
    state.gameSetupComplete,
    state.pendingPromotion,
  ]);

  // Clock tick
  useEffect(() => {
    if (!state.timers.active || state.gameOver) return;
    const id = setInterval(() => dispatch({ type: A.TICK }), 1000);
    return () => clearInterval(id);
  }, [state.timers.active, state.gameOver]);

  // ---------- Action creators ----------

  const handleSquareClick = useCallback(
    (row, col) => {
      if (state.gameOver) return;
      // Lock the board while waiting for a promotion choice
      if (state.pendingPromotion) return;
      // In AI mode, ignore clicks during AI's turn
      if (state.gameMode === "playerVsAi" && state.currentPlayer === "black") return;

      // Auto-start the timer on first move
      if (!state.timers.active && state.sanHistory.length === 0 && state.gameSetupComplete) {
        dispatch({ type: A.TOGGLE_TIMER });
      }

      // No piece selected yet → try to select one
      if (!state.selectedSquare) {
        dispatch({ type: A.SELECT_SQUARE, payload: { row, col } });
        return;
      }

      const [selRow, selCol] = state.selectedSquare;

      // Click same square → deselect
      if (selRow === row && selCol === col) {
        dispatch({ type: A.CLEAR_SELECTION });
        return;
      }

      // Clicked a valid destination → move (with promotion check)
      const isValid = state.validMoves.some(([r, c]) => r === row && c === col);
      if (isValid) {
        const chess = createChessFromHistory(state.sanHistory);
        if (isPromotionMove(chess, selRow, selCol, row, col)) {
          dispatch({
            type: A.REQUEST_PROMOTION,
            payload: { fromRow: selRow, fromCol: selCol, toRow: row, toCol: col },
          });
        } else {
          dispatch({
            type: A.MAKE_MOVE,
            payload: { fromRow: selRow, fromCol: selCol, toRow: row, toCol: col },
          });
        }
      } else {
        // Otherwise treat as picking a different piece
        dispatch({ type: A.SELECT_SQUARE, payload: { row, col } });
      }
    },
    [state]
  );

  const choosePromotion = useCallback(
    (piece) => {
      if (!state.pendingPromotion) return;
      const { fromRow, fromCol, toRow, toCol } = state.pendingPromotion;
      dispatch({
        type: A.MAKE_MOVE,
        payload: { fromRow, fromCol, toRow, toCol, promotion: piece },
      });
    },
    [state.pendingPromotion]
  );

  const cancelPromotion = useCallback(() => dispatch({ type: A.CANCEL_PROMOTION }), []);
  const undoMove = useCallback(() => {
    // In AI mode, undo two plies (player's move + AI's reply) so the user
    // ends up at their own turn again.
    if (state.gameMode === "playerVsAi") {
      dispatch({ type: A.UNDO });
      dispatch({ type: A.UNDO });
    } else {
      dispatch({ type: A.UNDO });
    }
  }, [state.gameMode]);
  const redoMove = useCallback(() => {
    if (state.gameMode === "playerVsAi") {
      dispatch({ type: A.REDO });
      dispatch({ type: A.REDO });
    } else {
      dispatch({ type: A.REDO });
    }
  }, [state.gameMode]);
  const resetGame = useCallback(() => dispatch({ type: A.RESET_GAME }), []);
  const toggleTimer = useCallback(() => dispatch({ type: A.TOGGLE_TIMER }), []);
  const toggleResignConfirm = useCallback(() => dispatch({ type: A.TOGGLE_RESIGN }), []);
  const cancelResign = useCallback(() => dispatch({ type: A.CANCEL_RESIGN }), []);
  const resignGame = useCallback(() => dispatch({ type: A.RESIGN }), []);

  const value = {
    // State
    board: state.grid,
    selectedPiece: state.selectedSquare,
    validMoves: state.validMoves,
    currentPlayer: state.currentPlayer,
    moveHistory: state.moveHistory,
    sanHistory: state.sanHistory,
    gameStatus: state.gameStatus,
    gameOver: state.gameOver,
    winner: state.winner,
    drawReason: state.drawReason,
    lastMoveHighlight: state.lastMoveHighlight,
    fen: state.fen,
    pendingPromotion: state.pendingPromotion,
    timers: state.timers,
    timeControl: state.timeControl,
    resignationConfirm: state.resignationConfirm,
    gameMode: state.gameMode,
    difficulty: state.difficulty,
    isAiThinking: state.isAiThinking,
    gameSetupComplete: state.gameSetupComplete,
    redoStack: state.redoStack,

    // Actions
    dispatch,
    handleSquareClick,
    choosePromotion,
    cancelPromotion,
    undoMove,
    redoMove,
    resetGame,
    toggleTimer,
    toggleResignConfirm,
    cancelResign,
    resignGame,
  };

  return <ChessContext.Provider value={value}>{children}</ChessContext.Provider>;
}

export function useChess() {
  const ctx = useContext(ChessContext);
  if (!ctx) throw new Error("useChess must be used within a ChessProvider");
  return ctx;
}

export { A as ACTION_TYPES };
