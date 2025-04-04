import './style.css'
import { GameController } from './controllers/GameController'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="game-container">
    <!-- The puzzle UI will be inserted here -->
  </div>
`

// Initialize the game controller with the container element
const gameController = new GameController(document.querySelector<HTMLDivElement>('.game-container')!)
gameController.start()
