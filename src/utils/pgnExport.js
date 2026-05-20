// src/utils/pgnExport.js
//
// Build a PGN string with proper headers and trigger a browser download.
// chess.js gives us the moves; we only need to set up tags and result.

/**
 * @param {Chess} chessInstance - the active chess.js instance
 * @param {object} meta
 * @param {string} meta.whiteName
 * @param {string} meta.blackName
 * @param {string} meta.result    - "1-0", "0-1", "1/2-1/2", or "*"
 * @param {string} [meta.event]
 * @returns {string} PGN text
 */
export function buildPgn(chessInstance, meta) {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  const headers = [
    ["Event", meta.event || "Casual Game"],
    ["Site", "Chess Game (Local)"],
    ["Date", `${yyyy}.${mm}.${dd}`],
    ["Round", "-"],
    ["White", meta.whiteName || "White"],
    ["Black", meta.blackName || "Black"],
    ["Result", meta.result || "*"],
  ];

  const headerBlock = headers.map(([k, v]) => `[${k} "${v}"]`).join("\n");

  // chess.js's pgn() includes its own headers; we'd rather control them
  // ourselves. So we extract just the move text.
  const fullPgn = chessInstance.pgn();
  const moveText = fullPgn.replace(/^\[[^\]]+\]\s*\n*/gm, "").trim();

  // Make sure the result token is present at the end of the move text.
  const resultToken = meta.result || "*";
  const moveTextWithResult = moveText.endsWith(resultToken)
    ? moveText
    : `${moveText} ${resultToken}`.trim();

  return `${headerBlock}\n\n${moveTextWithResult}\n`;
}

/**
 * Build a PGN from the inputs above and trigger a browser download.
 */
export function downloadPgn(chessInstance, meta) {
  const pgn = buildPgn(chessInstance, meta);
  const blob = new Blob([pgn], { type: "application/x-chess-pgn" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  const filename = `chess-${new Date().toISOString().slice(0, 10)}.pgn`;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Slightly delayed revoke so the click handler has time to fire on slower
  // browsers; 100ms is plenty.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
