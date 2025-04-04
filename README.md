# Sliding Puzzle Game

A modern, interactive sliding puzzle game built with TypeScript and Vite.

## Features

- Multiple puzzle sizes from 3×3 (easy) to 8×8 (impossible)
- Responsive design that works on desktop and mobile devices
- Fullscreen gameplay for immersive experience
- Accessibility features including keyboard navigation and screen reader support
- Dark mode support
- Touch device optimized

## Architecture

The codebase follows the Model-View-Controller (MVC) pattern:

- **Model**: Handles the core game logic and state
- **View**: Manages the UI rendering and user interactions
- **Controller**: Connects the model and view, handling game flow

## Project Structure

```
├── src/
│   ├── models/         # Data models
│   │   └── PuzzleModel.ts
│   ├── views/          # UI components
│   │   └── PuzzleView.ts
│   ├── controllers/    # Game controllers
│   │   └── GameController.ts
│   ├── utils/          # Utility functions
│   │   └── helpers.ts
│   ├── main.ts         # Entry point
│   └── style.css       # Global styles
```

## Development

### Prerequisites

- Node.js 14+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## How to Play

1. Select a puzzle size from the welcome screen
2. Click "Start Game" to begin
3. Click on tiles adjacent to the empty space to move them
4. Try to arrange the tiles in numerical order
5. The game is solved when all tiles are in the correct position

## License

MIT 