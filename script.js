// 游戏状态管理
class GameState {
    constructor() {
        this.currentScreen = 'main-menu';
        this.gameMode = 'classic';
        this.isPlaying = false;
        this.isPaused = false;
        this.score = 0;
        this.level = 1;
        this.speed = 1;
        this.startTime = 0;
        this.settings = {
            soundVolume: 70,
            musicVolume: 50,
            difficulty: 'normal',
            showGrid: true
        };
        this.loadSettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('snakeGameSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }
    }

    saveSettings() {
        localStorage.setItem('snakeGameSettings', JSON.stringify(this.settings));
    }

    saveScore(mode, score, level, time) {
        const scores = this.getScores(mode);
        scores.push({
            score,
            level,
            time,
            date: new Date().toISOString(),
            player: `玩家${scores.length + 1}`
        });
        scores.sort((a, b) => b.score - a.score);
        scores.splice(10); // 只保留前10名
        localStorage.setItem(`snakeGameScores_${mode}`, JSON.stringify(scores));
    }

    getScores(mode) {
        const scores = localStorage.getItem(`snakeGameScores_${mode}`);
        return scores ? JSON.parse(scores) : [];
    }

    clearScores() {
        const modes = ['classic', 'speed', 'obstacle', 'infinite'];
        modes.forEach(mode => {
            localStorage.removeItem(`snakeGameScores_${mode}`);
        });
    }
}

// 游戏对象
class Snake {
    constructor(x, y) {
        this.body = [{ x, y }];
        this.direction = { x: 1, y: 0 };
        this.nextDirection = { x: 1, y: 0 };
        this.growing = false;
        this.color = '#00ff88';
        this.trailColors = ['#00ff8850', '#00ff8830', '#00ff8810'];
    }

    update() {
        this.direction = { ...this.nextDirection };
        
        const head = { ...this.body[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;
        
        this.body.unshift(head);
        
        if (!this.growing) {
            this.body.pop();
        } else {
            this.growing = false;
        }
    }

    grow() {
        this.growing = true;
    }

    setDirection(newDirection) {
        // 防止180度转向
        if (this.direction.x !== -newDirection.x || this.direction.y !== -newDirection.y) {
            this.nextDirection = newDirection;
        }
    }

    checkCollision(gridWidth, gridHeight, obstacles = []) {
        const head = this.body[0];
        
        // 检查边界碰撞（根据游戏模式）
        if (game.gameMode !== 'infinite') {
            if (head.x < 0 || head.x >= gridWidth || head.y < 0 || head.y >= gridHeight) {
                return true;
            }
        } else {
            // 无限模式：穿墙
            if (head.x < 0) head.x = gridWidth - 1;
            if (head.x >= gridWidth) head.x = 0;
            if (head.y < 0) head.y = gridHeight - 1;
            if (head.y >= gridHeight) head.y = 0;
        }
        
        // 检查自身碰撞
        for (let i = 1; i < this.body.length; i++) {
            if (head.x === this.body[i].x && head.y === this.body[i].y) {
                return true;
            }
        }
        
        // 检查障碍物碰撞
        for (let obstacle of obstacles) {
            if (head.x === obstacle.x && head.y === obstacle.y) {
                return true;
            }
        }
        
        return false;
    }

    draw(ctx, cellSize) {
        // 绘制蛇身
        this.body.forEach((segment, index) => {
            const alpha = Math.max(0.3, 1 - index * 0.1);
            
            if (index === 0) {
                // 蛇头
                ctx.fillStyle = this.color;
                ctx.shadowColor = this.color;
                ctx.shadowBlur = 10;
                
                // 绘制蛇头圆角矩形
                ctx.beginPath();
                ctx.roundRect(
                    segment.x * cellSize + 2,
                    segment.y * cellSize + 2,
                    cellSize - 4,
                    cellSize - 4,
                    cellSize / 4
                );
                ctx.fill();
                
                // 绘制眼睛
                ctx.fillStyle = '#000';
                ctx.shadowBlur = 0;
                const eyeSize = cellSize / 8;
                const eyeOffset = cellSize / 4;
                
                if (this.direction.x === 1) { // 向右
                    ctx.fillRect(segment.x * cellSize + cellSize - eyeOffset, segment.y * cellSize + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * cellSize + cellSize - eyeOffset, segment.y * cellSize + cellSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                } else if (this.direction.x === -1) { // 向左
                    ctx.fillRect(segment.x * cellSize + eyeOffset - eyeSize, segment.y * cellSize + eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * cellSize + eyeOffset - eyeSize, segment.y * cellSize + cellSize - eyeOffset - eyeSize, eyeSize, eyeSize);
                } else if (this.direction.y === -1) { // 向上
                    ctx.fillRect(segment.x * cellSize + eyeOffset, segment.y * cellSize + eyeOffset - eyeSize, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * cellSize + cellSize - eyeOffset - eyeSize, segment.y * cellSize + eyeOffset - eyeSize, eyeSize, eyeSize);
                } else { // 向下
                    ctx.fillRect(segment.x * cellSize + eyeOffset, segment.y * cellSize + cellSize - eyeOffset, eyeSize, eyeSize);
                    ctx.fillRect(segment.x * cellSize + cellSize - eyeOffset - eyeSize, segment.y * cellSize + cellSize - eyeOffset, eyeSize, eyeSize);
                }
            } else {
                // 蛇身
                const bodyColor = `rgba(0, 255, 136, ${alpha})`;
                ctx.fillStyle = bodyColor;
                ctx.shadowColor = bodyColor;
                ctx.shadowBlur = 5;
                
                ctx.beginPath();
                ctx.roundRect(
                    segment.x * cellSize + 3,
                    segment.y * cellSize + 3,
                    cellSize - 6,
                    cellSize - 6,
                    cellSize / 6
                );
                ctx.fill();
            }
        });
        
        ctx.shadowBlur = 0;
    }
}

class Food {
    constructor(gridWidth, gridHeight, obstacles = [], snake = null) {
        this.types = [
            { type: 'normal', color: '#ff4444', points: 10, emoji: '🍎' },
            { type: 'golden', color: '#ffdd00', points: 50, emoji: '🌟' },
            { type: 'speed', color: '#00ddff', points: 20, emoji: '⚡' },
            { type: 'mega', color: '#ff00ff', points: 100, emoji: '💎' }
        ];
        this.respawn(gridWidth, gridHeight, obstacles, snake);
    }

    respawn(gridWidth, gridHeight, obstacles = [], snake = null) {
        let attempts = 0;
        do {
            this.x = Math.floor(Math.random() * gridWidth);
            this.y = Math.floor(Math.random() * gridHeight);
            attempts++;
        } while (this.isOccupied(obstacles, snake) && attempts < 100);

        // 选择食物类型
        const rand = Math.random();
        if (rand < 0.1) {
            this.currentType = this.types[3]; // mega - 10%
        } else if (rand < 0.25) {
            this.currentType = this.types[2]; // speed - 15%
        } else if (rand < 0.4) {
            this.currentType = this.types[1]; // golden - 15%
        } else {
            this.currentType = this.types[0]; // normal - 60%
        }

        this.spawnTime = Date.now();
        this.glowPhase = 0;
    }

    isOccupied(obstacles, snake) {
        // 检查障碍物
        for (let obstacle of obstacles) {
            if (this.x === obstacle.x && this.y === obstacle.y) {
                return true;
            }
        }
        
        // 检查蛇身
        if (snake) {
            for (let segment of snake.body) {
                if (this.x === segment.x && this.y === segment.y) {
                    return true;
                }
            }
        }
        
        return false;
    }

    update() {
        this.glowPhase += 0.1;
        
        // 特殊食物有时间限制
        if (this.currentType.type !== 'normal') {
            const elapsed = Date.now() - this.spawnTime;
            if (elapsed > 10000) { // 10秒后变回普通食物
                this.currentType = this.types[0];
            }
        }
    }

    draw(ctx, cellSize) {
        const centerX = this.x * cellSize + cellSize / 2;
        const centerY = this.y * cellSize + cellSize / 2;
        
        // 发光效果
        const glowIntensity = 0.5 + Math.sin(this.glowPhase) * 0.3;
        ctx.shadowColor = this.currentType.color;
        ctx.shadowBlur = 15 * glowIntensity;
        
        // 绘制食物
        ctx.fillStyle = this.currentType.color;
        ctx.beginPath();
        ctx.arc(centerX, centerY, cellSize / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 绘制表情符号
        ctx.shadowBlur = 0;
        ctx.font = `${cellSize * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.currentType.emoji, centerX, centerY);
        
        // 特殊食物的额外效果
        if (this.currentType.type !== 'normal') {
            ctx.strokeStyle = this.currentType.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = this.glowPhase * 10;
            ctx.beginPath();
            ctx.arc(centerX, centerY, cellSize / 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }
}

class PowerUp {
    constructor(type, duration = 5000) {
        this.type = type;
        this.duration = duration;
        this.startTime = Date.now();
        this.active = true;
        
        this.effects = {
            speed: { name: '⚡ 加速', color: '#00ddff' },
            slow: { name: '🐌 减速', color: '#ffaa00' },
            invincible: { name: '🛡️ 无敌', color: '#ff00ff' },
            phase: { name: '👻 穿墙', color: '#8800ff' },
            double: { name: '🎯 双倍分数', color: '#ffdd00' }
        };
    }

    update() {
        const elapsed = Date.now() - this.startTime;
        if (elapsed >= this.duration) {
            this.active = false;
        }
        return this.active;
    }

    getTimeLeft() {
        const elapsed = Date.now() - this.startTime;
        return Math.max(0, this.duration - elapsed);
    }
}

class Particle {
    constructor(x, y, color = '#00ff88') {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1;
        this.decay = 0.02;
        this.color = color;
        this.size = Math.random() * 4 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.vx *= 0.98;
        this.vy *= 0.98;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class SoundManager {
    constructor() {
        this.sounds = {};
        this.audioContext = null;
        this.init();
    }

    init() {
        // 创建音效 (使用Web Audio API生成简单音效)
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.generateSounds();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    generateSounds() {
        // 这里可以添加音效生成逻辑
        // 为了演示，我们使用简单的提示音
    }

    play(soundName, volume = 0.5) {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // 不同音效的频率
            const frequencies = {
                eat: 880,
                death: 220,
                powerup: 1320,
                score: 660
            };
            
            oscillator.frequency.setValueAtTime(frequencies[soundName] || 440, this.audioContext.currentTime);
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(volume * gameState.settings.soundVolume / 100, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.2);
        } catch (e) {
            console.warn('Could not play sound:', e);
        }
    }
}

// 主游戏类
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridWidth = 40;
        this.gridHeight = 30;
        this.cellSize = 20;
        
        this.snake = null;
        this.food = null;
        this.obstacles = [];
        this.powerUps = [];
        this.particles = [];
        
        this.gameSpeed = 150;
        this.lastTime = 0;
        this.animationId = null;
        
        this.soundManager = new SoundManager();
        
        this.initCanvas();
        this.bindEvents();
    }

    initCanvas() {
        this.cellSize = Math.min(
            this.canvas.width / this.gridWidth,
            this.canvas.height / this.gridHeight
        );
        
        // 启用圆角矩形支持
        if (!this.ctx.roundRect) {
            this.ctx.roundRect = function(x, y, width, height, radius) {
                this.beginPath();
                this.moveTo(x + radius, y);
                this.lineTo(x + width - radius, y);
                this.quadraticCurveTo(x + width, y, x + width, y + radius);
                this.lineTo(x + width, y + height - radius);
                this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
                this.lineTo(x + radius, y + height);
                this.quadraticCurveTo(x, y + height, x, y + height - radius);
                this.lineTo(x, y + radius);
                this.quadraticCurveTo(x, y, x + radius, y);
                this.closePath();
            };
        }
    }

    startGame(mode) {
        this.gameMode = mode;
        gameState.gameMode = mode;
        gameState.isPlaying = true;
        gameState.isPaused = false;
        gameState.score = 0;
        gameState.level = 1;
        gameState.speed = 1;
        gameState.startTime = Date.now();
        
        // 初始化游戏对象
        this.snake = new Snake(Math.floor(this.gridWidth / 2), Math.floor(this.gridHeight / 2));
        this.food = new Food(this.gridWidth, this.gridHeight);
        this.obstacles = [];
        this.powerUps = [];
        this.particles = [];
        
        // 根据游戏模式设置
        this.setupGameMode(mode);
        
        // 更新UI
        this.updateUI();
        
        // 开始游戏循环
        this.gameLoop();
    }

    setupGameMode(mode) {
        switch (mode) {
            case 'classic':
                this.gameSpeed = 150;
                break;
            case 'speed':
                this.gameSpeed = 100;
                break;
            case 'obstacle':
                this.generateObstacles();
                this.gameSpeed = 150;
                break;
            case 'infinite':
                this.gameSpeed = 120;
                break;
        }
        
        // 根据难度调整
        const difficultyMultiplier = {
            easy: 1.5,
            normal: 1,
            hard: 0.7
        };
        this.gameSpeed *= difficultyMultiplier[gameState.settings.difficulty];
    }

    generateObstacles() {
        const numObstacles = 10;
        this.obstacles = [];
        
        for (let i = 0; i < numObstacles; i++) {
            let obstacle;
            let attempts = 0;
            
            do {
                obstacle = {
                    x: Math.floor(Math.random() * this.gridWidth),
                    y: Math.floor(Math.random() * this.gridHeight)
                };
                attempts++;
            } while (this.isObstacleInvalid(obstacle) && attempts < 100);
            
            if (attempts < 100) {
                this.obstacles.push(obstacle);
            }
        }
    }

    isObstacleInvalid(obstacle) {
        // 不能在蛇的起始位置附近
        const snakeStart = { x: Math.floor(this.gridWidth / 2), y: Math.floor(this.gridHeight / 2) };
        if (Math.abs(obstacle.x - snakeStart.x) < 3 && Math.abs(obstacle.y - snakeStart.y) < 3) {
            return true;
        }
        
        // 不能与其他障碍物重叠
        for (let existingObstacle of this.obstacles) {
            if (obstacle.x === existingObstacle.x && obstacle.y === existingObstacle.y) {
                return true;
            }
        }
        
        return false;
    }

    gameLoop(currentTime = 0) {
        if (!gameState.isPlaying) return;
        
        const deltaTime = currentTime - this.lastTime;
        
        if (deltaTime >= this.gameSpeed && !gameState.isPaused) {
            this.update();
            this.lastTime = currentTime;
        }
        
        this.draw();
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    update() {
        // 更新蛇
        this.snake.update();
        
        // 检查碰撞
        if (this.snake.checkCollision(this.gridWidth, this.gridHeight, this.obstacles)) {
            // 检查是否有无敌状态
            const invincible = this.powerUps.find(p => p.type === 'invincible' && p.active);
            if (!invincible) {
                this.gameOver();
                return;
            }
        }
        
        // 检查食物碰撞
        const head = this.snake.body[0];
        if (head.x === this.food.x && head.y === this.food.y) {
            this.eatFood();
        }
        
        // 更新食物
        this.food.update();
        
        // 更新道具
        this.powerUps = this.powerUps.filter(powerUp => powerUp.update());
        
        // 更新粒子
        this.particles = this.particles.filter(particle => particle.update());
        
        // 随机生成道具
        if (Math.random() < 0.002) {
            this.spawnPowerUp();
        }
        
        this.updateUI();
    }

    eatFood() {
        this.snake.grow();
        
        // 计算分数
        let points = this.food.currentType.points;
        const doubleScore = this.powerUps.find(p => p.type === 'double' && p.active);
        if (doubleScore) {
            points *= 2;
        }
        
        gameState.score += points;
        
        // 创建粒子效果
        this.createParticles(
            this.food.x * this.cellSize + this.cellSize / 2,
            this.food.y * this.cellSize + this.cellSize / 2,
            this.food.currentType.color
        );
        
        // 播放音效
        this.soundManager.play('eat');
        
        // 检查特殊食物效果
        if (this.food.currentType.type === 'speed') {
            this.addPowerUp('speed');
        } else if (this.food.currentType.type === 'golden') {
            this.addPowerUp('double');
        } else if (this.food.currentType.type === 'mega') {
            this.addPowerUp('invincible');
        }
        
        // 生成新食物
        this.food.respawn(this.gridWidth, this.gridHeight, this.obstacles, this.snake);
        
        // 检查升级
        if (gameState.score > gameState.level * 200) {
            this.levelUp();
        }
        
        // 竞速模式：增加速度
        if (this.gameMode === 'speed') {
            this.gameSpeed = Math.max(50, this.gameSpeed - 2);
            gameState.speed = Math.round((150 / this.gameSpeed) * 10) / 10;
        }
    }

    spawnPowerUp() {
        const types = ['speed', 'slow', 'invincible', 'phase', 'double'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        this.addPowerUp(randomType);
    }

    addPowerUp(type) {
        // 移除同类型的现有道具
        this.powerUps = this.powerUps.filter(p => p.type !== type);
        
        // 添加新道具
        const powerUp = new PowerUp(type);
        this.powerUps.push(powerUp);
        
        this.soundManager.play('powerup');
        this.updatePowerUpDisplay();
    }

    levelUp() {
        gameState.level++;
        this.soundManager.play('score');
        
        // 创建升级特效
        this.createParticles(
            this.canvas.width / 2,
            this.canvas.height / 2,
            '#ffdd00',
            20
        );
        
        // 障碍模式：添加更多障碍
        if (this.gameMode === 'obstacle') {
            this.generateObstacles();
        }
    }

    createParticles(x, y, color = '#00ff88', count = 10) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    gameOver() {
        gameState.isPlaying = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        this.soundManager.play('death');
        
        // 保存分数
        const gameTime = Math.floor((Date.now() - gameState.startTime) / 1000);
        gameState.saveScore(this.gameMode, gameState.score, gameState.level, gameTime);
        
        // 显示游戏结束界面
        this.showGameOver(gameTime);
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制网格
        if (gameState.settings.showGrid) {
            this.drawGrid();
        }
        
        // 绘制障碍物
        this.drawObstacles();
        
        // 绘制食物
        this.food.draw(this.ctx, this.cellSize);
        
        // 绘制蛇
        this.snake.draw(this.ctx, this.cellSize);
        
        // 绘制粒子
        this.particles.forEach(particle => particle.draw(this.ctx));
        
        // 绘制暂停提示
        if (gameState.isPaused) {
            this.drawPauseOverlay();
        }
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.gridWidth; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.cellSize, 0);
            this.ctx.lineTo(x * this.cellSize, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.gridHeight; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.cellSize);
            this.ctx.lineTo(this.canvas.width, y * this.cellSize);
            this.ctx.stroke();
        }
    }

    drawObstacles() {
        this.ctx.fillStyle = '#666666';
        this.ctx.shadowColor = '#666666';
        this.ctx.shadowBlur = 5;
        
        this.obstacles.forEach(obstacle => {
            this.ctx.beginPath();
            this.ctx.roundRect(
                obstacle.x * this.cellSize + 2,
                obstacle.y * this.cellSize + 2,
                this.cellSize - 4,
                this.cellSize - 4,
                this.cellSize / 6
            );
            this.ctx.fill();
        });
        
        this.ctx.shadowBlur = 0;
    }

    drawPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 48px Orbitron';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('游戏暂停', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '20px Noto Sans SC';
        this.ctx.fillText('按空格键继续', this.canvas.width / 2, this.canvas.height / 2 + 60);
    }

    updateUI() {
        document.getElementById('score').textContent = gameState.score;
        document.getElementById('level').textContent = gameState.level;
        document.getElementById('speed').textContent = gameState.speed + 'x';
    }

    updatePowerUpDisplay() {
        const container = document.getElementById('active-powerups');
        container.innerHTML = '';
        
        this.powerUps.forEach(powerUp => {
            if (powerUp.active) {
                const element = document.createElement('div');
                element.className = 'powerup-item';
                element.style.borderColor = powerUp.effects[powerUp.type].color;
                element.style.color = powerUp.effects[powerUp.type].color;
                
                const timeLeft = Math.ceil(powerUp.getTimeLeft() / 1000);
                element.textContent = `${powerUp.effects[powerUp.type].name} ${timeLeft}s`;
                
                container.appendChild(element);
            }
        });
    }

    showGameOver(gameTime) {
        document.getElementById('final-score').textContent = gameState.score;
        document.getElementById('final-level').textContent = gameState.level;
        document.getElementById('game-time').textContent = this.formatTime(gameTime);
        
        this.showScreen('game-over');
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showScreen(screenId) {
        document.querySelectorAll('.menu-screen, .game-screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        gameState.currentScreen = screenId;
    }

    pauseGame() {
        gameState.isPaused = !gameState.isPaused;
        document.getElementById('pause-btn').textContent = gameState.isPaused ? '▶️' : '⏸️';
    }

    bindEvents() {
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (!gameState.isPlaying) return;
            
            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    e.preventDefault();
                    this.snake.setDirection({ x: 0, y: -1 });
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    e.preventDefault();
                    this.snake.setDirection({ x: 0, y: 1 });
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    e.preventDefault();
                    this.snake.setDirection({ x: -1, y: 0 });
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    e.preventDefault();
                    this.snake.setDirection({ x: 1, y: 0 });
                    break;
                case ' ':
                    e.preventDefault();
                    this.pauseGame();
                    break;
            }
        });
        
        // 游戏模式选择
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                this.startGame(mode);
                this.showScreen('game-screen');
            });
        });
        
        // 移动端控制
        document.querySelectorAll('.dir-btn').forEach(btn => {
            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (!gameState.isPlaying) return;
                
                const direction = btn.dataset.dir;
                const directions = {
                    up: { x: 0, y: -1 },
                    down: { x: 0, y: 1 },
                    left: { x: -1, y: 0 },
                    right: { x: 1, y: 0 }
                };
                
                this.snake.setDirection(directions[direction]);
            });
        });
        
        // 控制按钮
        document.getElementById('pause-btn').addEventListener('click', () => {
            this.pauseGame();
        });
        
        document.getElementById('menu-btn').addEventListener('click', () => {
            gameState.isPlaying = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
            }
            this.showScreen('main-menu');
        });
        
        // 菜单按钮
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showScreen('settings-screen');
        });
        
        document.getElementById('leaderboard-btn').addEventListener('click', () => {
            this.updateLeaderboard('classic');
            this.showScreen('leaderboard-screen');
        });
        
        // 游戏结束按钮
        document.getElementById('restart-btn').addEventListener('click', () => {
            this.startGame(this.gameMode);
            this.showScreen('game-screen');
        });
        
        document.getElementById('back-menu-btn').addEventListener('click', () => {
            this.showScreen('main-menu');
        });
        
        // 设置页面
        this.bindSettingsEvents();
        
        // 排行榜页面
        this.bindLeaderboardEvents();
    }

    bindSettingsEvents() {
        // 音量滑块
        const soundVolumeSlider = document.getElementById('sound-volume');
        const musicVolumeSlider = document.getElementById('music-volume');
        
        soundVolumeSlider.addEventListener('input', (e) => {
            gameState.settings.soundVolume = parseInt(e.target.value);
            e.target.nextElementSibling.textContent = e.target.value + '%';
        });
        
        musicVolumeSlider.addEventListener('input', (e) => {
            gameState.settings.musicVolume = parseInt(e.target.value);
            e.target.nextElementSibling.textContent = e.target.value + '%';
        });
        
        // 难度选择
        document.getElementById('difficulty').addEventListener('change', (e) => {
            gameState.settings.difficulty = e.target.value;
        });
        
        // 网格显示
        document.getElementById('show-grid').addEventListener('change', (e) => {
            gameState.settings.showGrid = e.target.checked;
        });
        
        // 保存设置
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            gameState.saveSettings();
            this.showScreen('main-menu');
        });
        
        document.getElementById('back-settings-btn').addEventListener('click', () => {
            this.showScreen('main-menu');
        });
    }

    bindLeaderboardEvents() {
        // 标签切换
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateLeaderboard(btn.dataset.mode);
            });
        });
        
        // 清除记录
        document.getElementById('clear-scores-btn').addEventListener('click', () => {
            if (confirm('确定要清除所有记录吗？')) {
                gameState.clearScores();
                this.updateLeaderboard(document.querySelector('.tab-btn.active').dataset.mode);
            }
        });
        
        document.getElementById('back-leaderboard-btn').addEventListener('click', () => {
            this.showScreen('main-menu');
        });
    }

    updateLeaderboard(mode) {
        const scores = gameState.getScores(mode);
        const container = document.getElementById('leaderboard-list');
        
        if (scores.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: #888; padding: 2rem;">暂无记录</div>';
            return;
        }
        
        container.innerHTML = scores.map((score, index) => `
            <div class="leaderboard-item">
                <div class="rank">#${index + 1}</div>
                <div class="player-info">
                    <div class="player-name">${score.player}</div>
                    <div class="game-stats">
                        等级 ${score.level} • 时长 ${this.formatTime(score.time)} • ${new Date(score.date).toLocaleDateString()}
                    </div>
                </div>
                <div class="score-value">${score.score}</div>
            </div>
        `).join('');
    }

    loadSettingsUI() {
        document.getElementById('sound-volume').value = gameState.settings.soundVolume;
        document.getElementById('music-volume').value = gameState.settings.musicVolume;
        document.getElementById('difficulty').value = gameState.settings.difficulty;
        document.getElementById('show-grid').checked = gameState.settings.showGrid;
        
        // 更新显示值
        document.querySelector('#sound-volume + .range-value').textContent = gameState.settings.soundVolume + '%';
        document.querySelector('#music-volume + .range-value').textContent = gameState.settings.musicVolume + '%';
    }
}

// 初始化游戏
const gameState = new GameState();
const game = new Game();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    game.loadSettingsUI();
    game.showScreen('main-menu');
    
    // 阻止触摸滚动
    document.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });
    
    // 阻止双击缩放
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            e.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
});