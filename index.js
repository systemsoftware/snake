const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { readFileSync } = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

const config = JSON.parse(readFileSync('config.json', 'utf8'));

// Game state
const players = {};
const GRID_SIZE = config.GRID_SIZE || 30;
const GRID_WIDTH = config.GRID_WIDTH || 30;
const GRID_HEIGHT = config.GRID_HEIGHT || 30;

app.use(express.static(path.join(__dirname, 'public')));

function checkCollisions(players) {
    const collisions = {};
  
    Object.entries(players).forEach(([playerId, player]) => {
      const head = player.body[0];
      
      // Check self-collision
      const selfCollision = player.body.slice(1).some(
        segment => segment.x === head.x && segment.y === head.y
      );
  
      // Check collisions with other snakes
      const otherSnakeCollisions = Object.entries(players)
        .filter(([otherId]) => otherId !== playerId)
        .flatMap(([otherId, otherPlayer]) => 
          otherPlayer.body.map(segment => ({
            playerId: otherId,
            segment: segment
          }))
        )
        .filter(({ segment }) => 
          segment.x === head.x && segment.y === head.y
        );
  
      // Determine collision type
      if (selfCollision) {
        collisions[playerId] = {
          type: 'self',
          reason: 'Hit own body'
        };
      }
  
      if (otherSnakeCollisions.length > 0) {
        collisions[playerId] = {
          type: 'other',
          victims: otherSnakeCollisions.map(col => col.playerId),
          reason: 'Collision with other snake'
        };
      }
    });
  
    return collisions;
  }
  
  function handleCollisions(io, players, collisions) {
    Object.entries(collisions).forEach(([playerId, collision]) => {
      switch (collision.type) {
        case 'self':
          // Self-collision: player is eliminated
          io.to(playerId).emit('gameOver', {
            reason: collision.reason,
            type: 'self'
          });
          delete players[playerId];
          break;
  
        case 'other':
          // Collision with other snakes: multiple outcomes possible
          const currentPlayer = players[playerId];
          
          // Option 1: Eliminate current player
          io.to(playerId).emit('gameOver', {
            reason: collision.reason,
            type: 'other',
            victims: collision.victims
          });
          delete players[playerId];
  
          // Optional: Reward or penalize victims
          collision.victims.forEach(victimId => {
            const victimPlayer = players[victimId];
            if (victimPlayer) {
              // Potential game mechanics:
              // 1. Reduce victim's score
              victimPlayer.score = Math.max(0, victimPlayer.score - 2);
              
              // 2. Shorten victim's snake
              if (victimPlayer.body.length > 3) {
                victimPlayer.body = victimPlayer.body.slice(0, -2);
              }
  
              // Notify victim
              io.to(victimId).emit('snakeDamaged', {
                damage: 'collision',
                remainingScore: victimPlayer.score
              });
            }
          });
          break;
      }
    });
  }
  

function createInitialSnake(name) {
  return {
    body: [
      { x: Math.floor(Math.random() * GRID_WIDTH), 
        y: Math.floor(Math.random() * GRID_HEIGHT) }
    ],
    direction: ['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)],
    score: 0,
    name,
    color:`rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`
  };
}

function generateFood() {
  return {
    x: Math.floor(Math.random() * GRID_WIDTH),
    y: Math.floor(Math.random() * GRID_HEIGHT)
  };
}

let food = generateFood();

io.on('connection', (socket) => {
  console.log('New player connected');

  // Create a new player

  const cookies = socket.handshake.headers.cookie;
  const _name = cookies ? cookies.split('name=')[1] : '';
  let name = '';
  if(_name) name = _name.split(';')[0];
  else name = 'Player';

  players[socket.id] = createInitialSnake(name)

  // Send initial game state
  socket.emit('gameState', {
    players: players,
    food: food,
    gridSize: GRID_SIZE
  });

  // Broadcast new player to other players
  socket.broadcast.emit('playerJoined', {
    id: socket.id,
    player: players[socket.id]
  });

  // Handle player movement
  socket.on('changeDirection', (direction) => {
    if (!players[socket.id]) return;

    // Prevent 180-degree turns
    const currentDirection = players[socket.id].direction;
    const oppositeDirections = {
      'up': 'down',
      'down': 'up', 
      'left': 'right',
      'right': 'left'
    };

    if (direction !== oppositeDirections[currentDirection]) {
      players[socket.id].direction = direction;
    }else if(players[socket.id].body.length === 1){
      players[socket.id].direction = direction;
    }
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerLeft', socket.id);
  });
});

// Game loop
function gameLoop() {
    Object.keys(players).forEach(playerId => {
      const player = players[playerId];
      const head = { ...player.body[0] };
  
      // Existing movement logic...
      switch (player.direction) {
        case 'up': head.y--; break;
        case 'down': head.y++; break;
        case 'left': head.x--; break;
        case 'right': head.x++; break;
      }
  
      // Wrap around screen
      head.x = (head.x + GRID_WIDTH) % GRID_WIDTH;
      head.y = (head.y + GRID_HEIGHT) % GRID_HEIGHT;
  
      // Check food collision
      if (head.x === food.x && head.y === food.y) {
        player.score++;
        food = generateFood();
        io.emit('foodEaten', { food, playerId });
        // Grow snake when food is eaten
        player.body.push({ ...player.body[player.body.length - 1] });
      } else {
        player.body.pop(); // Remove tail if no food
      }
  
      // Add new head
      player.body.unshift(head);
    });
  
    // Advanced collision detection
    const collisions = checkCollisions(players);
    handleCollisions(io, players, collisions);
  
    // Broadcast updated game state
    io.emit('gameState', {
      players: players,
      food: food,
      gridSize: GRID_SIZE
    });
  }

// Start game loop
setInterval(gameLoop, config.GAME_SPEED || 100);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});