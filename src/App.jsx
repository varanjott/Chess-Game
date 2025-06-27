import ChessBoard from "./components/ChessBoard"
import GameControls from "./components/GameControls"
import TimerCard from "./components/TimerCard"
import { ChessProvider } from "./context/ChessContext"
import "./App.css"

function App() {
  return (
    <ChessProvider>
      <div className="app">
        <div className="chess-container">
          <TimerCard />
          <div className="board-card">
            <ChessBoard />
          </div>
          <GameControls />
        </div>
      </div>
    </ChessProvider>
  )
}

export default App
