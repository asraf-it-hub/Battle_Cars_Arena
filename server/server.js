/**
 * Battle Cars Arena - Server
 * Node.js + Express + Socket.io multiplayer game server
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

const PORT = process.env.PORT || 3000;

// MongoDB connection
const connectDB = async () => {
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log('Connected to MongoDB');
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
  }
};

connectDB();

// =====================================================
// GAME CONFIGURATION
// =====================================================
const GAME_CONFIG = {
  MAP_WIDTH: 2000,
  MAP_HEIGHT: 2000,
  MAX_PLAYERS_ONLINE: 24,
  DEFAULT_TIME_LIMIT: 600, // 10 minutes
  DEFAULT_KILL_LIMIT: 25,
  RESPAWN_TIME: 3000,
  LOOT_RESPAWN_TIME: 10000,
  BASE_DAMAGE: 15,
  BULLET_SPEED: 800,
  PLAYER_HEALTH: 100,
  PLAYER_SPEED: 350,
  PLAYER_SLOW_SPEED: 100
};

// =====================================================
// WEAPON DEFINITIONS
// =====================================================
const WEAPONS = {
  // Auto-aim weapons
  machine_gun: {
    name: 'Machine Gun',
    type: 'auto',
    damage: 10,
    cooldown: 200,
    ammo: 50,
    bulletSpeed: 800,
    bulletCount: 1,
    spread: 0.1,
    color: 0x06B6D4,
    radius: 400
  },
  shotgun: {
    name: 'Shotgun',
    type: 'auto',
    damage: 8,
    cooldown: 800,
    ammo: 20,
    bulletSpeed: 700,
    bulletCount: 5,
    spread: 0.3,
    color: 0xF59E0B,
    radius: 300
  },
  smg: {
    name: 'SMG',
    type: 'auto',
    damage: 7,
    cooldown: 100,
    ammo: 60,
    bulletSpeed: 750,
    bulletCount: 1,
    spread: 0.15,
    color: 0x10B981,
    radius: 350
  },
  laser: {
    name: 'Laser',
    type: 'auto',
    damage: 15,
    cooldown: 300,
    ammo: 30,
    bulletSpeed: 1200,
    bulletCount: 1,
    spread: 0,
    color: 0xEF4444,
    radius: 500
  },
  dual_gun: {
    name: 'Dual Gun',
    type: 'auto',
    damage: 12,
    cooldown: 250,
    ammo: 40,
    bulletSpeed: 850,
    bulletCount: 2,
    spread: 0.2,
    color: 0x8B5CF6,
    radius: 350
  },
  // Manual-aim weapons
  rocket_launcher: {
    name: 'Rocket Launcher',
    type: 'manual',
    damage: 50,
    cooldown: 1500,
    ammo: 5,
    bulletSpeed: 400,
    bulletCount: 1,
    spread: 0,
    color: 0xEF4444,
    explosionRadius: 100
  },
  bomb_launcher: {
    name: 'Bomb Launcher',
    type: 'manual',
    damage: 40,
    cooldown: 1200,
    ammo: 8,
    bulletSpeed: 500,
    bulletCount: 1,
    spread: 0.05,
    color: 0xFF6B00,
    explosionRadius: 80
  },
  grenade_launcher: {
    name: 'Grenade Launcher',
    type: 'manual',
    damage: 35,
    cooldown: 1000,
    ammo: 10,
    bulletSpeed: 450,
    bulletCount: 1,
    spread: 0.1,
    color: 0x22C55E,
    explosionRadius: 70
  },
  cannon: {
    name: 'Cannon',
    type: 'manual',
    damage: 45,
    cooldown: 2000,
    ammo: 6,
    bulletSpeed: 350,
    bulletCount: 1,
    spread: 0,
    color: 0xF59E0B,
    explosionRadius: 120
  },
  mine: {
    name: 'Mine',
    type: 'manual',
    damage: 60,
    cooldown: 500,
    ammo: 3,
    bulletSpeed: 0,
    bulletCount: 1,
    spread: 0,
    color: 0x6B7280,
    explosionRadius: 60
  }
};

// =====================================================
// MAP DEFINITIONS
// =====================================================
const MAPS = {
  arena: {
    name: 'Arena',
    bgColors: [0x0F172A, 0x1E293B],
    wallColor: 0x374151,
    lootSpots: [
      { id: 1, x: 300, y: 300 },
      { id: 2, x: 1700, y: 300 },
      { id: 3, x: 300, y: 1700 },
      { id: 4, x: 1700, y: 1700 },
      { id: 5, x: 1000, y: 1000 },
      { id: 6, x: 600, y: 600 },
      { id: 7, x: 1400, y: 600 },
      { id: 8, x: 600, y: 1400 },
      { id: 9, x: 1400, y: 1400 },
      { id: 10, x: 1000, y: 300 },
      { id: 11, x: 1000, y: 1700 },
      { id: 12, x: 300, y: 1000 },
      { id: 13, x: 1700, y: 1000 }
    ],
    obstacles: [
      { x: 500, y: 500, w: 80, h: 80 },
      { x: 1420, y: 500, w: 80, h: 80 },
      { x: 500, y: 1420, w: 80, h: 80 },
      { x: 1420, y: 1420, w: 80, h: 80 },
      { x: 950, y: 950, w: 100, h: 100 },
      { x: 200, y: 1000, w: 40, h: 200 },
      { x: 1760, y: 1000, w: 40, h: 200 },
      { x: 1000, y: 200, w: 200, h: 40 },
      { x: 1000, y: 1760, w: 200, h: 40 }
    ],
    respawnPoints: [
      { x: 100, y: 100 },
      { x: 1900, y: 100 },
      { x: 100, y: 1900 },
      { x: 1900, y: 1900 }
    ]
  },
  desert: {
    name: 'Desert',
    bgColors: [0x78350F, 0x92400E],
    wallColor: 0xA16207,
    lootSpots: [
      { id: 1, x: 400, y: 400 },
      { id: 2, x: 1600, y: 400 },
      { id: 3, x: 400, y: 1600 },
      { id: 4, x: 1600, y: 1600 },
      { id: 5, x: 1000, y: 1000 },
      { id: 6, x: 700, y: 700 },
      { id: 7, x: 1300, y: 700 },
      { id: 8, x: 700, y: 1300 },
      { id: 9, x: 1300, y: 1300 },
      { id: 10, x: 1000, y: 500 },
      { id: 11, x: 1000, y: 1500 }
    ],
    obstacles: [
      { x: 300, y: 800, w: 100, h: 100, type: 'rock' },
      { x: 1600, y: 800, w: 100, h: 100, type: 'rock' },
      { x: 800, y: 300, w: 100, h: 100, type: 'rock' },
      { x: 800, y: 1600, w: 100, h: 100, type: 'rock' },
      { x: 1000, y: 1000, w: 150, h: 150, type: 'rock' }
    ],
    respawnPoints: [
      { x: 100, y: 100 },
      { x: 1900, y: 100 },
      { x: 100, y: 1900 },
      { x: 1900, y: 1900 },
      { x: 500, y: 500 },
      { x: 1500, y: 1500 }
    ]
  }
};

const RESPAWN_MAP_ORDER = ['arena', 'desert'];

// =====================================================
// ROOM MANAGEMENT
// =====================================================
const rooms = new Map();

// Generate unique short room code
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Initialize room state
function createRoom(code, config = {}) {
  const mapName = config.map || RESPAWN_MAP_ORDER[Math.floor(Math.random() * RESPAWN_MAP_ORDER.length)];
  const mapConfig = MAPS[mapName];
  
  // Initialize loot spots
  const lootSpots = mapConfig.lootSpots.map(spot => ({
    id: spot.id,
    x: spot.x,
    y: spot.y,
    type: getRandomWeaponType(),
    active: true,
    respawnTime: null
  }));

  const room = {
    code,
    players: new Map(),
    config: {
      isPrivate: config.isPrivate || false,
      maxPlayers: config.maxPlayers || 24,
      limitType: config.limitType || 'time',
      limitValue: config.limitValue || GAME_CONFIG.DEFAULT_TIME_LIMIT,
      creator: config.creator || null,
      map: mapName,
      started: false,
      ...config
    },
    gameState: {
      timer: config.limitType === 'time' ? config.limitValue || GAME_CONFIG.DEFAULT_TIME_LIMIT : 0,
      killLeader: null,
      started: false,
      endEvent: null,
      lootSpots: lootSpots.map(s => ({ ...s })),
      projectiles: []
    }
  };

  rooms.set(code, room);
  return room;
}

// Random weapon type selection
function getRandomWeaponType() {
  const weaponTypes = Object.keys(WEAPONS);
  return weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
}

// =====================================================
// PLAYER MANAGEMENT
// =====================================================
const PLAYER_COLORS = [
  0x6366F1, 0x8B5CF6, 0xEF4444, 0xF59E0B,
  0x10B981, 0x06B6D4, 0xEC4899, 0x14B8A6,
  0xF97316, 0x64748B, 0x84CC16, 0x22D3EE
];

function createPlayerData(socketId, name, roomCode) {
  const room = rooms.get(roomCode);
  const mapConfig = MAPS[room.config.map];
  const respawnPoint = mapConfig.respawnPoints[Math.floor(Math.random() * mapConfig.respawnPoints.length)];
  
  return {
    id: socketId,
    name: name || 'Guest',
    color: PLAYER_COLORS[rooms.get(roomCode).players.size % PLAYER_COLORS.length],
    x: respawnPoint.x + (Math.random() * 100 - 50),
    y: respawnPoint.y + (Math.random() * 100 - 50),
    angle: 0,
    velocity: 0,
    health: GAME_CONFIG.PLAYER_HEALTH,
    maxHealth: GAME_CONFIG.PLAYER_HEALTH,
    kills: 0,
    deaths: 0,
    weapon: 'machine_gun',
    ammo: WEAPONS.machine_gun.ammo,
    lastFire: 0,
    alive: true,
    speed: GAME_CONFIG.PLAYER_SPEED
  };
}

function findPlayerRoom(socketId) {
  for (const [code, room] of rooms.entries()) {
    if (room.players.has(socketId)) {
      return { roomCode: code, room, player: room.players.get(socketId) };
    }
  }
  return null;
}

function getPublicRooms() {
  const publicRooms = [];
  for (const [code, room] of rooms.entries()) {
    if (!room.config.isPrivate && !room.gameState.started && room.players.size < room.config.maxPlayers) {
      publicRooms.push({
        code,
        players: room.players.size,
        maxPlayers: room.config.maxPlayers,
        map: room.config.map
      });
    }
  }
  return publicRooms;
}

// =====================================================
// SOCKET.IO EVENT HANDLERS
// =====================================================
io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Join online matchmaking
  socket.on('joinOnline', (data) => {
    const { name } = data || {};
    let targetRoom = null;

    // Find available public room
    for (const [code, room] of rooms.entries()) {
      if (!room.config.isPrivate && !room.gameState.started && room.players.size < room.config.maxPlayers) {
        targetRoom = room;
        break;
      }
    }

    // Create new public room if none available
    if (!targetRoom) {
      const roomCode = generateRoomCode();
      targetRoom = createRoom(roomCode, { isPrivate: false, maxPlayers: 24 });
    }

    joinRoom(socket, targetRoom.code, name);
  });

  // Create custom room
  socket.on('createRoom', (data) => {
    const { name, maxPlayers, timeLimit, killLimit, limitType } = data || {};
    const roomCode = generateRoomCode();
    
    const limitTypeUsed = limitType || (killLimit ? 'kills' : 'time');
    const limitValue = limitTypeUsed === 'kills' ? (killLimit || 25) : (timeLimit || 600);
    
    createRoom(roomCode, {
      isPrivate: true,
      maxPlayers: maxPlayers || 4,
      limitType: limitTypeUsed,
      limitValue,
      creator: socket.id
    });

    joinRoom(socket, roomCode, name);
  });

  // Join custom room
  socket.on('joinCustomRoom', (data) => {
    const { name, roomCode: code } = data || {};
    const normalizedCode = (code || '').toUpperCase().trim();
    
    const room = rooms.get(normalizedCode);
    
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }
    
    if (room.players.size >= room.config.maxPlayers) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }
    
    if (room.gameState.started) {
      socket.emit('error', { message: 'Game already in progress' });
      return;
    }
    
    joinRoom(socket, normalizedCode, name);
  });

  // Start game (room creator only)
  socket.on('startGame', () => {
    const playerInfo = findPlayerRoom(socket.id);
    if (!playerInfo) return;
    
    const room = playerInfo.room;
    if (room.config.creator !== socket.id) return;
    if (room.players.size < 1) {
      socket.emit('error', { message: 'Need at least 1 player' });
      return;
    }
    
    startGame(room.code);
  });

  // Player movement
  socket.on('playerMove', (data) => {
    const playerInfo = findPlayerRoom(socket.id);
    if (!playerInfo || !playerInfo.player.alive) return;
    
    const { x, y, angle, velocity, drift } = data || {};
    const player = playerInfo.player;
    
    player.x = x;
    player.y = y;
    player.angle = angle;
    player.velocity = velocity;
    player.drift = drift || false;
    
    socket.to(playerInfo.roomCode).emit('playerMove', {
      id: socket.id,
      x,
      y,
      angle,
      velocity,
      drift: player.drift
    });
  });

  // Fire weapon
  socket.on('fireWeapon', (data) => {
    const playerInfo = findPlayerRoom(socket.id);
    if (!playerInfo || !playerInfo.player.alive) return;
    
    const { angle, autoTarget } = data || {};
    const player = playerInfo.player;
    const weapon = WEAPONS[player.weapon];
    const now = Date.now();
    
    if (!weapon) return;
    
    // Check cooldown
    if (now - player.lastFire < weapon.cooldown) return;
    
    player.lastFire = now;
    
    const fireAngle = autoTarget !== undefined ? autoTarget : angle;
    
    // Calculate fire angle with spread
    const spreadOffset = (Math.random() - 0.5) * weapon.spread;
    const finalAngle = fireAngle + spreadOffset;
    
    // Create projectiles
    const projectiles = [];
    for (let i = 0; i < weapon.bulletCount; i++) {
      const projectileSpread = (i - (weapon.bulletCount - 1) / 2) * (weapon.spread || 0);
      const projAngle = fireAngle + projectileSpread;
      
      projectiles.push({
        id: `proj_${socket.id}_${now}_${i}`,
        x: player.x + Math.cos(player.angle) * 30,
        y: player.y + Math.sin(player.angle) * 30,
        angle: projAngle,
        speed: weapon.bulletSpeed,
        damage: weapon.damage,
        owner: socket.id,
        ownerName: player.name,
        weaponType: player.weapon,
        color: weapon.color,
        explosionRadius: weapon.explosionRadius || 0,
        createdAt: now
      });
    }
    
    playerInfo.room.gameState.projectiles.push(...projectiles);
    
    socket.to(playerInfo.roomCode).emit('weaponFired', {
      id: socket.id,
      weapon: player.weapon,
      projectiles
    });
  });

  // Mine placement (special manual weapon)
  socket.on('placeMine', () => {
    const playerInfo = findPlayerRoom(socket.id);
    if (!playerInfo || !playerInfo.player.alive) return;
    
    const player = playerInfo.player;
    const now = Date.now();
    
    if (now - player.lastFire < WEAPONS.mine.cooldown) return;
    player.lastFire = now;
    
    const mine = {
      id: `mine_${socket.id}_${now}`,
      x: player.x,
      y: player.y,
      angle: 0,
      speed: 0,
      damage: WEAPONS.mine.damage,
      owner: socket.id,
      ownerName: player.name,
      weaponType: 'mine',
      color: WEAPONS.mine.color,
      explosionRadius: WEAPONS.mine.explosionRadius,
      createdAt: now,
      stationary: true
    };
    
    playerInfo.room.gameState.projectiles.push(mine);
    
    socket.to(playerInfo.roomCode).emit('minePlaced', {
      id: socket.id,
      projectile: mine
    });
  });

  // Pickup loot
  socket.on('pickupLoot', (data) => {
    const playerInfo = findPlayerRoom(socket.id);
    if (!playerInfo || !playerInfo.player.alive) return;
    
    const room = playerInfo.room;
    const { lootId } = data || {};
    const player = playerInfo.player;
    const now = Date.now();
    
    const lootSpot = room.gameState.lootSpots.find(s => s.id === lootId);
    if (!lootSpot || !lootSpot.active) return;
    
    // Check distance
    const dist = Math.sqrt(
      Math.pow(player.x - lootSpot.x, 2) + Math.pow(player.y - lootSpot.y, 2)
    );
    if (dist > 60) return;
    
    // Pickup weapon
    player.weapon = lootSpot.type;
    player.ammo = WEAPONS[lootSpot.type].ammo;
    
    // Deactivate spot and schedule respawn
    lootSpot.active = false;
    lootSpot.respawnTime = now + GAME_CONFIG.LOOT_RESPAWN_TIME;
    
    // Notify all players in room
    io.to(room.code).emit('lootUpdate', {
      lootSpots: room.gameState.lootSpots.map(s => ({
        id: s.id,
        x: s.x,
        y: s.y,
        type: s.type,
        active: s.active,
        respawnTime: s.respawnTime
      }))
    });
  });

  // Bullet hit notification (from client collision)
  socket.on('bulletHit', (data) => {
    const { victimId, damage, projectileId } = data || {};
    
    const victimInfo = findPlayerRoom(victimId);
    const attackerInfo = findPlayerRoom(socket.id);
    
    if (!victimInfo || !attackerInfo || victimInfo.roomCode !== attackerInfo.roomCode) return;
    
    hitPlayer(attackerInfo.roomCode, victimId, socket.id, damage);
  });

  // Explosion damage
  socket.on('explosionHit', (data) => {
    const { victimId, damage } = data || {};
    const victimInfo = findPlayerRoom(victimId);
    const attackerInfo = findPlayerRoom(socket.id);
    
    if (!victimInfo || !attackerInfo || victimInfo.roomCode !== attackerInfo.roomCode) return;
    
    hitPlayer(attackerInfo.roomCode, victimId, socket.id, damage);
  });

  // Chat message
  socket.on('chat', (data) => {
    const playerInfo = findPlayerRoom(socket.id);
    if (!playerInfo) return;
    
    const { message } = data || {};
    io.to(playerInfo.roomCode).emit('chat', {
      id: socket.id,
      name: playerInfo.player.name,
      message: (message || '').substring(0, 100)
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    const playerInfo = findPlayerRoom(socket.id);
    if (!playerInfo) return;
    
    const room = playerInfo.room;
    room.players.delete(socket.id);
    
    // Notify others
    socket.to(room.code).emit('playerLeft', {
      id: socket.id,
      name: playerInfo.player.name
    });
    
    // Update player list
    io.to(room.code).emit('playersList', Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      kills: p.kills,
      health: p.health,
      alive: p.alive
    })));
    
    // Remove empty rooms
    if (room.players.size === 0) {
      rooms.delete(room.code);
    } else if (room.config.creator === socket.id) {
      // Transfer creator role
      const newCreator = room.players.values().next().value;
      if (newCreator) {
        room.config.creator = newCreator.id;
        io.to(room.code).emit('creatorChanged', { id: newCreator.id });
      }
    }
    
    // Check if game should end (only one player left)
    const alivePlayers = Array.from(room.players.values()).filter(p => p.alive);
    if (alivePlayers.length <= 1 && room.gameState.started) {
      if (alivePlayers.length === 1) {
        endGame(room.code, alivePlayers[0]);
      } else {
        // Everyone dead simultaneously, or all disconnected
        endGame(room.code, null);
      }
    }
  });
});

// =====================================================
// GAME LOGIC FUNCTIONS
// =====================================================

// Join room function
function joinRoom(socket, roomCode, name) {
  const room = rooms.get(roomCode);
  if (!room) {
    socket.emit('error', { message: 'Room not found' });
    return;
  }
  
  // Create player
  const player = createPlayerData(socket.id, name, roomCode);
  room.players.set(socket.id, player);
  
  // Join socket room
  socket.join(roomCode);
  
  // Send room info to player
  socket.emit('joinedRoom', {
    roomCode,
    config: room.config,
    player,
    otherPlayers: Array.from(room.players.values())
      .filter(p => p.id !== socket.id)
      .map(p => ({ ...p, color: p.color }))
  });
  
  // Send loot state
  socket.emit('lootUpdate', {
    lootSpots: room.gameState.lootSpots.map(s => ({
      id: s.id,
      x: s.x,
      y: s.y,
      type: s.type,
      active: s.active,
      respawnTime: s.respawnTime
    }))
  });
  
  // Notify others
  socket.to(roomCode).emit('playerJoined', player);
  
  // Update player list for all
  io.to(roomCode).emit('playersList', Array.from(room.players.values()).map(p => ({
    id: p.id,
    name: p.name,
    kills: p.kills,
    health: p.health,
    alive: p.alive
  })));
  
  // If game is already started, send state
  if (room.gameState.started) {
    socket.emit('gameStarted', { map: room.config.map });
  }
}

// Start game
function startGame(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  room.gameState.started = true;
  room.gameState.timer = room.config.limitType === 'time' ? room.config.limitValue : 0;
  
  io.to(roomCode).emit('gameStarted', {
    map: room.config.map,
    timer: room.gameState.timer,
    limitType: room.config.limitType,
    limitValue: room.config.limitValue
  });
  
  // Reset all players
  resetPlayers(room);
  
  console.log(`Game started in room ${roomCode} with ${room.players.size} players`);
}

// End game
function endGame(roomCode, winner) {
  const room = rooms.get(roomCode);
  if (!room || room.gameState.endEvent) return;
  
  room.gameState.endEvent = true;
  
  // Sort leaderboard
  const leaderboard = Array.from(room.players.values())
    .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)
    .map(p => ({
      id: p.id,
      name: p.name,
      kills: p.kills,
      deaths: p.deaths,
      color: p.color
    }));
  
  io.to(roomCode).emit('gameOver', {
    winner: winner ? { id: winner.id, name: winner.name, color: winner.color } : null,
    leaderboard,
    totalPlayers: room.players.size
  });
}

// Reset players for new game
function resetPlayers(room) {
  const mapConfig = MAPS[room.config.map];
  
  room.players.forEach(player => {
    const respawnPoint = mapConfig.respawnPoints[Math.floor(Math.random() * mapConfig.respawnPoints.length)];
    player.x = respawnPoint.x + (Math.random() * 100 - 50);
    player.y = respawnPoint.y + (Math.random() * 100 - 50);
    player.angle = 0;
    player.health = GAME_CONFIG.PLAYER_HEALTH;
    player.alive = true;
    player.kills = 0;
    player.deaths = 0;
    player.weapon = 'machine_gun';
    player.ammo = WEAPONS.machine_gun.ammo;
    player.lastFire = 0;
    player.deaths = 0;
  });
  
  // Reset loot
  room.gameState.lootSpots.forEach(spot => {
    spot.type = getRandomWeaponType();
    spot.active = true;
    spot.respawnTime = null;
  });
  
  // Clear projectiles
  room.gameState.projectiles = [];
  
  // Sync state
  io.to(room.code).emit('stateReset', Array.from(room.players.values()));
}

// Hit player
function hitPlayer(roomCode, victimId, attackerId, damage) {
  const now = Date.now();
  const room = rooms.get(roomCode);
  if (!room) return;
  
  const victim = room.players.get(victimId);
  const attacker = room.players.get(attackerId);
  
  if (!victim || !attacker) return;
  if (!victim.alive) return;
  
  // Apply damage
  victim.health = Math.max(0, victim.health - damage);
  
  // Notify all players of health change
  io.to(roomCode).emit('healthUpdate', {
    id: victimId,
    health: victim.health
  });
  
  // Check for death
  if (victim.health <= 0) {
    victim.alive = false;
    victim.deaths++;
    attacker.kills++;
    
    // Update score
    io.to(roomCode).emit('scoreUpdate', Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      kills: p.kills,
      deaths: p.deaths
    })));
    
    // Check kill limit
    if (room.config.limitType === 'kills' && attacker.kills >= room.config.limitValue) {
      endGame(roomCode, attacker);
      return;
    }
    
    // Respawn after delay
    setTimeout(() => {
      respawnPlayer(roomCode, victimId);
    }, GAME_CONFIG.RESPAWN_TIME);
  }
}

// Respawn player
function respawnPlayer(roomCode, playerId) {
  const room = rooms.get(roomCode);
  if (!room) return;
  
  const player = room.players.get(playerId);
  if (!player) return;
  
  const mapConfig = MAPS[room.config.map];
  const respawnPoint = mapConfig.respawnPoints[Math.floor(Math.random() * mapConfig.respawnPoints.length)];
  
  player.x = respawnPoint.x + (Math.random() * 100 - 50);
  player.y = respawnPoint.y + (Math.random() * 100 - 50);
  player.health = GAME_CONFIG.PLAYER_HEALTH;
  player.alive = true;
  player.weapon = 'machine_gun';
  player.ammo = WEAPONS.machine_gun.ammo;
  
  io.to(roomCode).emit('playerRespawned', {
    id: playerId,
    x: player.x,
    y: player.y,
    health: player.health
  });
}

// =====================================================
// SERVER GAME LOOP (runs at 60 FPS equivalent)
// =====================================================
const TICK_RATE = 50; // 50ms = 20 ticks per second

setInterval(() => {
  for (const [code, room] of rooms.entries()) {
    if (!room.gameState.started || room.gameState.endEvent) continue;
    
    const tickResult = processGameTick(room);
    
    // Send updates to clients if needed
    if (tickResult.healthUpdates.length > 0) {
      tickResult.healthUpdates.forEach(update => {
        io.to(code).emit('healthUpdate', update);
      });
    }
    
    if (tickResult.projectileUpdates.length > 0) {
      io.to(code).emit('projectileUpdate', tickResult.projectileUpdates);
    }
  }
}, TICK_RATE);

// Process game tick
function processGameTick(room) {
  const healthUpdates = [];
  const projectileUpdates = [];
  const expiredProjectiles = [];
  
  // Update projectiles
  room.gameState.projectiles = room.gameState.projectiles.filter(proj => {
    // Mine doesn't move
    if (proj.stationary) return true;
    
    // Move projectile
    if (proj.speed > 0) {
      proj.x += Math.cos(proj.angle) * (proj.speed * (TICK_RATE / 1000));
      proj.y += Math.sin(proj.angle) * (proj.speed * (TICK_RATE / 1000));
    }
    
    // Check bounds
    if (proj.x < 0 || proj.x > GAME_CONFIG.MAP_WIDTH || 
        proj.y < 0 || proj.y > GAME_CONFIG.MAP_HEIGHT) {
      expiredProjectiles.push(proj.id);
      return false;
    }
    
    // Check lifetime
    const age = Date.now() - proj.createdAt;
    if (proj.weaponType === 'mine') {
      // Mines last 30 seconds
      if (age > 30000) {
        expiredProjectiles.push(proj.id);
        return false;
      }
      // Check if anyone is nearby (trigger mine)
      for (const [id, player] of room.players.entries()) {
        if (id === proj.owner || !player.alive) continue;
        const dist = Math.sqrt(
          Math.pow(player.x - proj.x, 2) + Math.pow(player.y - proj.y, 2)
        );
        if (dist < 40) {
          explodeProjectile(room, proj);
          expiredProjectiles.push(proj.id);
          return false;
        }
      }
    } else {
      // Normal projectiles last 3 seconds
      if (age > 3000) {
        expiredProjectiles.push(proj.id);
        return false;
      }
      
      // Check collision with players
      for (const [id, player] of room.players.entries()) {
        if (id === proj.owner || !player.alive) continue;
        const dist = Math.sqrt(
          Math.pow(player.x - proj.x, 2) + Math.pow(player.y - proj.y, 2)
        );
        if (dist < 25) {
          if (proj.explosionRadius > 0) {
            explodeProjectile(room, proj);
          } else {
            hitPlayer(room.code, id, proj.owner, proj.damage);
          }
          expiredProjectiles.push(proj.id);
          return false;
        }
      }
      
      // Check collision with obstacles
      const mapConfig = MAPS[room.config.map];
      for (const obs of mapConfig.obstacles) {
        if (proj.x > obs.x - obs.w/2 && proj.x < obs.x + obs.w/2 &&
            proj.y > obs.y - obs.h/2 && proj.y < obs.y + obs.h/2) {
          if (proj.explosionRadius > 0) {
            explodeProjectile(room, proj, true);
          }
          expiredProjectiles.push(proj.id);
          return false;
        }
      }
    }
    
    return true;
  });
  
  // Update loot respawns
  room.gameState.lootSpots.forEach(spot => {
    if (!spot.active && spot.respawnTime && Date.now() >= spot.respawnTime) {
      spot.active = true;
      spot.type = getRandomWeaponType();
      spot.respawnTime = null;
      
      io.to(room.code).emit('lootUpdate', {
        lootSpots: room.gameState.lootSpots.map(s => ({
          id: s.id,
          x: s.x,
          y: s.y,
          type: s.type,
          active: s.active,
          respawnTime: s.respawnTime
        }))
      });
    }
  });
  
  return { healthUpdates, projectileUpdates };
}

// Explode projectile (AOE damage)
function explodeProjectile(room, proj, hitWall = false) {
  const radius = proj.explosionRadius || 100;
  
  io.to(room.code).emit('explosion', {
    x: proj.x,
    y: proj.y,
    radius,
    color: proj.color
  });
  
  // Damage nearby players
  let bestTarget = null;
  let bestTargetDist = Infinity;
  
  for (const [id, player] of room.players.entries()) {
    const dist = Math.sqrt(
      Math.pow(player.x - proj.x, 2) + Math.pow(player.y - proj.y, 2)
    );
    if (dist <= radius + 20 && player.alive) {
      // Damage falls off with distance
      const damageFalloff = 1 - (dist / (radius + 20));
      const damage = Math.round(proj.damage * damageFalloff);
      hitPlayer(room.code, id, proj.owner, damage);
      
      // Track who was closest for kill credit
      if (dist < bestTargetDist) {
        bestTargetDist = dist;
        bestTarget = id;
      }
    }
  }
}

// =====================================================
// TIMER UPDATE LOOP (every second)
// =====================================================
setInterval(() => {
  for (const [code, room] of rooms.entries()) {
    if (!room.gameState.started || room.gameState.endEvent) continue;
    
    if (room.config.limitType === 'time' && room.gameState.timer > 0) {
      room.gameState.timer--;
      
      io.to(code).emit('timerUpdate', room.gameState.timer);
      
      if (room.gameState.timer <= 0) {
        // Time's up, find winner
        const sorted = Array.from(room.players.values())
          .sort((a, b) => b.kills - a.kills);
        endGame(code, sorted.length > 0 ? sorted[0] : null);
      }
    }
  }
}, 1000);

// =====================================================
// HELPER: Send public rooms list
// =====================================================
setInterval(() => {
  const publicRooms = getPublicRooms();
  // This could be emitted to all connected clients who are browsing
}, 5000);

// =====================================================
// PUBLIC ROUTES
// =====================================================
app.get('/api/rooms', (req, res) => {
  res.json(getPublicRooms());
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: rooms.size,
    players: Array.from(rooms.values()).reduce((sum, r) => sum + r.players.size, 0),
    uptime: process.uptime()
  });
});

// =====================================================
// START SERVER
// =====================================================
httpServer.listen(PORT, () => {
  console.log(`Battle Cars Arena server running on port ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
});

export { io, httpServer, app };