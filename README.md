# Multiplayer Snake Game 🐍🎮

## Overview

A real-time multiplayer Snake game built with Node.js, Express, and Socket.IO. Compete with multiple players in a dynamic, grid-based environment where snakes grow, score points, and interact in real-time.

## Features

- 🌐 Real-time multiplayer gameplay
- 🕹️ Responsive controls using arrow keys
- 🍎 Dynamic food generation
- 📊 Live score tracking
- 🌈 Multiple player support
- 🔄 Wrap-around screen mechanics

## Prerequisites

- Node.js (v14 or later)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/systemsoftware/snake.git
cd snake
```

2. Install dependencies:
```bash
npm install
```

## Running the Game

Start the server:
```bash
npm start
```

Open multiple browser windows at `http://localhost:3000` to play!

## Game Controls

- **Arrow Up**: Move snake upward
- **Arrow Down**: Move snake downward
- **Arrow Left**: Move snake left
- **Arrow Right**: Move snake right

## Game Mechanics

- Eat food to grow your snake and increase your score
- Avoid colliding with:
  - Your own body
  - Other players' snakes
- Screen wraps around edges, allowing continuous movement

## Technologies Used

- Node.js
- Express.js
- Socket.IO
- HTML5 Canvas
- JavaScript

## License

Distributed under the MIT License. See `LICENSE` for more information.

**Enjoy the game!** 🎉🐍
