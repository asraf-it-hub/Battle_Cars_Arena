/**
 * Battle Cars Arena - Main Client File
 * Handles UI management, socket connection, and Phaser game setup
 */

import GameScene from './scenes/GameScene.js';

// =====================================================
// WEAPON CONFIGURATION (same as server)
// =====================================================
const WEAPON_NAMES = {
  machine_gun: 'Machine Gun',
  shotgun: 'Shotgun',
  smg: 'SMG',
  laser: 'Laser',
  dual_gun: 'Dual Gun',
  rocket_launcher: 'Rocket Launcher',
  bomb_launcher: 'Bomb Launcher',
  grenade_launcher: 'Grenade Launcher',
  cannon: 'Cannon',
  mine: 'Mine'
};

const WEAPON_TYPES = {
  machine_gun: 'auto',
  shotgun: 'auto',
  smg: 'auto',
  laser: 'auto',
  dual_gun: 'auto',
  rocket_launcher: 'manual',
  bomb_launcher: 'manual',
  grenade_launcher: 'manual',
  cannon: 'manual',
  mine: 'manual'
};

// =====================================================
// PHASER GAME CONFIGURATION
// =====================================================
const config = {
  type: Phaser.CANVAS,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: [GameScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER
  },
  input: {
    activePointers: 3
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

const game = new Phaser.Game(config);
let gameScene = null;

// =====================================================
// UI STATE MANAGEMENT
// =====================================================
const UI = {
  currentScreen: 'home',
  playerName: '',
  roomId: '',
  roomCode: '',
  isCreator: false,
  isConnected: false,
  playerData: null,
  players: [],
  playersList: new Map(),
  scores: [],
  health: 100,
  weapon: 'machine_gun',
  timer: 600,
  gameMode: 'time' // 'time' or 'kills'
};

// =====================================================
// SCREEN MANAGEMENT
// =====================================================
const screens = {
  home: document.getElementById('home-screen'),
  lobby: document.getElementById('lobby-screen'),
  hud: document.getElementById('hud'),
  gameOver: document.getElementById('game-over-screen')
};

const modals = {
  createRoom: document.getElementById('create-room-modal'),
  joinRoom: document.getElementById('join-modal'),
  howToPlay: document.getElementById('how-to-play-modal')
};

function showScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[screenName]) {
    screens[screenName].classList.add('active');
  }
  UI.currentScreen = screenName;
}

function hideAllScreens() {
  Object.values(screens).forEach(s => s.classList.remove('active'));
}

function showHUD() {
  hideAllScreens();
  screens.hud.classList.add('active');
}

function showModal(modalName) {
  if (modals[modalName]) {
    modals[modalName].classList.add('active');
  }
}

function hideModal(modalName) {
  if (modals[modalName]) {
    modals[modalName].classList.remove('active');
  }
}

function hideAllModals() {
  Object.values(modals).forEach(m => m.classList.remove('active'));
}

// =====================================================
// SERVER CONNECTION
// =====================================================
let socket = null;

function getServerURL() {
  // PRODUCTION: Set your Render server URL here
  const SERVER_URL = 'https://battle-cars-arena-server.onrender.com';
  
  // If SERVER_URL is still the placeholder, use localhost for development
  if (SERVER_URL.includes('your-render-server-url')) {
    const hostname = window.location.hostname;
    const port = window.location.port || '3000';
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}:${port}`;
    }
    return window.location.origin;
  }
  
  return SERVER_URL;
}

function connectToServer() {
  if (socket && socket.connected) return socket;
  
  const SERVER_URL = getServerURL();
  console.log('Connecting to server:', SERVER_URL);
  
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10
  });
  
  setupSocketHandlers(socket);
  return socket;
}

// =====================================================
// SOCKET EVENT HANDLERS
// =====================================================
function setupSocketHandlers(socket) {
  // Connection
  socket.on('connect', () => {
    console.log('Connected to server:', socket.id);
    UI.isConnected = true;
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    UI.isConnected = false;
    showError('Disconnected from server');
  });

  // Joined room
  socket.on('joinedRoom', (data) => {
    console.log('Joined room:', data.roomCode);
    UI.roomCode = data.roomCode;
    UI.isCreator = data.config.creator === socket.id;
    UI.playerData = data.player;
    UI.players = data.otherPlayers || [];
    
    // Update players list
    UI.playersList.clear();
    UI.playersList.set(data.player.id, data.player);
    data.otherPlayers?.forEach(p => UI.playersList.set(p.id, p));
    
    // Show lobby screen
    showScreen('lobby');
    updateLobbyUI(data.roomCode, data.config);
  });

  // Player joined
  socket.on('playerJoined', (playerData) => {
    console.log('Player joined:', playerData.name);
    UI.playersList.set(playerData.id, playerData);
    updatePlayersList();
  });

  // Player left
  socket.on('playerLeft', (data) => {
    const id = typeof data === 'string' ? data : data.id;
    const name = typeof data === 'string' ? 'Player' : data.name;
    console.log('Player left:', name);
    UI.playersList.delete(id);
    updatePlayersList();
  });

  // Players list update
  socket.on('playersList', (players) => {
    UI.playersList.clear();
    players.forEach(p => UI.playersList.set(p.id, p));
    updatePlayersList();
  });

  // Score update
  socket.on('scoreUpdate', (scores) => {
    UI.scores = scores;
    updateScoreboard();
  });

  // Health update
  socket.on('healthUpdate', (data) => {
    if (data.id === UI.playerData?.id) {
      UI.health = data.health;
      updateHealthBar();
    }
  });

  // Game started
  socket.on('gameStarted', (data) => {
    console.log('Game started!', data);
    startGame(data);
  });

  // Game over
  socket.on('gameOver', (data) => {
    console.log('Game over!', data);
    showGameOver(data);
  });

  // Timer update
  socket.on('timerUpdate', (seconds) => {
    UI.timer = seconds;
    updateTimerDisplay();
  });

  // Loot update
  socket.on('lootUpdate', (data) => {
    if (gameScene) {
      gameScene.updateLootSpots(data.lootSpots);
    }
  });

  // Player moved
  socket.on('playerMove', (data) => {
    if (gameScene && data.id !== UI.playerData?.id) {
      gameScene.updateRemotePlayer(data);
    }
  });

  // Weapon fired
  socket.on('weaponFired', (data) => {
    if (gameScene && data.id !== UI.playerData?.id) {
      gameScene.showRemoteWeaponFire(data);
    }
  });

  // Mine placed
  socket.on('minePlaced', (data) => {
    if (gameScene && data.id !== UI.playerData?.id) {
      gameScene.showRemoteMine(data);
    }
  });

  // Explosion
  socket.on('explosion', (data) => {
    if (gameScene) {
      gameScene.showExplosion(data);
    }
  });

  // Player respawned
  socket.on('playerRespawned', (data) => {
    if (gameScene) {
      gameScene.respawnPlayer(data);
    }
  });

  // State reset
  socket.on('stateReset', (players) => {
    // Keep global state updated before scene initializes
    if (window.gameState) {
      window.gameState.playersList = players;
      const myData = players.find(p => p.id === socket.id);
      if (myData) {
        window.gameState.playerData = myData;
        UI.playerData = myData;
      }
    }
    
    if (gameScene && typeof gameScene.resetState === 'function') {
      gameScene.resetState(players);
    }
  });

  // Creator changed
  socket.on('creatorChanged', (data) => {
    UI.isCreator = data.id === socket.id;
    updateLobbyCreatorUI();
  });

  // Error
  socket.on('error', (data) => {
    const message = typeof data === 'string' ? data : data.message;
    showError(message);
  });
}

// =====================================================
// UI UPDATE FUNCTIONS
// =====================================================
function updateLobbyUI(roomCode, config) {
  document.getElementById('room-code-display').textContent = roomCode;
  document.getElementById('max-players-display').textContent = config.maxPlayers || 24;
  document.getElementById('max-players-select').value = config.maxPlayers || 4;
  
  if (config.limitType === 'kills') {
    document.getElementById('game-mode-select').value = 'kills';
    document.getElementById('limit-value-input').value = config.limitValue || 25;
    document.getElementById('limit-value-label').textContent = 'KILL LIMIT';
  } else {
    document.getElementById('game-mode-select').value = 'time';
    document.getElementById('limit-value-input').value = Math.floor((config.limitValue || 600) / 60);
    document.getElementById('limit-value-label').textContent = 'TIME (MIN)';
  }
  
  updateLobbyCreatorUI();
  updatePlayersList();
}

function updateLobbyCreatorUI() {
  const settingsEl = document.getElementById('room-settings');
  const startBtn = document.getElementById('start-game-btn');
  
  if (settingsEl) {
    settingsEl.style.display = UI.isCreator ? 'block' : 'none';
  }
  
  if (startBtn) {
    const playerCount = UI.playersList.size;
    if (playerCount >= 1 && UI.isCreator) {
      startBtn.disabled = false;
      startBtn.classList.remove('disabled');
      document.getElementById('waiting-msg').textContent = `${playerCount} players ready`;
    } else {
      startBtn.disabled = true;
      startBtn.classList.add('disabled');
      document.getElementById('waiting-msg').textContent = 'Waiting for players...';
    }
  }
}

function updatePlayersList() {
  const listEl = document.getElementById('players-list');
  const countEl = document.getElementById('player-count');
  
  if (!listEl) return;
  
  countEl.textContent = UI.playersList.size;
  
  if (UI.playersList.size === 0) {
    listEl.innerHTML = '<li class="player-item empty">Waiting for players...</li>';
    return;
  }
  
  listEl.innerHTML = '';
  UI.playersList.forEach((player, id) => {
    const li = document.createElement('li');
    li.className = 'player-item';
    
    const avatar = document.createElement('div');
    avatar.className = 'player-avatar';
    avatar.textContent = player.name.charAt(0).toUpperCase();
    avatar.style.background = `#${player.color?.toString(16).padStart(6, '0') || '6366F1'}`;
    
    const name = document.createElement('span');
    name.className = 'player-name';
    name.textContent = player.name + (id === socket.id ? ' (You)' : '');
    
    const status = document.createElement('span');
    status.className = 'player-status ready';
    status.textContent = 'READY';
    
    li.appendChild(avatar);
    li.appendChild(name);
    li.appendChild(status);
    listEl.appendChild(li);
  });
  
  updateLobbyCreatorUI();
}

function updateScoreboard() {
  const listEl = document.getElementById('score-list');
  if (!listEl || UI.scores.length === 0) return;
  
  const sortedScores = [...UI.scores].sort((a, b) => b.kills - a.kills);
  
  listEl.innerHTML = '';
  sortedScores.forEach((player, index) => {
    const li = document.createElement('li');
    li.className = 'score-item' + (player.id === UI.playerData?.id ? ' you' : '');
    
    li.innerHTML = `
      <span class="score-rank">${index + 1}</span>
      <span class="score-name">${player.name}</span>
      <span class="score-kills">${player.kills}</span>
      <span class="score-deaths">${player.deaths || 0}</span>
    `;
    
    listEl.appendChild(li);
  });
}

function updateHealthBar() {
  const bar = document.getElementById('health-bar-fill');
  const value = document.getElementById('health-value');
  
  if (bar) {
    bar.style.width = `${UI.health}%`;
    bar.className = 'health-fill';
    if (UI.health <= 25) bar.classList.add('critical');
    else if (UI.health <= 50) bar.classList.add('warning');
  }
  
  if (value) value.textContent = Math.round(UI.health);
}

function updateWeaponDisplay() {
  const display = document.getElementById('weapon-display');
  if (display) {
    display.textContent = WEAPON_NAMES[UI.weapon] || UI.weapon;
  }
}

function updateTimerDisplay() {
  const timerEl = document.getElementById('game-timer');
  if (!timerEl) return;
  
  if (UI.gameMode === 'kills') {
    timerEl.textContent = '⚔ KILLS';
  } else {
    const minutes = Math.floor(UI.timer / 60);
    const seconds = UI.timer % 60;
    timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// =====================================================
// ERROR HANDLING
// =====================================================
let errorTimeout = null;

function showError(message) {
  const toast = document.getElementById('error-toast');
  if (!toast) return;
  
  toast.textContent = message;
  toast.classList.add('show');
  
  if (errorTimeout) clearTimeout(errorTimeout);
  errorTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// =====================================================
// GAME MANAGEMENT
// =====================================================
function startGame(data) {
  console.log('startGame called with data:', data);
  
  hideAllScreens();
  
  const mapType = data.map || 'arena';
  UI.gameMode = data.limitType || 'time';
  UI.timer = data.timer || 600;
  UI.health = 100;
  UI.weapon = 'machine_gun';
  
  // Setup global game state for the Phaser scene to read
  window.gameState = {
    socket: socket,
    playerData: UI.playerData,
    playersList: Array.from(UI.playersList.values())
  };

  // Ensure we have a reference to the active scene
  if (!gameScene) {
    gameScene = game.scene.getScene('GameScene');
  }
  
  // Restart the dormant scene passing the mapType
  console.log('Restarting GameScene with map:', mapType);
  game.scene.start('GameScene', mapType);
  
  // Display the game UI overlay
  showHUD();
  
  // Update HUD
  document.getElementById('player-name-hud').textContent = UI.playerName;
  updateHealthBar();
  updateWeaponDisplay();
  updateTimerDisplay();
  updateScoreboard();
}

function showGameOver(data) {
  console.log('Showing game over', data);
  
  // Hide HUD
  screens.hud.classList.remove('active');
  
  // Pause game scene
  if (gameScene && gameScene.scene.isActive()) {
    gameScene.scene.pause();
  }
  
  // Show game over screen
  showScreen('gameOver');
  
  // Update winner info
  const winner = data.winner;
  document.getElementById('winner-name').textContent = winner?.name || 'Draw';
  document.getElementById('winner-kills').textContent = winner ? `${winner.kills || 0} kills` : '';
  
  // Update your stats
  const yourStats = data.leaderboard?.find(p => p.id === UI.playerData?.id);
  document.getElementById('final-kills').textContent = yourStats?.kills || 0;
  document.getElementById('final-deaths').textContent = yourStats?.deaths || 0;
  document.getElementById('final-rank').textContent = yourStats ? 
    `#${data.leaderboard.findIndex(p => p.id === UI.playerData?.id) + 1}` : '#0';
  
  // Update leaderboard
  const leaderboardEl = document.getElementById('leaderboard');
  if (leaderboardEl && data.leaderboard) {
    leaderboardEl.innerHTML = '';
    data.leaderboard.slice(0, 10).forEach((player, index) => {
      const entry = document.createElement('div');
      entry.className = 'lb-entry' + (player.id === UI.playerData?.id ? ' you' : '');
      entry.innerHTML = `
        <span class="lb-rank">${index + 1}</span>
        <span class="lb-name">${player.name}</span>
        <span class="lb-kills">${player.kills}K / ${player.deaths || 0}D</span>
      `;
      leaderboardEl.appendChild(entry);
    });
  }
}

// =====================================================
// JOIN ACTIONS
// =====================================================
function joinOnline() {
  const name = UI.playerName.trim() || `Guest_${Math.floor(Math.random() * 1000)}`;
  UI.playerName = name;
  
  const s = connectToServer();
  s.emit('joinOnline', { name });
}

function createRoom() {
  const name = UI.playerName.trim() || `Guest_${Math.floor(Math.random() * 1000)}`;
  UI.playerName = name;
  
  const maxPlayers = parseInt(document.getElementById('create-max-players').value);
  const gameType = document.getElementById('create-game-type').value;
  const limitValue = gameType === 'kills' 
    ? parseInt(document.getElementById('create-limit-value').value) 
    : parseInt(document.getElementById('create-limit-value').value) * 60;
  
  const s = connectToServer();
  s.emit('createRoom', {
    name,
    maxPlayers,
    timeLimit: gameType === 'time' ? limitValue : undefined,
    killLimit: gameType === 'kills' ? limitValue : undefined,
    limitType: gameType
  });
  
  hideModal('createRoom');
}

function joinCustomRoom() {
  const code = document.getElementById('join-room-code')?.value?.trim();
  if (!code) {
    showError('Please enter a room code');
    return;
  }
  
  const name = UI.playerName.trim() || `Guest_${Math.floor(Math.random() * 1000)}`;
  UI.playerName = name;
  
  const s = connectToServer();
  s.emit('joinCustomRoom', { name, roomCode: code });
  
  hideModal('joinRoom');
}

function startGameAction() {
  if (!UI.isCreator) return;
  if (socket) {
    socket.emit('startGame');
  }
}

// =====================================================
// EVENT LISTENERS
// =====================================================
function setupEventListeners() {

// Name input
const nameInput = document.getElementById('player-name');
nameInput.addEventListener('keyup', (e) => {
  UI.playerName = e.target.value;
  if (e.key === 'Enter') {
    joinOnline();
  }
});

// Play Online
document.getElementById('play-online-btn').addEventListener('click', joinOnline);

// Create Room Modal
document.getElementById('create-room-btn').addEventListener('click', () => {
  showModal('createRoom');
});

document.getElementById('cancel-create-btn').addEventListener('click', () => {
  hideModal('createRoom');
});

document.getElementById('confirm-create-btn').addEventListener('click', createRoom);

// Game type change handler
document.getElementById('create-game-type').addEventListener('change', (e) => {
  const label = document.getElementById('create-limit-label');
  label.textContent = e.target.value === 'kills' ? 'Kill Limit' : 'Time (minutes)';
});

// Join Room Modal
document.getElementById('join-room-btn').addEventListener('click', () => {
  showModal('joinRoom');
});

document.getElementById('cancel-join-btn').addEventListener('click', () => {
  hideModal('joinRoom');
});

document.getElementById('confirm-join-btn').addEventListener('click', joinCustomRoom);

// Join room code enter key
document.getElementById('join-room-code').addEventListener('keyup', (e) => {
  if (e.key === 'Enter') {
    joinCustomRoom();
  }
});

// How to play
document.getElementById('how-to-play-btn').addEventListener('click', () => {
  showModal('howToPlay');
});

document.getElementById('close-howto-btn').addEventListener('click', () => {
  hideModal('howToPlay');
});

// Lobby
document.getElementById('leave-lobby-btn').addEventListener('click', () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  if (gameScene && gameScene.scene.isActive()) {
    gameScene.scene.stop();
  }
  showScreen('home');
});

document.getElementById('copy-code-btn').addEventListener('click', () => {
  const code = document.getElementById('room-code-display').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showError('Room code copied to clipboard!');
  });
});

// Start game
document.getElementById('start-game-btn').addEventListener('click', startGameAction);

// Game mode change in lobby
document.getElementById('game-mode-select').addEventListener('change', (e) => {
  const label = document.getElementById('limit-value-label');
  label.textContent = e.target.value === 'kills' ? 'KILL LIMIT' : 'TIME (MIN)';
});

// Apply settings
document.getElementById('apply-settings-btn').addEventListener('click', () => {
  const maxPlayers = parseInt(document.getElementById('max-players-select').value);
  const gameMode = document.getElementById('game-mode-select').value;
  const limitValue = parseInt(document.getElementById('limit-value-input').value);
  
  document.getElementById('max-players-display').textContent = maxPlayers;
  
  if (limitValue < 1) {
    showError('Invalid value');
    return;
  }
  
  showLobbySettingsApplied();
});

// Scoreboard toggle
document.getElementById('toggle-scoreboard').addEventListener('click', () => {
  const content = document.getElementById('scoreboard-content');
  const btn = document.getElementById('toggle-scoreboard');
  if (content.style.display === 'none') {
    content.style.display = 'block';
    btn.textContent = '−';
  } else {
    content.style.display = 'none';
    btn.textContent = '+';
  }
});

// Game Over actions
document.getElementById('play-again-btn').addEventListener('click', () => {
  if (gameScene && gameScene.scene.isActive()) {
    gameScene.scene.stop();
  }
  
  // Reconnect and create new room
  const s = connectToServer();
  s.emit('createRoom', {
    name: UI.playerName,
    maxPlayers: 24,
    timeLimit: 600,
    limitType: 'time'
  });
});

document.getElementById('back-to-menu-btn').addEventListener('click', () => {
  if (gameScene && gameScene.scene.isActive()) {
    gameScene.scene.stop();
  }
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  showScreen('home');
});

// Close modals on background click
Object.values(modals).forEach(modal => {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
    }
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hideAllModals();
  }
});
}

// =====================================================
// INITIALIZE
// =====================================================
function init() {
  setupEventListeners();
  
  // Generate random name if empty
  if (!UI.playerName) {
    const randomName = `Player_${Math.floor(Math.random() * 1000)}`;
    document.getElementById('player-name').value = randomName;
    UI.playerName = randomName;
  }
  
  // Start background particles
  initParticles();
  
  console.log('Battle Cars Arena initialized');
}

// =====================================================
// BACKGROUND PARTICLES
// =====================================================
function initParticles() {
  const canvas = document.getElementById('bg-particles');
  const ctx = canvas.getContext('2d');
  
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const particles = [];
  const count = 50;
  
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      opacity: Math.random() * 0.5 + 0.1
    });
  }
  
  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    particles.forEach(p => {
      p.x += p.speedX;
      p.y += p.speedY;
      
      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width) p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
      
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
      ctx.fill();
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

function showLobbySettingsApplied() {
  showError('Settings applied! Starting game when ready.');
}

// Start the app
init();