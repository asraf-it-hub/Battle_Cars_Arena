/**
 * Battle Cars Arena - Game Scene
 * Phaser.js game scene with complete game logic, player controls,
 * weapon systems, map rendering, and collision detection
 */

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene');
    
    // Player references
    this.localPlayer = null;
    this.remotePlayers = new Map();
    
    // Game objects
    this.bullets = null;
    this.mines = null;
    this.wallGroup = null;
    this.lootGroup = null;
    this.explosions = null;
    
    // Input state
    this.keys = null;
    this.spaceKey = null;
    this.mKey = null;
    this.isDrifting = false;
    this.lastFireTime = 0;
    
    // Auto-aim state
    this.nearestEnemy = null;
    this.aimLine = null;
    
    // Map data
    this.mapType = 'arena';
    this.mapConfig = null;
    
    // Weapon definitions
    this.weapons = {
      machine_gun: { name: 'Machine Gun', type: 'auto', damage: 10, cooldown: 200, color: 0x06B6D4, bulletSpeed: 800, bulletCount: 1, spread: 0.1, radius: 400 },
      shotgun: { name: 'Shotgun', type: 'auto', damage: 8, cooldown: 800, color: 0xF59E0B, bulletSpeed: 700, bulletCount: 5, spread: 0.3, radius: 300 },
      smg: { name: 'SMG', type: 'auto', damage: 7, cooldown: 100, color: 0x10B981, bulletSpeed: 750, bulletCount: 1, spread: 0.15, radius: 350 },
      laser: { name: 'Laser', type: 'auto', damage: 15, cooldown: 300, color: 0xEF4444, bulletSpeed: 1200, bulletCount: 1, spread: 0, radius: 500 },
      dual_gun: { name: 'Dual Gun', type: 'auto', damage: 12, cooldown: 250, color: 0x8B5CF6, bulletSpeed: 850, bulletCount: 2, spread: 0.2, radius: 350 },
      rocket_launcher: { name: 'Rocket Launcher', type: 'manual', damage: 50, cooldown: 1500, color: 0xEF4444, bulletSpeed: 400, bulletCount: 1, spread: 0, explosionRadius: 100 },
      bomb_launcher: { name: 'Bomb Launcher', type: 'manual', damage: 40, cooldown: 1200, color: 0xFF6B00, bulletSpeed: 500, bulletCount: 1, spread: 0.05, explosionRadius: 80 },
      grenade_launcher: { name: 'Grenade Launcher', type: 'manual', damage: 35, cooldown: 1000, color: 0x22C55E, bulletSpeed: 450, bulletCount: 1, spread: 0.1, explosionRadius: 70 },
      cannon: { name: 'Cannon', type: 'manual', damage: 45, cooldown: 2000, color: 0xF59E0B, bulletSpeed: 350, bulletCount: 1, spread: 0, explosionRadius: 120 },
      mine: { name: 'Mine', type: 'manual', damage: 60, cooldown: 500, color: 0x6B7280, bulletSpeed: 0, bulletCount: 1, spread: 0, explosionRadius: 60 }
    };
    
    // Sounds
    this.sounds = {};
    
    // Camera
    this.cameraTarget = { x: 0, y: 0, zoom: 1 };
    this.cameraSmooth = 0.08;
  }

  // =====================================================
  // PRELOAD - Create all textures and load assets
  // =====================================================
  preload() {
    this.createAllTextures();
  }

  // =====================================================
  // INIT - Initialize scene with map data
  // =====================================================
  init(mapType) {
    this.mapType = mapType || 'arena';
    this.socket = window.gameState?.socket || null;
  }

  // =====================================================
  // CREATE - Setup game objects, input, and collisions
  // =====================================================
  create() {
    // Set world bounds
    this.physics.world.setBounds(0, 0, 2000, 2000);
    this.cameras.main.setBounds(0, 0, 2000, 2000);
    
    // Get map configuration
    const mapConfigs = {
      arena: {
        bgColors: [0x0F172A, 0x1E293B],
        wallColor: 0x374151,
        obstacleColor: 0x475569,
        wallThickness: 20
      },
      desert: {
        bgColors: [0x78350F, 0x92400E],
        wallColor: 0xA16207,
        obstacleColor: 0x854D0E,
        wallThickness: 20
      }
    };
    
    this.mapConfig = mapConfigs[this.mapType] || mapConfigs.arena;
    
    // Create background
    this.createBackground();
    
    // Create walls and obstacles
    this.createMap();
    
    // Create player
    this.createLocalPlayer();
    
    // Create bullet group
    this.createBulletGroup();
    
    // Create loot group
    this.createLootGroup();
    
    // Create explosions group
    this.createExplosionsGroup();
    
    // Create mine group
    this.createMineGroup();
    
    // Setup input handlers
    this.setupInput();
    
    // Setup socket handlers
    this.setupSocketHandlers();
    
    // Create UI elements
    this.createGameUI();
    
    // Add existing remote players from game state
    const existingPlayers = window.gameState?.playersList || [];
    existingPlayers.forEach(p => {
      if (p.id !== this.socket?.id) {
        this.addRemotePlayer(p);
      }
    });
    
    // Auto-aim line
    this.aimLine = this.add.graphics();
    this.aimLine.setDepth(100);
    
    // Minimap
    this.createMinimap();
  }

  // =====================================================
  // CREATE TEXTURES
  // =====================================================
  createAllTextures() {
    // Car texture (player)
    this.createCarTexture();
    
    // Bullet textures for each weapon type
    this.createBulletTextures();
    
    // Loot crate texture
    this.createLootTexture();
    
    // Explosion texture
    this.createExplosionTexture();
    
    // Mine texture
    this.createMineTexture();
    
    // Wall and obstacle textures
    this.createWallTextures();
  }

  createCarTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Generate different colored cars
    const colors = [
      { body: 0x6366F1, accent: 0x818CF8 }, // Indigo
      { body: 0x8B5CF6, accent: 0xA78BFA }, // Purple
      { body: 0xEF4444, accent: 0xF87171 }, // Red
      { body: 0xF59E0B, accent: 0xFBBF24 }, // Orange
      { body: 0x10B981, accent: 0x34D399 }, // Green
      { body: 0x06B6D4, accent: 0x22D3EE }, // Cyan
      { body: 0xEC4899, accent: 0xF472B6 }, // Pink
      { body: 0x14B8A6, accent: 0x2DD4BF }, // Teal
      { body: 0xF97316, accent: 0xFB923C }, // Orange-red
      { body: 0x64748B, accent: 0x94A3B8 }, // Slate
      { body: 0x84CC16, accent: 0xA3E635 }, // Lime
      { body: 0x22D3EE, accent: 0x67E8F9 }  // Sky
    ];
    
    colors.forEach((color, i) => {
      graphics.clear();
      
      // Car shadow
      graphics.fillStyle(0x000000, 0.3);
      graphics.fillRoundedRect(2, 2, 50, 30, 6);
      
      // Car body
      graphics.fillStyle(color.body, 1);
      graphics.fillRoundedRect(0, 0, 50, 30, 6);
      
      // Car accent stripe
      graphics.fillStyle(color.accent, 1);
      graphics.fillRect(5, 5, 35, 3);
      graphics.fillRect(5, 22, 35, 3);
      
      // Windshield
      graphics.fillStyle(0x1E293B, 1);
      graphics.fillRoundedRect(30, 6, 15, 18, 3);
      
      // Windshield shine
      graphics.fillStyle(0x38BDF8, 0.4);
      graphics.fillRect(32, 8, 8, 8);
      
      // Headlights
      graphics.fillStyle(0xFBBF24, 1);
      graphics.fillCircle(46, 8, 2);
      graphics.fillCircle(46, 22, 2);
      
      // Taillights
      graphics.fillStyle(0xEF4444, 1);
      graphics.fillCircle(2, 8, 2);
      graphics.fillCircle(2, 22, 2);
      
      // Wheels
      graphics.fillStyle(0x1E293B, 1);
      graphics.fillRect(8, -2, 10, 4);
      graphics.fillRect(28, -2, 10, 4);
      graphics.fillRect(8, 28, 10, 4);
      graphics.fillRect(28, 28, 10, 4);
      
      // Wheel rims
      graphics.fillStyle(color.accent, 1);
      graphics.fillRect(10, -1, 6, 2);
      graphics.fillRect(30, -1, 6, 2);
      graphics.fillRect(10, 29, 6, 2);
      graphics.fillRect(30, 29, 6, 2);
      
      graphics.generateTexture(`car-${i}`, 52, 32);
    });
    
    // Default car texture
    graphics.clear();
    graphics.fillStyle(0x6366F1, 1);
    graphics.fillRoundedRect(0, 0, 50, 30, 6);
    graphics.fillStyle(0x818CF8, 1);
    graphics.fillRect(5, 5, 35, 3);
    graphics.fillRect(5, 22, 35, 3);
    graphics.fillStyle(0x1E293B, 1);
    graphics.fillRoundedRect(30, 6, 15, 18, 3);
    graphics.generateTexture('car-default', 50, 30);
    
    graphics.destroy();
  }

  createBulletTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    Object.entries(this.weapons).forEach(([key, weapon]) => {
      graphics.clear();
      const color = weapon.color;
      
      if (weapon.type === 'auto') {
        // Small bullet for auto weapons
        graphics.fillStyle(color, 1);
        graphics.fillCircle(5, 4, 3);
        graphics.fillStyle(0xFFFFFF, 0.5);
        graphics.fillCircle(4, 3, 1.5);
        graphics.generateTexture(`${key}-bullet`, 10, 8);
      } else if (weapon.explosionRadius) {
        // Rocket/bomb style
        graphics.fillStyle(color, 1);
        graphics.fillCircle(8, 6, 6);
        graphics.fillStyle(0xFFFFFF, 0.4);
        graphics.fillCircle(6, 4, 2);
        graphics.generateTexture(`${key}-bullet`, 16, 12);
      } else {
        graphics.generateTexture(`${key}-bullet`, 8, 8);
      }
    });
    
    graphics.destroy();
  }

  createLootTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Glow background
    graphics.fillStyle(0x6366F1, 0.3);
    graphics.fillCircle(30, 30, 28);
    
    // Crate body
    graphics.fillStyle(0x92400E, 1);
    graphics.fillRoundedRect(10, 10, 40, 40, 6);
    
    // Crate details
    graphics.fillStyle(0x78350F, 1);
    graphics.fillRect(28, 12, 4, 36);
    graphics.fillRect(12, 28, 36, 4);
    
    // Corner brackets
    graphics.fillStyle(0xA16207, 1);
    graphics.fillRect(10, 10, 8, 2);
    graphics.fillRect(10, 10, 2, 8);
    graphics.fillRect(42, 10, 8, 2);
    graphics.fillRect(48, 10, 2, 8);
    graphics.fillRect(10, 48, 8, 2);
    graphics.fillRect(10, 42, 2, 8);
    graphics.fillRect(42, 48, 8, 2);
    graphics.fillRect(48, 42, 2, 8);
    
    // Question mark
    graphics.fillStyle(0xFBBF24, 1);
    graphics.fillCircle(30, 30, 10);
    graphics.fillStyle(0x78350F, 1);
    graphics.fillRect(27, 24, 6, 12);
    graphics.fillRect(27, 24, 4, 4);
    
    graphics.generateTexture('loot-crate', 60, 60);
    graphics.destroy();
  }

  createExplosionTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    graphics.fillStyle(0xF59E0B, 1);
    graphics.fillCircle(50, 50, 50);
    graphics.fillStyle(0xEF4444, 0.8);
    graphics.fillCircle(50, 50, 35);
    graphics.fillStyle(0xFBBF24, 0.6);
    graphics.fillCircle(50, 50, 20);
    graphics.fillStyle(0xFFFFFF, 0.4);
    graphics.fillCircle(50, 50, 10);
    
    graphics.generateTexture('explosion', 100, 100);
    graphics.destroy();
  }

  createMineTexture() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Mine body
    graphics.fillStyle(0x374151, 1);
    graphics.fillCircle(20, 20, 18);
    
    // Spikes
    const spikePositions = [
      [20, 2], [38, 20], [20, 38], [2, 20],
      [7, 7], [33, 7], [33, 33], [7, 33]
    ];
    
    spikePositions.forEach(([x, y]) => {
      graphics.fillStyle(0x4B5563, 1);
      graphics.fillCircle(x, y, 5);
    });
    
    // Center
    graphics.fillStyle(0xEF4444, 1);
    graphics.fillCircle(20, 20, 6);
    
    // Blinking light
    graphics.fillStyle(0xFBBF24, 1);
    graphics.fillCircle(20, 20, 3);
    
    graphics.generateTexture('mine', 40, 40);
    graphics.destroy();
  }

  createWallTextures() {
    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
    
    // Wall texture
    graphics.fillStyle(0x475569, 1);
    graphics.fillRect(0, 0, 64, 64);
    graphics.fillStyle(0x334155, 1);
    graphics.fillRect(0, 0, 64, 2);
    graphics.fillRect(0, 62, 64, 2);
    graphics.fillRect(0, 0, 2, 64);
    graphics.fillRect(62, 0, 2, 64);
    
    graphics.generateTexture('wall', 64, 64);
    
    // Rock texture (desert)
    graphics.clear();
    graphics.fillStyle(0x78350F, 1);
    graphics.fillCircle(32, 32, 30);
    graphics.fillStyle(0x92400E, 0.8);
    graphics.fillCircle(28, 26, 20);
    graphics.fillStyle(0x854D0E, 0.5);
    graphics.fillCircle(35, 35, 15);
    
    graphics.generateTexture('rock', 64, 64);
    graphics.destroy();
  }

  // =====================================================
  // CREATE MAP
  // =====================================================
  createBackground() {
    // Base background color
    this.cameras.main.setBackgroundColor(this.mapConfig.bgColors[0]);
    
    // Create grid pattern
    const gridSize = 200;
    const gridLines = [];
    
    for (let x = 0; x <= 2000; x += gridSize) {
      gridLines.push(
        this.add.line(0, 0, x, 0, x, 2000, this.mapConfig.bgColors[1])
          .setOrigin(0)
          .setLineWidth(1)
      );
    }
    
    for (let y = 0; y <= 2000; y += gridSize) {
      gridLines.push(
        this.add.line(0, 0, 0, y, 2000, y, this.mapConfig.bgColors[1])
          .setOrigin(0)
          .setLineWidth(1)
      );
    }
    
    // Place grid lines behind everything
    gridLines.forEach(line => line.setDepth(-10));
  }

  createMap() {
    this.wallGroup = this.physics.add.staticGroup();
    
    const isArena = this.mapType === 'arena';
    
    // Boundary walls
    const boundaryWalls = [
      // Top
      { x: 1000, y: 10, w: 2000, h: 20 },
      // Bottom
      { x: 1000, y: 1990, w: 2000, h: 20 },
      // Left
      { x: 10, y: 1000, w: 20, h: 2000 },
      // Right
      { x: 1990, y: 1000, w: 20, h: 2000 }
    ];
    
    boundaryWalls.forEach(wall => {
      const wallObj = this.add.rectangle(wall.x, wall.y, wall.w, wall.h, this.mapConfig.wallColor);
      this.wallGroup.add(wallObj);
    });
    
    // Obstacles
    if (isArena) {
      // Arena obstacles - crates and barriers
      const obstacles = [
        // Corner structures
        { x: 300, y: 300, w: 80, h: 80 },
        { x: 1700, y: 300, w: 80, h: 80 },
        { x: 300, y: 1700, w: 80, h: 80 },
        { x: 1700, y: 1700, w: 80, h: 80 },
        
        // Center structure
        { x: 960, y: 960, w: 80, h: 80 },
        
        // Mid-field barriers
        { x: 200, y: 1000, w: 30, h: 150 },
        { x: 1800, y: 1000, w: 30, h: 150 },
        { x: 1000, y: 200, w: 150, h: 30 },
        { x: 1000, y: 1800, w: 150, h: 30 },
        
        // Additional cover
        { x: 600, y: 600, w: 60, h: 40 },
        { x: 1400, y: 600, w: 60, h: 40 },
        { x: 600, y: 1400, w: 60, h: 40 },
        { x: 1400, y: 1400, w: 60, h: 40 },
        
        // Side corridors
        { x: 500, y: 1000, w: 40, h: 200 },
        { x: 1500, y: 1000, w: 40, h: 200 }
      ];
      
      obstacles.forEach(obs => {
        const wallObj = this.add.rectangle(obs.x, obs.y, obs.w, obs.h, 0x475569);
        wallObj.setStrokeStyle(2, 0x64748B);
        this.wallGroup.add(wallObj);
      });
    } else {
      // Desert obstacles - rocks and boulders
      const rocks = [
        { x: 300, y: 800, size: 50 },
        { x: 1700, y: 800, size: 60 },
        { x: 800, y: 300, size: 45 },
        { x: 800, y: 1700, size: 55 },
        { x: 1000, y: 1000, size: 80 },
        { x: 500, y: 500, size: 40 },
        { x: 1500, y: 500, size: 35 },
        { x: 500, y: 1500, size: 45 },
        { x: 1500, y: 1500, size: 50 }
      ];
      
      rocks.forEach(rock => {
        const rockObj = this.add.ellipse(rock.x, rock.y, rock.size, rock.size * 0.8, 0x78350F);
        this.physics.add.existing(rockObj, true);
        this.wallGroup.add(rockObj);
      });
    }
  }

  getPlayerColorIndex(colorHex) {
    const rawColorIndex = [
      '6366f1', '8b5cf6', 'ef4444', 'f59e0b',
      '10b981', '06b6d4', 'ec4899', '14b8a6',
      'f97316', '64748b', '84cc16', '22d3ee'
    ].indexOf(colorHex.toLowerCase());
    return rawColorIndex >= 0 ? rawColorIndex : 'default';
  }

  // =====================================================
  // CREATE PLAYER
  // =====================================================
  createLocalPlayer() {
    const playerData = window.gameState?.playerData;
    
    // Use starting position from server or default
    const startX = playerData?.x || 200;
    const startY = playerData?.y || 200;
    
    this.localPlayer = this.physics.add.sprite(startX, startY, 'car-0');
    this.localPlayer.setCollideWorldBounds(true);
    this.localPlayer.setDepth(10);
    this.localPlayer.setData('id', playerData?.id || 'local');
    this.localPlayer.setData('name', playerData?.name || 'You');
    this.localPlayer.setData('color', playerData?.color || 0x6366F1);
    this.localPlayer.setDrag(0.95);
    
    // Get color index from hex
    const colorVal = playerData?.color ?? 0x6366F1;
    const colorHex = colorVal.toString(16).padStart(6, '0');
    const colorIndex = this.getPlayerColorIndex(colorHex);
    this.localPlayer.setTexture(`car-${colorIndex}`);
    
    // Setup collisions
    this.physics.add.collider(this.localPlayer, this.wallGroup);
    
    // Camera follow
    this.cameras.main.startFollow(this.localPlayer, true, 0.08, 0.08);
    this.cameras.main.setZoom(1.2);
  }

  // =====================================================
  // BULLET GROUP
  // =====================================================
  createBulletGroup() {
    this.bullets = this.physics.add.group({
      maxSize: 200,
      runChildUpdate: false
    });
    
    // Bullets collide with walls
    this.physics.add.overlap(this.bullets, this.wallGroup, (bullet) => {
      if (bullet.active) {
        this.destroyBullet(bullet);
      }
    });
    
    // Bullets collide with mines
    if (this.mines) {
      this.physics.add.overlap(this.bullets, this.mines, (bullet, mine) => {
        this.triggerMine(mine);
        if (bullet.active) this.destroyBullet(bullet);
      });
    }
  }

  // =====================================================
  // LOOT GROUP
  // =====================================================
  createLootGroup() {
    this.lootGroup = this.add.group();
    this.lootSpots = new Map();
    
    // Define loot spots based on map
    const lootSpots = this.mapType === 'arena' ? [
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
    ] : [
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
    ];
    
    lootSpots.forEach(spot => {
      const container = this.add.container(spot.x, spot.y);
      
      // Glow effect
      const glow = this.add.circle(0, 0, 35, 0x6366F1, 0.2);
      container.add(glow);
      
      // Crate
      const crate = this.add.image(0, 0, 'loot-crate');
      crate.setScale(0.5);
      container.add(crate);
      
      container.setData('id', spot.id);
      container.setData('active', true);
      container.setData('type', 'unknown');
      
      this.lootGroup.add(container);
      this.lootSpots.set(spot.id, container);
      
      // Floating animation
      this.tweens.add({
        targets: container,
        y: spot.y - 8,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    });
    
    // Loot pickup overlap
    this.physics.add.overlap(this.localPlayer, this.lootGroup, this.onPickupLoot, null, this);
  }

  // =====================================================
  // EXPLOSIONS GROUP
  // =====================================================
  createExplosionsGroup() {
    this.explosions = this.add.group();
  }

  // =====================================================
  // MINES GROUP
  // =====================================================
  createMineGroup() {
    this.mines = this.physics.add.group({
      maxSize: 50,
      runChildUpdate: false
    });
  }

  // =====================================================
  // INPUT HANDLING
  // =====================================================
  setupInput() {
    // Keyboard keys
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.mKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.M);
    
    // Drift state
    this.isDrifting = false;
    this.driftAngle = 0;
    
    // Mouse tracking for aiming
    this.input.on('pointermove', (pointer) => {
      this.aimPointer = pointer;
    });
    
    // Firing on click
    this.input.on('pointerdown', (pointer) => {
      if (pointer.leftButtonPressed()) {
        this.fireWeapon();
      }
    });
  }

  // =====================================================
  // SOCKET HANDLERS
  // =====================================================
  setupSocketHandlers() {
    if (!this.socket) return;
    
    // Player joined
    this.socket.on('playerJoined', (data) => {
      this.addRemotePlayer(data);
    });
    
    // Players list
    this.socket.on('playersList', (players) => {
      players.forEach(p => {
        if (p.id !== this.socket.id && !this.remotePlayers.has(p.id)) {
          this.addRemotePlayer(p);
        }
      });
    });
    
    // State reset for new game
    this.socket.on('stateReset', (players) => {
      this.resetState(players);
    });
    
    // Player respawned
    this.socket.on('playerRespawned', (data) => {
      this.respawnPlayer(data);
    });
  }

  // =====================================================
  // GAME UI
  // =====================================================
  createGameUI() {
    // Weapon info text
    this.weaponText = this.add.text(20, this.cameras.main.height - 60, '', {
      font: 'bold 14px Inter',
      color: '#E2E8F0'
    }).setScrollFactor(0).setDepth(1000);
    
    // Cooldown indicator
    this.cooldownBar = this.add.graphics().setDepth(999);
  }

  // =====================================================
  // MINIMAP
  // =====================================================
  createMinimap() {
    const minimapSize = 160;
    const padding = 20;
    
    // Minimap background
    this.minimapBg = this.add.rectangle(
      this.cameras.main.width - minimapSize/2 - padding,
      minimapSize/2 + padding,
      minimapSize,
      minimapSize,
      0x000000,
      0.7
    ).setScrollFactor(0).setDepth(998);
    
    this.minimapBg.setStrokeStyle(2, 0x6366F1);
    
    // Player dots on minimap
    this.minimapDots = this.add.group();
  }

  updateMinimap() {
    if (!this.minimapDots) return;
    
    this.minimapDots.clear(true, true);
    
    const mapSize = 2000;
    const minimapSize = 160;
    const centerX = this.cameras.main.width - minimapSize/2 - 20;
    const centerY = minimapSize/2 + 20;
    
    // Local player dot
    const localX = centerX + (this.localPlayer.x / mapSize) * minimapSize - minimapSize/2;
    const localY = centerY + (this.localPlayer.y / mapSize) * minimapSize - minimapSize/2;
    
    const localDot = this.add.circle(localX, localY, 4, 0x6366F1).setScrollFactor(0).setDepth(999);
    this.minimapDots.add(localDot);
    
    // Remote player dots
    this.remotePlayers.forEach((player, id) => {
      if (player.active && player.getData('alive')) {
        const px = centerX + (player.x / mapSize) * minimapSize - minimapSize/2;
        const py = centerY + (player.y / mapSize) * minimapSize - minimapSize/2;
        const dot = this.add.circle(px, py, 3, 0xEF4444).setScrollFactor(0).setDepth(999);
        this.minimapDots.add(dot);
      }
    });
    
    // Loot dots
    this.lootSpots.forEach((spot, id) => {
      if (spot.getData('active')) {
        const lx = centerX + (spot.x / mapSize) * minimapSize - minimapSize/2;
        const ly = centerY + (spot.y / mapSize) * minimapSize - minimapSize/2;
        const dot = this.add.circle(lx, ly, 2, 0x22C55E).setScrollFactor(0).setDepth(999);
        this.minimapDots.add(dot);
      }
    });
  }

  // =====================================================
  // UPDATE LOOP (called every frame)
  // =====================================================
  update(time, delta) {
    if (!this.localPlayer || !this.localPlayer.active) return;
    
    // Handle player movement
    this.handleMovement(delta);
    
    // Update auto-aim indicator
    this.updateAutoAim();
    
    // Update cooldown visual
    this.updateCooldownUI(time);
    
    // Update minimap
    this.updateMinimap();
    
    // Emit position to server (throttled to ~30fps)
    if (!this.lastEmitTime || (time - this.lastEmitTime) > 33) {
      this.emitPosition();
      this.lastEmitTime = time;
    }
    
    // Check loot proximity
    this.checkLootProximity();
  }

  // =====================================================
  // PLAYER MOVEMENT
  // =====================================================
  handleMovement(delta) {
    if (!this.localPlayer || !this.localPlayer.active) return;
    
    const deltaTime = delta / 1000; // Convert to seconds
    const maxSpeed = 350;
    const slowSpeed = 120;
    const accel = 800;
    const turnSpeed = 2.5;
    const driftFactor = 0.92;
    
    const isUp = this.keys.W?.isDown || this.input.keyboard?.addKey?.(Phaser.Input.Keyboard.KeyCodes.UP)?.isDown;
    const isDown = this.keys.S?.isDown || this.input.keyboard?.addKey?.(Phaser.Input.Keyboard.KeyCodes.DOWN)?.isDown;
    const isLeft = this.keys.A?.isDown || this.input.keyboard?.addKey?.(Phaser.Input.Keyboard.KeyCodes.LEFT)?.isDown;
    const isRight = this.keys.D?.isDown || this.input.keyboard?.addKey?.(Phaser.Input.Keyboard.KeyCodes.RIGHT)?.isDown;
    
    // Drift
    this.isDrifting = this.spaceKey?.isDown || false;
    
    if (isDrifting) {
      // Track current angle for drift
      if (!this._lastAngle) this._lastAngle = this.localPlayer.rotation;
    } else {
      this._lastAngle = null;
    }
    
    // Steering
    if (isLeft) {
      this.localPlayer.rotation -= turnSpeed * deltaTime;
    }
    if (isRight) {
      this.localPlayer.rotation += turnSpeed * deltaTime;
    }
    
    // Auto-aim for auto weapons
    const currentWeapon = window.gameState?.weapon || 'machine_gun';
    const isAutoWeapon = ['machine_gun', 'shotgun', 'smg', 'laser', 'dual_gun'].includes(currentWeapon);
    
    if (isAutoWeapon) {
      // Find nearest enemy
      const nearest = this.findNearestEnemy(400);
      if (nearest) {
        const targetAngle = Phaser.Math.Angle.Between(
          this.localPlayer.x,
          this.localPlayer.y,
          nearest.x,
          nearest.y
        );
        
        // Smoothly rotate towards target
        const diff = Phaser.Math.Angle.RotateTo(this.localPlayer.rotation, targetAngle, turnSpeed * deltaTime * 0.5);
        if (Math.abs(Phaser.Math.Angle.Wrap(diff)) > 0.1) {
          this.localPlayer.rotation = Phaser.Math.Angle.RotateTo(
            this.localPlayer.rotation, 
            targetAngle, 
            turnSpeed * deltaTime * 1.5
          );
        }
      }
    } else {
      // Manual aim - follow mouse
      if (this.aimPointer && this.aimPointer.worldX !== undefined) {
        const targetAngle = Phaser.Math.Angle.Between(
          this.localPlayer.x,
          this.localPlayer.y,
          this.aimPointer.worldX,
          this.aimPointer.worldY
        );
        
        // Smoothly rotate towards mouse
        this.localPlayer.rotation = Phaser.Math.Angle.RotateTo(
          this.localPlayer.rotation,
          targetAngle,
          turnSpeed * deltaTime * 2
        );
      }
    }
    
    // Acceleration
    let targetSpeed = 0;
    
    if (isUp) {
      targetSpeed = this.isDrifting ? maxSpeed * 0.6 : maxSpeed;
    } else if (isDown) {
      targetSpeed = -slowSpeed;
    }
    
    // Apply velocity in car direction
    if (targetSpeed !== 0) {
      const vx = Math.cos(this.localPlayer.rotation) * targetSpeed;
      const vy = Math.sin(this.localPlayer.rotation) * targetSpeed;
      
      if (this.isDrifting) {
        // Drift: apply force with some slide
        this.localPlayer.body.velocity.x += (vx - this.localPlayer.body.velocity.x) * 0.05 * deltaTime * 60;
        this.localPlayer.body.velocity.y += (vy - this.localPlayer.body.velocity.y) * 0.05 * deltaTime * 60;
      } else {
        // Normal driving
        this.localPlayer.body.velocity.x += (vx - this.localPlayer.body.velocity.x) * 0.1 * deltaTime * 60;
        this.localPlayer.body.velocity.y += (vy - this.localPlayer.body.velocity.y) * 0.1 * deltaTime * 60;
      }
    } else {
      // Slow down when no input
      this.localPlayer.body.velocity.x *= 0.95;
      this.localPlayer.body.velocity.y *= 0.95;
    }
    
    // Cap velocity
    const velocity = Math.sqrt(
      this.localPlayer.body.velocity.x ** 2 + 
      this.localPlayer.body.velocity.y ** 2
    );
    if (velocity > maxSpeed * 1.2) {
      const scale = (maxSpeed * 1.2) / velocity;
      this.localPlayer.body.velocity.x *= scale;
      this.localPlayer.body.velocity.y *= scale;
    }
  }

  // =====================================================
  // AUTO-AIM
  // =====================================================
  updateAutoAim() {
    const currentWeapon = window.gameState?.weapon || 'machine_gun';
    const isAutoWeapon = ['machine_gun', 'shotgun', 'smg', 'laser', 'dual_gun'].includes(currentWeapon);
    
    if (!isAutoWeapon) {
      this.aimLine.clear();
      this.nearestEnemy = null;
      return;
    }
    
    const nearest = this.findNearestEnemy(400);
    this.nearestEnemy = nearest;
    
    this.aimLine.clear();
    
    if (nearest) {
      // Draw aim line to target
      this.aimLine.lineStyle(2, 0x06B6D4, 0.3);
      this.aimLine.beginPath();
      this.aimLine.moveTo(
        this.localPlayer.x + Math.cos(this.localPlayer.rotation) * 30,
        this.localPlayer.y + Math.sin(this.localPlayer.rotation) * 30
      );
      this.aimLine.lineTo(nearest.x, nearest.y);
      this.aimLine.strokePath();
      
      // Draw target indicator
      this.aimLine.fillStyle(0x06B6D4, 0.5);
      this.aimLine.fillCircle(nearest.x, nearest.y, 8);
    }
  }

  findNearestEnemy(radius = 400) {
    let nearest = null;
    let minDist = radius;
    
    this.remotePlayers.forEach((player, id) => {
      if (!player.active || !player.getData('alive')) return;
      
      const dist = Phaser.Math.Distance.Between(
        this.localPlayer.x,
        this.localPlayer.y,
        player.x,
        player.y
      );
      
      if (dist < minDist) {
        minDist = dist;
        nearest = player;
      }
    });
    
    return nearest;
  }

  // =====================================================
  // FIRE WEAPON
  // =====================================================
  fireWeapon() {
    if (!this.localPlayer || !this.localPlayer.active) return;
    
    const time = Date.now();
    const currentWeapon = window.gameState?.weapon || 'machine_gun';
    const weapon = this.weapons[currentWeapon];
    
    if (!weapon) return;
    
    // Check cooldown
    if (time - this.lastFireTime < weapon.cooldown) return;
    this.lastFireTime = time;
    
    // Place mine
    if (currentWeapon === 'mine') {
      this.placeMine();
      this.socket?.emit('placeMine');
      return;
    }
    
    // Determine fire angle
    let fireAngle = this.localPlayer.rotation;
    
    // For auto weapons, use auto-aim angle if available
    if (weapon.type === 'auto' && this.nearestEnemy) {
      fireAngle = Phaser.Math.Angle.Between(
        this.localPlayer.x,
        this.localPlayer.y,
        this.nearestEnemy.x,
        this.nearestEnemy.y
      );
    }
    
    // Fire bullets based on weapon type
    for (let i = 0; i < weapon.bulletCount; i++) {
      const spreadOffset = (i - (weapon.bulletCount - 1) / 2) * (weapon.spread || 0);
      const bulletAngle = fireAngle + spreadOffset;
      
      const startX = this.localPlayer.x + Math.cos(this.localPlayer.rotation) * 30;
      const startY = this.localPlayer.y + Math.sin(this.localPlayer.rotation) * 30;
      
      const bullet = this.bullets.create(startX, startY, `${currentWeapon}-bullet`);
      if (!bullet) continue;
      
      bullet.setActive(true);
      bullet.setVisible(true);
      bullet.setRotation(bulletAngle);
      bullet.setDepth(50);
      bullet.setSize(10, 8);
      bullet.setData('owner', this.socket.id);
      bullet.setData('damage', weapon.damage);
      bullet.setData('explosionRadius', weapon.explosionRadius || 0);
      bullet.setData('weapon', currentWeapon);
      bullet.setData('color', weapon.color);
      bullet.setData('createTime', time);
      
      // Set velocity
      const vx = Math.cos(bulletAngle) * weapon.bulletSpeed;
      const vy = Math.sin(bulletAngle) * weapon.bulletSpeed;
      bullet.body.velocity.x = vx;
      bullet.body.velocity.y = vy;
      
      // Remove after 3 seconds
      this.time.delayedCall(3000, () => {
        if (bullet.active) this.destroyBullet(bullet);
      });
    }
    
    // Emit to server
    this.socket?.emit('fireWeapon', {
      angle: fireAngle,
      autoTarget: (weapon.type === 'auto' && this.nearestEnemy) ? 
        Phaser.Math.Angle.Between(
          this.localPlayer.x,
          this.localPlayer.y,
          this.nearestEnemy.x,
          this.nearestEnemy.y
        ) : undefined
    });
    
    // Muzzle flash effect
    this.showMuzzleFlash();
  }

  // =====================================================
  // MINE PLACEMENT
  // =====================================================
  placeMine() {
    const mine = this.mines.create(this.localPlayer.x, this.localPlayer.y, 'mine');
    if (!mine) return;
    
    mine.setActive(true);
    mine.setVisible(true);
    mine.setDepth(8);
    mine.setImmovable(true);
    mine.setData('owner', this.socket.id);
    mine.setData('createTime', Date.now());
    
    // Remove after 30 seconds
    this.time.delayedCall(30000, () => {
      if (mine.active) {
        mine.destroy();
      }
    });
    
    // Blink effect
    this.tweens.add({
      targets: mine,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: 59
    });
  }

  triggerMine(mine) {
    if (!mine || !mine.active) return;
    mine.destroy();
    this.createExplosion(mine.x, mine.y, 60, 0x6B7280);
    
    // Check for nearby players
    this.remotePlayers.forEach((player, id) => {
      const dist = Phaser.Math.Distance.Between(mine.x, mine.y, player.x, player.y);
      if (dist < 80) {
        const damage = Math.round(60 * (1 - dist / 80));
        this.socket?.emit('explosionHit', { victimId: id, damage });
      }
    });
  }

  destroyBullet(bullet) {
    bullet.setActive(false);
    bullet.setVisible(false);
    bullet.body.stop();
  }

  // =====================================================
  // MUZZLE FLASH
  // =====================================================
  showMuzzleFlash() {
    const flash = this.add.circle(
      this.localPlayer.x + Math.cos(this.localPlayer.rotation) * 35,
      this.localPlayer.y + Math.sin(this.localPlayer.rotation) * 35,
      8,
      0xFBBF24,
      0.8
    ).setDepth(60);
    
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 100,
      onComplete: () => flash.destroy()
    });
  }

  // =====================================================
  // EXPLOSIONS
  // =====================================================
  showExplosion(data) {
    this.createExplosion(data.x, data.y, data.radius || 100, data.color || 0xEF4444);
  }

  createExplosion(x, y, radius, color) {
    // Visual explosion
    const explosion = this.add.image(x, y, 'explosion').setDepth(55);
    explosion.setScale(radius / 100);
    explosion.setAlpha(0.9);
    explosion.setTint(color);
    
    this.tweens.add({
      targets: explosion,
      alpha: 0,
      scale: explosion.scaleX * 1.5,
      duration: 400,
      ease: 'Power2',
      onComplete: () => explosion.destroy()
    });
    
    // Screen shake for nearby explosions
    const distToPlayer = Phaser.Math.Distance.Between(this.localPlayer.x, this.localPlayer.y, x, y);
    if (distToPlayer < 300) {
      this.cameras.main.shake(200, 0.01 * (1 - distToPlayer / 300));
    }
    
    // Particles
    const particles = this.add.particles(x, y, 'explosion', {
      speed: { min: 50, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: 500,
      quantity: 10,
      tint: color,
      depth: 56
    });
    
    this.time.delayedCall(500, () => particles.destroy());
  }

  // =====================================================
  // LOOT PICKUP
  // =====================================================
  checkLootProximity() {
    this.lootSpots.forEach((spot, id) => {
      if (!spot.getData('active')) return;
      
      const dist = Phaser.Math.Distance.Between(
        this.localPlayer.x,
        this.localPlayer.y,
        spot.x,
        spot.y
      );
      
      if (dist < 50) {
        // Show pickup hint
        this.weaponText.setText('[E] Pick up weapon');
        this.weaponText.setPosition(this.cameras.main.width / 2, this.cameras.main.height - 60);
      }
    });
  }

  onPickupLoot(player, loot) {
    if (!loot.getData('active')) return;
    
    // Check distance again
    const dist = Phaser.Math.Distance.Between(
      this.localPlayer.x,
      this.localPlayer.y,
      loot.x,
      loot.y
    );
    
    if (dist > 60) return;
    
    const lootId = loot.getData('id');
    
    // Emit to server
    this.socket?.emit('pickupLoot', { lootId });
    
    // Client-side hide loot
    loot.setData('active', false);
    loot.setVisible(false);
  }

  updateLootSpots(lootSpots) {
    lootSpots.forEach(spot => {
      const container = this.lootSpots.get(spot.id);
      if (!container) return;
      
      container.setData('active', spot.active);
      container.setData('type', spot.type);
      
      if (spot.active) {
        container.setVisible(true);
      } else {
        container.setVisible(false);
      }
    });
  }

  // =====================================================
  // UI UPDATES
  // =====================================================
  updateCooldownUI(time) {
    this.cooldownBar.clear();
    
    const weapon = window.gameState?.weapon || 'machine_gun';
    const cooldown = this.weapons[weapon].cooldown;
    const timeSinceFire = time - this.lastFireTime;
    const progress = Math.min(timeSinceFire / cooldown, 1);
    
    const barWidth = 100;
    const barHeight = 4;
    const x = this.cameras.main.width / 2 - barWidth / 2;
    const y = this.cameras.main.height - 30;
    
    // Background
    this.cooldownBar.fillStyle(0x1E293B, 0.5);
    this.cooldownBar.fillRect(x, y, barWidth, barHeight);
    
    // Progress
    const color = progress >= 1 ? 0x22C55E : 0xF59E0B;
    this.cooldownBar.fillStyle(color, 0.8);
    this.cooldownBar.fillRect(x, y, barWidth * progress, barHeight);
  }

  // =====================================================
  // REMOTE PLAYERS
  // =====================================================
  addRemotePlayer(data) {
    if (this.remotePlayers.has(data.id)) return;
    if (data.id === this.socket?.id) return;
    
    const player = this.physics.add.sprite(data.x, data.y, 'car-default');
    player.setDepth(10);
    player.setData('id', data.id);
    player.setData('name', data.name);
    player.setData('color', data.color);
    player.setData('alive', true);
    
    // Set correct color
    const colorVal = data.color ?? 0xef4444;
    const colorHex = colorVal.toString(16).padStart(6, '0');
    const colorIndex = this.getPlayerColorIndex(colorHex);
    player.setTexture(`car-${colorIndex}`);
    
    // Add name tag
    const nameTag = this.add.text(data.x, data.y - 30, data.name, {
      font: 'bold 12px Inter',
      color: '#FFFFFF',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: { x: 6, y: 2 }
    }).setOrigin(0.5).setDepth(100);
    
    player.setData('nameTag', nameTag);
    
    this.remotePlayers.set(data.id, player);
    
    // Health bar
    const healthBg = this.add.rectangle(data.x, data.y - 20, 40, 6, 0x000000).setAlpha(0.5).setDepth(99);
    const healthBar = this.add.rectangle(data.x, data.y - 20, 38, 4, 0x22C55E).setDepth(100);
    player.setData('healthBg', healthBg);
    player.setData('healthBar', healthBar);
  }

  updateRemotePlayer(data) {
    const player = this.remotePlayers.get(data.id);
    if (!player) return;
    
    // Smooth interpolation
    this.tweens.add({
      targets: player,
      x: data.x,
      y: data.y,
      rotation: data.angle,
      duration: 50,
      ease: 'Linear'
    });
    
    // Update name tag
    const nameTag = player.getData('nameTag');
    if (nameTag) {
      nameTag.setPosition(data.x, data.y - 30);
    }
    
    // Update health bars
    const healthBg = player.getData('healthBg');
    const healthBar = player.getData('healthBar');
    if (healthBg && healthBar) {
      healthBg.setPosition(data.x, data.y - 20);
      healthBar.setPosition(data.x, data.y - 20);
    }
  }

  showRemoteWeaponFire(data) {
    // Muzzle flash for remote players
    const player = this.remotePlayers.get(data.id);
    if (!player) return;
    
    const flash = this.add.circle(
      player.x + Math.cos(player.rotation) * 35,
      player.y + Math.sin(player.rotation) * 35,
      6,
      0xFBBF24,
      0.6
    ).setDepth(60);
    
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 1.5,
      duration: 80,
      onComplete: () => flash.destroy()
    });
  }

  showRemoteMine(data) {
    if (!this.mines) return;
    const mine = this.mines.create(data.projectile.x, data.projectile.y, 'mine');
    if (mine) {
      mine.setDepth(8);
      mine.setImmovable(true);
    }
  }

  respawnPlayer(data) {
    if (data.id === this.socket.id) {
      // Respawn local player
      this.localPlayer.setPosition(data.x, data.y);
      this.localPlayer.setActive(true);
      this.localPlayer.setVisible(true);
      this.localPlayer.body.enable = true;
      window.gameState.health = data.health;
      
      const bar = document.getElementById('health-bar-fill');
      if (bar) bar.style.width = `${data.health}%`;
    } else {
      // Respawn remote player
      const player = this.remotePlayers.get(data.id);
      if (player) {
        player.setPosition(data.x, data.y);
        player.setActive(true);
        player.setVisible(true);
        player.setData('alive', true);
      }
    }
  }

  handlePlayerDeath() {
    this.localPlayer.setActive(false);
    this.localPlayer.setVisible(false);
    this.cameras.main.shake(500, 0.02);
    
    // Death screen flash
    const flash = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0xEF4444,
      0.3
    ).setScrollFactor(0).setDepth(1000);
    
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 500,
      onComplete: () => flash.destroy()
    });
  }

  removeRemotePlayer(id) {
    const player = this.remotePlayers.get(id);
    if (player) {
      player.destroy();
      this.remotePlayers.delete(id);
    }
  }

  resetState(players) {
    // Prevent crashes if scene hasn't finished booting yet
    if (!this.localPlayer || !this.bullets || !this.lootSpots) return;
    
    // Clear remote players
    this.remotePlayers.forEach((player, id) => player.destroy());
    this.remotePlayers.clear();
    
    // Clear bullets
    this.bullets.clear(true, true);
    
    // Reset local player
    this.localPlayer.setActive(true);
    this.localPlayer.setVisible(true);
    this.localPlayer.body.enable = true;
    
    // Reset loot
    this.lootSpots.forEach((spot) => {
      spot.setVisible(true);
      spot.setData('active', true);
    });
    
    // Add remote players
    players.forEach(p => {
      if (p.id !== this.socket?.id) {
        this.addRemotePlayer(p);
      }
    });
  }

  // =====================================================
  // HELPER FUNCTIONS
  // =====================================================
  getPlayerColorIndex(colorHex) {
    const colorMap = {
      '6366f1': 0, '8b5cf6': 1, 'ef4444': 2, 'f59e0b': 3,
      '10b981': 4, '06b6d4': 5, 'ec4899': 6, '14b8a6': 7,
      'f97316': 8, '64748b': 9, '84cc16': 10, '22d3ee': 11
    };
    return colorMap[colorHex.toLowerCase()] ?? 0;
  }

  emitPosition() {
    if (!this.socket || !this.localPlayer) return;
    
    this.socket.emit('playerMove', {
      x: this.localPlayer.x,
      y: this.localPlayer.y,
      angle: this.localPlayer.rotation,
      velocity: Math.sqrt(
        this.localPlayer.body.velocity.x ** 2 + 
        this.localPlayer.body.velocity.y ** 2
      ),
      drift: this.isDrifting
    });
  }

  shutdown() {
    // Cleanup
    this.remotePlayers.forEach((player, id) => {
      player.destroy();
      const nameTag = player.getData('nameTag');
      if (nameTag) nameTag.destroy();
    });
    this.remotePlayers.clear();
    this.lootSpots.clear();
  }
}