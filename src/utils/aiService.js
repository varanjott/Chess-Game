// src/utils/aiService.js
//
// Stockfish AI service. Uses the npm `stockfish` package which exposes a Web
// Worker-compatible build. We talk to it with the UCI (Universal Chess
// Interface) protocol — same protocol every chess engine uses.
//
// UCI flow we care about:
//   "uci"                 -> engine replies "uciok"
//   "isready"             -> engine replies "readyok"
//   "ucinewgame"          -> reset for a new game
//   "position fen <fen>"  -> set the position
//   "go depth N"          -> search and reply with "bestmove e2e4" (LAN)
//
// We expose:
//   initAI()                       - lazily creates the worker
//   getAIMove(fen, depth, signal?) - resolves with a move in long algebraic
//                                    notation like "e2e4" or "e7e8q"
//   destroyAI()                    - tears the worker down (on unmount)

let worker = null;
let pendingResolve = null;
let pendingReject = null;
let initPromise = null;

// Stockfish JS + WASM live in public/stockfish/ — that means they're served
// at the root in dev AND copied to dist/ during build, with no Vite worker
// bundling magic to debug. The .js file looks for its .wasm sibling at the
// same URL, so they must stay together.
const STOCKFISH_PATH = `${import.meta.env.BASE_URL || "/"}stockfish/stockfish-17.1-lite-single-03e3232.js`;

function createWorker() {
  // The lite-single build doesn't need SharedArrayBuffer (no COOP/COEP
  // headers required), keeping deployment to GitHub Pages simple.
  return new Worker(STOCKFISH_PATH);
}

function send(cmd) {
  if (worker) worker.postMessage(cmd);
}

function onMessage(event) {
  const line = typeof event.data === "string" ? event.data : "";
  if (!line) return;

  if (line.startsWith("bestmove")) {
    const parts = line.split(/\s+/);
    const move = parts[1];
    const resolver = pendingResolve;
    pendingResolve = null;
    pendingReject = null;
    // "bestmove (none)" happens in checkmate/stalemate positions
    if (resolver) resolver(move && move !== "(none)" ? move : null);
  }
}

function onError(event) {
  console.error("Stockfish worker error:", event);
  const rejecter = pendingReject;
  pendingResolve = null;
  pendingReject = null;
  if (rejecter) rejecter(new Error("Stockfish worker error"));
}

export function initAI() {
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    try {
      worker = createWorker();
    } catch (err) {
      reject(err);
      return;
    }

    let uciOk = false;

    const handshake = (event) => {
      const line = typeof event.data === "string" ? event.data : "";
      if (line.includes("uciok")) {
        uciOk = true;
        send("isready");
      } else if (line.includes("readyok") && uciOk) {
        worker.removeEventListener("message", handshake);
        worker.addEventListener("message", onMessage);
        worker.addEventListener("error", onError);
        resolve();
      }
    };

    worker.addEventListener("message", handshake);
    worker.addEventListener("error", (e) => {
      worker.removeEventListener("message", handshake);
      reject(new Error(`Stockfish init failed: ${e.message || "unknown"}`));
    });

    send("uci");
  });

  return initPromise;
}

/**
 * Ask the engine for a move.
 *
 * @param {string} fen   - position in FEN
 * @param {number} depth - search depth (5 = easy, 10 = medium, 15 = hard)
 * @param {AbortSignal} [signal] - optional cancellation
 * @returns {Promise<string|null>} long algebraic move ("e2e4" / "e7e8q") or
 *                                  null if game over
 */
export async function getAIMove(fen, depth = 10, signal) {
  await initAI();

  // If a previous request is still pending (e.g. user reset mid-think),
  // tell the engine to stop and discard whatever it's about to send.
  if (pendingResolve) {
    send("stop");
    pendingResolve(null);
    pendingResolve = null;
    pendingReject = null;
  }

  return new Promise((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;

    if (signal) {
      if (signal.aborted) {
        send("stop");
        pendingResolve = null;
        pendingReject = null;
        resolve(null);
        return;
      }
      const onAbort = () => {
        send("stop");
        if (pendingResolve === resolve) {
          pendingResolve = null;
          pendingReject = null;
          resolve(null);
        }
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }

    send("ucinewgame");
    send(`position fen ${fen}`);
    send(`go depth ${Math.max(1, Math.min(depth, 20))}`);
  });
}

export function destroyAI() {
  if (worker) {
    try { send("quit"); } catch { /* noop */ }
    worker.terminate();
    worker = null;
  }
  initPromise = null;
  pendingResolve = null;
  pendingReject = null;
}
