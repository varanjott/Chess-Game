# Chess Game

A feature-rich chess game built with React 19 + Vite. Play locally against a friend, or face Stockfish 17 — a real, world-class chess engine — at four difficulty levels.

## Features

### Gameplay

- **Full chess rules** powered by `chess.js`:
  - Castling (kingside and queenside)
  - En passant
  - Pawn promotion (player chooses Queen / Rook / Bishop / Knight via modal)
  - Stalemate, threefold repetition, 50-move rule, and insufficient material draws
  - Check and checkmate detection
- **Move validation** with legal move highlighting
- **Last-move highlighting** for both sides
- **Standard algebraic notation** (SAN) move history

### AI

- **Real Stockfish 17 engine** running in a Web Worker (no UI freeze)
- Four difficulty levels (search depth: 5 / 10 / 15 / 18)
- Engine starts thinking the moment it's its turn

### Time controls

- **Six presets**: Bullet (1+0), Blitz (3+2 or 5+0), Rapid (10+0 or 15+10), Classical (30+0)
- **Fischer increment** added to clock after each move
- Pause / resume during play
- Loss on time correctly detected and announced

### Game features

- **Captured pieces** display above and below the board
- **Material advantage** badge (+3, +5, etc.) for the leading side
- **Undo / Redo** (in AI mode, undoes both player + AI moves)
- **Resign** with confirmation
- **Export PGN** — downloads a standards-compliant `.pgn` file with proper headers

### UI

- Responsive layout (mobile, tablet, desktop)
- Sound effects (optional — files in `public/sounds/`)
- Smooth transitions and hover states

## Project structure

```
src/
├── App.jsx                    # Top-level layout
├── main.jsx                   # React entry point
├── components/
│   ├── ChessBoard.jsx         # 8×8 grid renderer
│   ├── Square.jsx             # Single square with state classes
│   ├── Piece.jsx              # Piece glyph
│   ├── TimerCard.jsx          # Setup screen + active timers
│   ├── GameControls.jsx       # Move history + action buttons
│   ├── PromotionModal.jsx     # Choose Q/R/B/N when a pawn promotes
│   └── CapturedPieces.jsx     # Captured pieces + material score
├── context/
│   └── ChessContext.jsx       # Game state (useReducer + chess.js)
└── utils/
    ├── chessLogic.js          # chess.js adapter for our React types
    ├── aiService.js           # Stockfish UCI worker wrapper
    ├── pgnExport.js           # PGN file generator + downloader
    └── timeControls.js        # Preset definitions
```

## Running locally

```bash
npm install
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build into dist/
npm run preview      # Preview the production build at :4173
npm run deploy       # Deploy dist/ to gh-pages
```

## How it works under the hood

### chess.js as source of truth

The reducer stores a list of SAN strings (`["e4", "e5", "Nf3", ...]`) as the canonical history. Whenever it needs the current position, it replays the history into a fresh `Chess` instance. This keeps the reducer pure — no live mutable engine in state — and makes undo/redo trivially correct.

### Stockfish in a Web Worker

The `lite-single` Stockfish build (~7 MB) lives in `public/stockfish/`. It loads in a Web Worker and speaks UCI:

```
→ uci                                  // handshake
← uciok
→ isready
← readyok
→ position fen <fen>
→ go depth 10
← bestmove e2e4
```

`aiService.js` wraps this with a Promise-based API and an `AbortSignal` so we can cancel mid-think (when the user resets the game, for example).

### Why the lite-single build?

The full 6-part Stockfish needs SharedArrayBuffer, which requires COOP/COEP HTTP headers. Most static hosts (including GitHub Pages) don't set these. `lite-single` is the largest Stockfish that runs without them — strong enough to mate any human at depth 15+.

## Technical notes

- **No bundled WASM**: Stockfish files live in `public/`, served as-is. No special Vite worker configuration needed.
- **Bundle size**: ~80 KB gzipped JS, ~4 KB gzipped CSS, plus 7 MB Stockfish WASM (loaded only when AI mode is selected).
- **State management**: Single `useReducer` in a Context provider. No external state library.
