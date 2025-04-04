import './style.css'
import { MultiplayerGameController } from './controllers/MultiplayerGameController'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="game-container">
    <!-- The puzzle UI will be inserted here -->
  </div>
`

// Initialize the game controller with the container element
const gameController = new MultiplayerGameController(document.querySelector<HTMLDivElement>('.game-container')!)
gameController.start()
