import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App"

// Get or create root element
function getRootElement() {
  let container = document.getElementById("root")

  if (!container) {
    container = document.createElement("div")
    container.id = "root"
    document.body.appendChild(container)
  }

  return container
}

// Initialize app with error handling
function initApp() {
  try {
    const container = getRootElement()
    const root = createRoot(container)

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (error) {
    console.error("Failed to initialize app:", error)

    // Fallback UI
    document.body.innerHTML = `
      <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif; color: #333;">
        <h1>Chess Master Pro</h1>
        <p>Unable to load the game. Please refresh the page.</p>
        <button onclick="window.location.reload()" style="padding: 10px 20px; margin-top: 20px; cursor: pointer;">
          Refresh Page
        </button>
      </div>
    `
  }
}

// Wait for DOM or initialize immediately
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initApp)
} else {
  initApp()
}
