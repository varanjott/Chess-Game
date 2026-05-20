// src/utils/timeControls.js
//
// Standard chess time controls. Each preset is "minutes per side + increment
// in seconds per move". Increment is added to a player's clock AFTER they
// complete a move (Fischer increment).

export const TIME_CONTROLS = [
  { id: "bullet", label: "Bullet", minutes: 1, increment: 0, description: "1 + 0" },
  { id: "blitz3", label: "Blitz", minutes: 3, increment: 2, description: "3 + 2" },
  { id: "blitz5", label: "Blitz", minutes: 5, increment: 0, description: "5 + 0" },
  { id: "rapid", label: "Rapid", minutes: 10, increment: 0, description: "10 + 0" },
  { id: "rapid15", label: "Rapid", minutes: 15, increment: 10, description: "15 + 10" },
  { id: "classical", label: "Classical", minutes: 30, increment: 0, description: "30 + 0" },
];

export const DEFAULT_TIME_CONTROL = TIME_CONTROLS.find((t) => t.id === "rapid");

export function findTimeControl(id) {
  return TIME_CONTROLS.find((t) => t.id === id) || DEFAULT_TIME_CONTROL;
}
