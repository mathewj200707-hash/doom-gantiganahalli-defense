// Load external sprites
const customGunImage = new Image();
customGunImage.src = 'blaster.webp';

// State trackers for the HUD
const equipment = {
    bobTime: 0,
    fireTimer: 0,
    shieldY: 480, // Starts off-screen
    shieldTargetY: 480
};

// We pass the screen dimensions and key states into this function from game.js
function drawHUD(ctx, screenWidth, screenHeight, keys, isMoving) {
    // Bobbing calculations
    if (isMoving) {
        equipment.bobTime += 0.15;
    } else {
        equipment.bobTime = 0; // Reset to center
    }
    const bobX = Math.cos(equipment.bobTime) * 15;
    const bobY = Math.abs(Math.sin(equipment.bobTime)) * 15;

    // --- SICKLY GREEN LASER BEAM ---
    if (equipment.fireTimer > 0) {
        ctx.save();
        ctx.strokeStyle = '#39ff14'; // Neon Green
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#39ff14';
        ctx.lineWidth = Math.random() * 5 + 3; // Flickering thickness

        ctx.beginPath();
        // Laser originates from roughly where the gun barrel will be
        ctx.moveTo(screenWidth - 150 + bobX, screenHeight - 150 + bobY); 
        ctx.lineTo(screenWidth / 2, screenHeight / 2); // To exact center crosshair
        ctx.stroke();
        
        // Inner white core for realistic laser effect
        ctx.strokeStyle = '#ffffff';
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.restore();
        equipment.fireTimer--;
    }

    // --- CUSTOM SPRITE BLASTER ---
    ctx.save();
    // Only draw if the image has successfully loaded into the browser
    if (customGunImage.complete && customGunImage.naturalWidth !== 0) {
        // Standard size for a retro FPS weapon sprite. 
        // You can tweak these numbers if your specific PNG looks too big or too small!
        const spriteWidth = 300; 
        const spriteHeight = 300;
        
        // Position to pin it to the bottom right, factoring in the bobbing motion
        const drawX = screenWidth - (spriteWidth / 1.5) + bobX;
        const drawY = screenHeight - spriteHeight + bobY + 50; 

        ctx.drawImage(customGunImage, drawX, drawY, spriteWidth, spriteHeight);
    } else {
        // Fallback text just in case the image fails to load
        ctx.fillStyle = 'red';
        ctx.font = '16px Arial';
        ctx.fillText('Loading blaster.png...', screenWidth - 160, screenHeight - 50);
    }
    ctx.restore();

    // --- GRIMY SPIKED SHIELD ---
    const isShieldUp = keys.ShiftLeft || keys.ShiftRight;
    equipment.shieldTargetY = isShieldUp ? screenHeight - 220 : screenHeight + 100;
    equipment.shieldY += (equipment.shieldTargetY - equipment.shieldY) * 0.15; // Smooth slide

    ctx.save();
    ctx.translate(180 + (bobX * 0.3), equipment.shieldY + (bobY * 0.3)); 
    
    // Rusty Spikes
    ctx.fillStyle = '#4a433c'; 
    for(let i = 0; i < 8; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 / 8) * i);
        ctx.beginPath();
        ctx.moveTo(-15, -110);
        ctx.lineTo(0, -145); 
        ctx.lineTo(15, -110);
        ctx.fill();
        ctx.restore();
    }

    // Main Shield Body (Base)
    ctx.fillStyle = '#171a21';
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.fill();

    // Grime, Dirt, and Rust Layer
    const grime = ctx.createRadialGradient(0, 0, 20, 0, 0, 120);
    grime.addColorStop(0, 'rgba(0, 0, 0, 0)'); // Clean center
    grime.addColorStop(0.6, 'rgba(60, 40, 10, 0.5)'); // Mud/Rust mid-ring
    grime.addColorStop(1, 'rgba(10, 5, 0, 0.9)'); // Heavily soiled edges
    ctx.fillStyle = grime;
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.fill();

    // Battle Damage (Scratches)
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-40, -60); ctx.lineTo(-20, -10);
    ctx.moveTo(50, -40); ctx.lineTo(30, 20);
    ctx.moveTo(60, -35); ctx.lineTo(40, 25);
    ctx.stroke();

    // Shield Rim
    ctx.strokeStyle = '#3d3e42';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 116, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Glowing Core (Activates on Shift)
    ctx.fillStyle = isShieldUp ? '#3b82f6' : '#101d36'; 
    ctx.shadowBlur = isShieldUp ? 30 : 0;
    ctx.shadowColor = '#3b82f6';
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();

    // --- CROSSHAIR ---
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect((screenWidth / 2) - 2, (screenHeight / 2) - 2, 4, 4);
}