// --- LOAD AUDIO ASSETS ---
const bgMusic = new Audio('background_music.mp3');
bgMusic.loop = true; // Loops seamlessly on the intro and death screens

const amb1 = new Audio('ambiance 2.1.mp3');
const amb2 = new Audio('Ambiance 2.2.mp3');
// Alternating ambiance loop
amb1.onended = () => amb2.play();
amb2.onended = () => amb1.play();

const sfxLazer = new Audio('lazer.mp3');
const sfxBlock = new Audio('block.mp3');
const sfxPain = new Audio('pain.mp3');
const sfxMonsterHurt = new Audio('monster_hurt.mp3');

// --- LOAD IMAGES ---
const monsterImages = [new Image(), new Image(), new Image(), new Image()];
monsterImages[0].src = 'monster1.png';
monsterImages[1].src = 'monster2.png';
monsterImages[2].src = 'monster3.png';
monsterImages[3].src = 'monster4.png'; 

const gameOverImage = new Image();
gameOverImage.src = 'loose.png'; 

const bossImage = new Image();
bossImage.src = 'boss_monster.png';

let monsters = [];
const MAX_MONSTERS = 6; 
const MONSTER_SPEED = 1.0;
let damageFlash = 0;

let lives = 5;
let killCount = 0;
let damageAccumulated = 0;
let isGameOver = false;
let gameOverTime = 0;
let iFrames = 0; 
let pendingBossSpawns = 0;
let killsNeededForLife = 3; 

function setDifficulty(killsAmount) {
    killsNeededForLife = killsAmount;
}

function hasLineOfSight(x1, y1, x2, y2, map, TILE_SIZE) {
    let dx = x2 - x1; let dy = y2 - y1;
    let distance = Math.hypot(dx, dy);
    let steps = distance / 10; 
    let stepX = dx / steps; let stepY = dy / steps;
    let currentX = x1; let currentY = y1;

    for (let i = 0; i < steps; i++) {
        let mapX = Math.floor(currentX / TILE_SIZE);
        let mapY = Math.floor(currentY / TILE_SIZE);
        if (map[mapY] && map[mapY][mapX] === 1) return false; 
        currentX += stepX; currentY += stepY;
    }
    return true; 
}

function spawnBoss(map, TILE_SIZE) {
    let spawned = false;
    while (!spawned) {
        let rY = Math.floor(Math.random() * map.length);
        let rX = Math.floor(Math.random() * map[0].length);
        
        if (map[rY][rX] === 0 && !(rX === 1 && rY === 1)) {
            monsters.push({
                x: rX * TILE_SIZE + (TILE_SIZE / 2),
                y: rY * TILE_SIZE + (TILE_SIZE / 2),
                hp: 10,               
                img: bossImage,       
                isBoss: true          
            });
            spawned = true;
        }
    }
}

function maintainHorde(map, TILE_SIZE) {
    while (monsters.length < MAX_MONSTERS) {
        let rY = Math.floor(Math.random() * map.length);
        let rX = Math.floor(Math.random() * map[0].length);
        
        if (map[rY][rX] === 0 && !(rX === 1 && rY === 1)) {
            let pixelX = rX * TILE_SIZE + (TILE_SIZE / 2);
            let pixelY = rY * TILE_SIZE + (TILE_SIZE / 2);
            
            let tooClose = false;
            for (let m of monsters) {
                if (Math.hypot(m.x - pixelX, m.y - pixelY) < TILE_SIZE * 3) {
                    tooClose = true; break;
                }
            }

            if (!tooClose) {
                monsters.push({
                    x: pixelX, y: pixelY, hp: 3,
                    img: monsterImages[Math.floor(Math.random() * 4)], 
                    isBoss: false
                });
            }
        }
    }
}

function updateMonsters(player, map, TILE_SIZE, keys) {
    maintainHorde(map, TILE_SIZE);
    
    while (pendingBossSpawns > 0) {
        spawnBoss(map, TILE_SIZE);
        pendingBossSpawns--;
    }
    
    const isShieldUp = keys.ShiftLeft || keys.ShiftRight;
    if (iFrames > 0) iFrames--; 
    
    for (let m of monsters) {
        let dx = player.x - m.x; let dy = player.y - m.y;
        let distance = Math.hypot(dx, dy);
        
        if (hasLineOfSight(m.x, m.y, player.x, player.y, map, TILE_SIZE)) {
            if (distance > 40) {
                let moveX = (dx / distance) * MONSTER_SPEED;
                let moveY = (dy / distance) * MONSTER_SPEED;
                if (map[Math.floor(m.y / TILE_SIZE)][Math.floor((m.x + moveX) / TILE_SIZE)] === 0) m.x += moveX;
                if (map[Math.floor((m.y + moveY) / TILE_SIZE)][Math.floor(m.x / TILE_SIZE)] === 0) m.y += moveY;
            } else if (distance <= 40 && iFrames === 0) {
                
                // --- NEW BLOCKING AUDIO LOGIC ---
                if (isShieldUp) {
                    sfxBlock.currentTime = 0;
                    sfxBlock.play();
                    iFrames = 30; // Gives the monster a brief cooldown after hitting the shield
                } else {
                    // --- NEW PAIN AUDIO LOGIC ---
                    damageFlash = 20; 
                    damageAccumulated += m.isBoss ? 2 : 1; 
                    iFrames = 30; 
                    
                    sfxPain.currentTime = 0;
                    sfxPain.play();

                    if (damageAccumulated >= 3) {
                        let livesLost = Math.floor(damageAccumulated / 3);
                        lives -= livesLost;
                        damageAccumulated = damageAccumulated % 3; 
                        
                        if (lives <= 0) {
                            isGameOver = true;
                            gameOverTime = Date.now(); 
                            
                            // Stop ambiance and trigger the Game Over track
                            amb1.pause();
                            amb2.pause();
                            bgMusic.currentTime = 0;
                            bgMusic.play();
                        }
                    }
                }
            }
        }
    }
}

function drawMonsters(ctx, player, SCREEN_WIDTH, SCREEN_HEIGHT, TILE_SIZE, FOV, zBuffer) {
    let dirX = Math.cos(player.angle); let dirY = Math.sin(player.angle);
    let planeX = -Math.sin(player.angle) * 0.577; let planeY = Math.cos(player.angle) * 0.577;

    monsters.sort((a, b) => {
        return (Math.pow(player.x - b.x, 2) + Math.pow(player.y - b.y, 2)) - 
               (Math.pow(player.x - a.x, 2) + Math.pow(player.y - a.y, 2));
    });

    for (let m of monsters) {
        let spriteX = m.x - player.x; let spriteY = m.y - player.y;
        let invDet = 1.0 / (planeX * dirY - dirX * planeY);
        let transformX = invDet * (dirY * spriteX - dirX * spriteY);
        let transformY = invDet * (-planeY * spriteX + planeX * spriteY); 

        if (transformY > 0) {
            let spriteScreenX = Math.floor((SCREEN_WIDTH / 2) * (1 + transformX / transformY));
            let spriteHeight = Math.abs((TILE_SIZE / transformY) * 440);
            let spriteWidth = spriteHeight; 
            
            let drawStartY = (SCREEN_HEIGHT / 2) - (spriteHeight / 2);
            let drawStartX = spriteScreenX - (spriteWidth / 2);
            let screenCol = Math.floor(spriteScreenX);
            
            if (screenCol >= 0 && screenCol < SCREEN_WIDTH && transformY < zBuffer[screenCol]) {
                if (m.img.complete && m.img.naturalWidth !== 0) {
                    ctx.drawImage(m.img, drawStartX, drawStartY, spriteWidth, spriteHeight);
                }
            }
        }
    }
}

function fireLaser(player, SCREEN_WIDTH, zBuffer) {
    let hitMonster = null; let closestDist = Infinity;
    let dirX = Math.cos(player.angle); let dirY = Math.sin(player.angle);
    let planeX = -Math.sin(player.angle) * 0.577; let planeY = Math.cos(player.angle) * 0.577;

    for (let m of monsters) {
        let spriteX = m.x - player.x; let spriteY = m.y - player.y;
        let invDet = 1.0 / (planeX * dirY - dirX * planeY);
        let transformX = invDet * (dirY * spriteX - dirX * spriteY);
        let transformY = invDet * (-planeY * spriteX + planeX * spriteY); 

        if (transformY > 0) {
            let spriteScreenX = Math.floor((SCREEN_WIDTH / 2) * (1 + transformX / transformY));
            let spriteWidth = Math.abs((64 / transformY) * 440);
            
            if (Math.abs(spriteScreenX - (SCREEN_WIDTH / 2)) < (spriteWidth / 2)) {
                if (transformY < zBuffer[SCREEN_WIDTH / 2] && transformY < closestDist) {
                    closestDist = transformY; hitMonster = m;
                }
            }
        }
    }

    if (hitMonster) {
        // --- NEW MONSTER HURT AUDIO ---
        sfxMonsterHurt.currentTime = 0;
        sfxMonsterHurt.play();
        
        hitMonster.hp -= 1;
        if (hitMonster.hp <= 0) {
            monsters = monsters.filter(m => m !== hitMonster);
            killCount++;
            
            if (killCount % killsNeededForLife === 0 && lives < 50) {
                lives++;
                if (lives % 10 === 0) pendingBossSpawns++;
            }
        }
    }
}

function drawUI(ctx, SCREEN_WIDTH, SCREEN_HEIGHT) {
    if (isGameOver) {
        if (gameOverImage.complete && gameOverImage.naturalWidth !== 0) {
            ctx.drawImage(gameOverImage, 0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        } else {
            ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
            ctx.fillStyle = '#ff0000'; ctx.font = 'bold 40px Courier New';
            ctx.textAlign = 'center'; ctx.fillText('YOU DIED', SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2);
        }

        if (Date.now() - gameOverTime > 5000) {
            ctx.fillStyle = '#8a0303'; ctx.font = 'bold 28px Courier New';
            ctx.textAlign = 'center'; ctx.fillText("... want to play again?", SCREEN_WIDTH / 2, SCREEN_HEIGHT - 60);
        }
        return; 
    }

    ctx.fillStyle = '#ff0000'; ctx.font = 'bold 24px Courier New';
    ctx.textAlign = 'right'; ctx.fillText(`KILLS: ${killCount}`, SCREEN_WIDTH - 20, 30);
    ctx.textAlign = 'left'; ctx.fillText(`LIVES: ${lives}`, 20, 30);
    
    ctx.fillStyle = '#ffaaaa';
    for(let i = 0; i < damageAccumulated; i++) {
        ctx.beginPath(); ctx.arc(30 + (i * 15), 45, 5, 0, Math.PI * 2); ctx.fill();
    }

    if (damageFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${damageFlash / 40})`;
        ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
        damageFlash--;
    }
}

function resetGameState() {
    lives = 5; killCount = 0; damageAccumulated = 0;
    monsters = []; isGameOver = false; iFrames = 0;
    pendingBossSpawns = 0;
}