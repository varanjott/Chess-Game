import ChessBoard from "./components/ChessBoard";
import GameControls from "./components/GameControls";
import TimerCard from "./components/TimerCard";
import PromotionModal from "./components/PromotionModal";
import CapturedPieces from "./components/CapturedPieces";
import { ChessProvider } from "./context/ChessContext";
import "./App.css";

function App() {
  return (
    <ChessProvider>
      <div className="app">
        <div className="chess-container">
          <TimerCard />
          <div className="board-card">
            <CapturedPieces side="black" />
            <ChessBoard />
            <CapturedPieces side="white" />
          </div>
          <GameControls />
        </div>
        <PromotionModal />
      </div>
    </ChessProvider>
  );
}

export default App;
