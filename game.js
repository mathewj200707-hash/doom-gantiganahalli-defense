const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const SCREEN_WIDTH = canvas.width;
const SCREEN_HEIGHT = canvas.height;
const FOV = Math.PI / 3; 
const HALF_FOV = FOV / 2;
const TILE_SIZE = 64;
const MAP_SIZE = 12;
const MOVE_SPEED = 2.5;
const ROTATION_SPEED = 0.04;

const zBuffer = new Array(SCREEN_WIDTH).fill(0);

const map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

const MINIMAP_TILE_SIZE = 10; 
const player = { x: 96, y: 96, angle: 0 };

const keys = { 
    KeyW: false, KeyA: false, KeyS: false, KeyD: false, 
    ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false,
    ShiftLeft: false, ShiftRight: false, KeyE: false 
};

let isPlayerMoving = false;

// --------------------------------------------------------
// PROCEDURAL TEXTURE GENERATION
// --------------------------------------------------------
const textureSize = 64;

const wallTexture = document.createElement('canvas');
wallTexture.width = textureSize; wallTexture.height = textureSize;
const wCtx = wallTexture.getContext('2d');
wCtx.fillStyle = '#2a2a2a'; wCtx.fillRect(0, 0, textureSize, textureSize);
wCtx.strokeStyle = '#111111'; wCtx.lineWidth = 1;
for (let y = 0; y < textureSize; y += 16) {
    wCtx.beginPath(); wCtx.moveTo(0, y); wCtx.lineTo(textureSize, y); wCtx.stroke();
    const offset = (y % 32 === 0) ? 0 : 16;
    for (let x = offset; x < textureSize + offset; x += 32) {
        wCtx.beginPath(); wCtx.moveTo(x % textureSize, y); wCtx.lineTo(x % textureSize, y + 16); wCtx.stroke();
    }
}
for (let i = 0; i < 20; i++) {
    const sX = Math.random() * textureSize; const sY = Math.random() * (textureSize / 2);
    wCtx.strokeStyle = '#990000'; wCtx.lineWidth = Math.random() * 2 + 1;
    wCtx.beginPath(); wCtx.moveTo(sX, sY); wCtx.lineTo(sX, sY + (Math.random() * 25 + 10)); wCtx.stroke();
}

const floorTexture = document.createElement('canvas');
floorTexture.width = textureSize; floorTexture.height = textureSize;
const fCtx = floorTexture.getContext('2d');
fCtx.fillStyle = '#4A2E1B'; fCtx.fillRect(0, 0, textureSize, textureSize);
fCtx.fillStyle = '#dcd8c0'; fCtx.strokeStyle = '#dcd8c0';
for (let i = 0; i < 6; i++) {
    const bX = Math.random() > 0.5 ? Math.random() * 15 : textureSize - (Math.random() * 15) - 5;
    const bY = Math.random() * textureSize;
    fCtx.beginPath(); fCtx.arc(bX, bY, 2, 0, Math.PI * 2); fCtx.arc(bX + 8, bY + 4, 2, 0, Math.PI * 2); fCtx.fill();
    fCtx.lineWidth = 2; fCtx.beginPath(); fCtx.moveTo(bX, bY); fCtx.lineTo(bX + 8, bY + 4); fCtx.stroke();
}

const floorImageData = fCtx.getImageData(0, 0, textureSize, textureSize).data;
const floorColors = [];
for (let i = 0; i < textureSize * textureSize; i++) {
    floorColors.push(`rgb(${floorImageData[i * 4]},${floorImageData[i * 4 + 1]},${floorImageData[i * 4 + 2]})`);
}

// --------------------------------------------------------
// INPUT HANDLING
// --------------------------------------------------------
document.addEventListener('keydown', (e) => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = true; 
    
    if (e.code === 'KeyE' && !keys.ShiftLeft && !keys.ShiftRight) {
        equipment.fireTimer = 10; 
        
        // --- NEW LAZER AUDIO ---
        // (Audio elements are globally pulled from entities.js)
        sfxLazer.currentTime = 0;
        sfxLazer.play();
        
        fireLaser(player, SCREEN_WIDTH, zBuffer); 
    }
});

document.addEventListener('keyup', (e) => { 
    if (keys.hasOwnProperty(e.code)) keys[e.code] = false; 
});

window.addEventListener('blur', () => {
    for (let key in keys) keys[key] = false;
});

function movePlayer() {
    if (keys.KeyA || keys.ArrowLeft) player.angle -= ROTATION_SPEED;
    if (keys.KeyD || keys.ArrowRight) player.angle += ROTATION_SPEED;
    
    let actualMoveX = 0; let actualMoveY = 0;
    isPlayerMoving = false;

    if (keys.KeyW || keys.ArrowUp) { 
        actualMoveX = Math.cos(player.angle) * MOVE_SPEED; 
        actualMoveY = Math.sin(player.angle) * MOVE_SPEED; 
        isPlayerMoving = true; 
    }
    if (keys.KeyS || keys.ArrowDown) { 
        actualMoveX = -Math.cos(player.angle) * MOVE_SPEED; 
        actualMoveY = -Math.sin(player.angle) * MOVE_SPEED; 
        isPlayerMoving = true; 
    }
    
    let newX = player.x + actualMoveX; let newY = player.y + actualMoveY;
    
    const buffer = 15; 
    const checkX = actualMoveX > 0 ? newX + buffer : newX - buffer;
    const checkY = actualMoveY > 0 ? newY + buffer : newY - buffer;
    
    let currentGridY = Math.floor(player.y / TILE_SIZE);
    let currentGridX = Math.floor(player.x / TILE_SIZE);
    let targetGridX = Math.floor(checkX / TILE_SIZE);
    let targetGridY = Math.floor(checkY / TILE_SIZE);
    
    if (map[currentGridY] && map[currentGridY][targetGridX] === 0) player.x = newX;
    if (map[targetGridY] && map[targetGridY][currentGridX] === 0) player.y = newY;
}

// --------------------------------------------------------
// RENDERING PIPELINE
// --------------------------------------------------------
function renderSky() {
    const skyGradient = ctx.createLinearGradient(0, 0, 0, SCREEN_HEIGHT / 2);
    skyGradient.addColorStop(0, '#541212'); skyGradient.addColorStop(1, '#2a1414'); 
    ctx.fillStyle = skyGradient; ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT / 2);
}

function castFloor() {
    const BLOCK_SIZE = 4; 
    for (let y = SCREEN_HEIGHT / 2; y < SCREEN_HEIGHT; y += BLOCK_SIZE) {
        const p = y - SCREEN_HEIGHT / 2;
        if (p === 0) continue; 
        const z = (TILE_SIZE * 220) / p;
        const edgeDistance = z / Math.cos(HALF_FOV);
        const leftX = player.x + Math.cos(player.angle - HALF_FOV) * edgeDistance;
        const leftY = player.y + Math.sin(player.angle - HALF_FOV) * edgeDistance;
        const rightX = player.x + Math.cos(player.angle + HALF_FOV) * edgeDistance;
        const rightY = player.y + Math.sin(player.angle + HALF_FOV) * edgeDistance;
        const stepX = (rightX - leftX) / SCREEN_WIDTH;
        const stepY = (rightY - leftY) / SCREEN_WIDTH;
        let currentX = leftX; let currentY = leftY;

        for (let x = 0; x < SCREEN_WIDTH; x += BLOCK_SIZE) {
            const tx = (Math.floor(currentX) % textureSize + textureSize) % textureSize;
            const ty = (Math.floor(currentY) % textureSize + textureSize) % textureSize;
            ctx.fillStyle = floorColors[ty * textureSize + tx];
            ctx.fillRect(x, y, BLOCK_SIZE, BLOCK_SIZE);
            currentX += stepX * BLOCK_SIZE; currentY += stepY * BLOCK_SIZE;
        }
    }
    const shadowGrad = ctx.createLinearGradient(0, SCREEN_HEIGHT / 2, 0, SCREEN_HEIGHT);
    shadowGrad.addColorStop(0, 'rgba(0,0,0,0.8)'); shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = shadowGrad; ctx.fillRect(0, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT / 2);
}

function castRays() {
    for (let x = 0; x < SCREEN_WIDTH; x++) {
        const rayAngle = (player.angle - HALF_FOV) + (x / SCREEN_WIDTH) * FOV;
        let distanceToWall = 0; let hitWall = false;
        const eyeX = Math.cos(rayAngle); const eyeY = Math.sin(rayAngle);
        let hitX = 0; let hitY = 0;

        while (!hitWall && distanceToWall < MAP_SIZE * TILE_SIZE) {
            distanceToWall += 0.5; 
            hitX = player.x + eyeX * distanceToWall; hitY = player.y + eyeY * distanceToWall;
            const testX = Math.floor(hitX / TILE_SIZE); const testY = Math.floor(hitY / TILE_SIZE);
            if (testX < 0 || testX >= MAP_SIZE || testY < 0 || testY >= MAP_SIZE) {
                hitWall = true; distanceToWall = MAP_SIZE * TILE_SIZE; 
            } else if (map[testY][testX] === 1) { hitWall = true; }
        }

        const correctedDistance = distanceToWall * Math.cos(rayAngle - player.angle);
        zBuffer[x] = correctedDistance;
        const wallHeight = (TILE_SIZE / correctedDistance) * 440; 
        const wallTop = (SCREEN_HEIGHT / 2) - (wallHeight / 2);

        const blockX = Math.floor(hitX / TILE_SIZE);
        let textureX = 0;
        if (Math.abs(hitX - blockX * TILE_SIZE) < 1 || Math.abs(hitX - (blockX + 1) * TILE_SIZE) < 1) {
            textureX = Math.floor(hitY % TILE_SIZE);
        } else {
            textureX = Math.floor(hitX % TILE_SIZE);
        }
        textureX = Math.abs(textureX % textureSize);

        ctx.drawImage(wallTexture, textureX, 0, 1, textureSize, x, wallTop, 1, wallHeight);
        const shadowOpacity = Math.min(1, distanceToWall / (MAP_SIZE * TILE_SIZE * 0.7));
        ctx.fillStyle = `rgba(15, 5, 5, ${shadowOpacity})`; 
        ctx.fillRect(x, wallTop, 1, wallHeight);
    }
}

function drawMinimap() {
    for (let row = 0; row < MAP_SIZE; row++) {
        for (let col = 0; col < MAP_SIZE; col++) {
            ctx.fillStyle = map[row][col] === 1 ? 'rgba(80, 20, 20, 0.8)' : 'rgba(20, 15, 15, 0.5)';
            ctx.fillRect(col * MINIMAP_TILE_SIZE, row * MINIMAP_TILE_SIZE, MINIMAP_TILE_SIZE - 1, MINIMAP_TILE_SIZE - 1);
        }
    }
    const pX = (player.x / TILE_SIZE) * MINIMAP_TILE_SIZE;
    const pY = (player.y / TILE_SIZE) * MINIMAP_TILE_SIZE;
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(pX, pY, 3, 0, Math.PI * 2); ctx.fill();
}

function gameLoop() {
    if (typeof isGameOver !== 'undefined' && isGameOver) {
        ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        drawUI(ctx, SCREEN_WIDTH, SCREEN_HEIGHT); 
        requestAnimationFrame(gameLoop);
        return; 
    }

    movePlayer(); 
    updateMonsters(player, map, TILE_SIZE, keys);
    
    ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    
    renderSky();    
    castFloor(); 
    castRays();  
    
    drawMonsters(ctx, player, SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE, FOV, zBuffer);
    drawHUD(ctx, SCREEN_WIDTH, SCREEN_HEIGHT, keys, isPlayerMoving);
    
    drawUI(ctx, SCREEN_WIDTH, SCREEN_HEIGHT);  
    drawMinimap();  
    
    requestAnimationFrame(gameLoop);
}

// --- MAIN MENU INTERCEPT & AUDIO HANDLERS ---
const introScreen = document.getElementById('introScreen');
const startBtn = document.getElementById('startBtn');
const diffBtns = document.querySelectorAll('.diff-btn');

let selectedKillsForLife = 3; 

// --- OVERCOME BROWSER AUTOPLAY RESTRICTIONS ---
// Listen for the very first click on the document to start the background music.
document.body.addEventListener('click', function unlockAudio() {
    if (introScreen.style.display !== 'none' && bgMusic.paused) {
        bgMusic.play().catch(e => console.log("Waiting for user interaction..."));
    }
    document.body.removeEventListener('click', unlockAudio); // Run once
}, { once: true });


diffBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        diffBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        selectedKillsForLife = parseInt(e.target.getAttribute('data-kills'));
    });
});

startBtn.addEventListener('click', () => {
    introScreen.style.display = 'none';
    setDifficulty(selectedKillsForLife);
    
    // --- AUDIO TRANSITION: Menu -> Game ---
    bgMusic.pause();
    amb1.currentTime = 0;
    amb1.play();
    
    window.focus(); 
    gameLoop();
});

canvas.addEventListener('click', () => {
    if (typeof isGameOver !== 'undefined' && isGameOver) {
        if (Date.now() - gameOverTime > 5000) {
            resetGameState();
            player.x = 96;
            player.y = 96;
            player.angle = 0;
            
            // --- AUDIO TRANSITION: Game Over -> Game ---
            bgMusic.pause();
            amb1.currentTime = 0;
            amb1.play();
        }
    }
});