const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const terrainBiasSlider = document.getElementById('terrainBias');
const biasValueDisplay = document.getElementById('biasValue');

// Set canvas size
canvas.width = 800;
canvas.height = 600;

// Game state
const state = {
    terrainOffset: 0,
    baseSpeed: 2,
    currentSpeed: 2,
    minSpeed: 0.5,
    maxSpeed: 8,
    speedMultiplier: 1.5, // How much speed changes with each up/down press
    rectangle: {
        x: canvas.width / 2,
        y: 300,
        width: 40,
        height: 20,
        targetHeight: 50,
        velocity: 0,
        springConstant: 0.1,
        damping: 0.9,
        rotation: 0
    },
    feet: [
        // Left feet
        {
            x: 0,
            y: 0,
            velocity: { x: 0, y: 0 },
            grounded: false,
            targetOffsetX: -20,
            repositioning: false
        },
        {
            x: 0,
            y: 0,
            velocity: { x: 0, y: 0 },
            grounded: false,
            targetOffsetX: -10,
            repositioning: false
        },
        // Right foot
        {
            x: 0,
            y: 0,
            velocity: { x: 0, y: 0 },
            grounded: false,
            targetOffsetX: 20,
            repositioning: false
        }
    ],
    tileSize: 1,
    keys: {
        left: false,
        up: false,
        down: false
    },
    terrainCache: new Map(),
    terrainBias: 0,
    oscillatingBias: {
        active: false,
        time: 0,
        baseFrequency: 0.001,
        randomFrequency: 0.0005,
        amplitude: 1
    }
};

// Physics constants
const GRAVITY = 0.5;
const FOOT_DAMPING = 0.8;
const REPOSITION_SPEED = 3;
const MIN_DIST_THRESHOLD = 15;
const MAX_DIST_THRESHOLD = 25;
const FOOT_SPACING = 20;
const ARC_HEIGHT = 30;

// Update bias value display
terrainBiasSlider.addEventListener('input', (e) => {
    if (!state.oscillatingBias.active) {
        state.terrainBias = parseFloat(e.target.value);
        biasValueDisplay.textContent = state.terrainBias.toFixed(1);
    }
});

// Update oscillating bias
function updateOscillatingBias() {
    if (!state.oscillatingBias.active) return;

    // Create a complex oscillation using multiple sine waves
    const mainOscillation = Math.sin(state.oscillatingBias.time * state.oscillatingBias.baseFrequency);
    const randomOscillation = Math.sin(state.oscillatingBias.time * state.oscillatingBias.randomFrequency * (1 + seededRandom(state.oscillatingBias.time) * 0.5));
    
    // Combine oscillations
    state.terrainBias = (mainOscillation * 0.7 + randomOscillation * 0.3) * state.oscillatingBias.amplitude;
    biasValueDisplay.textContent = state.terrainBias.toFixed(1);
    terrainBiasSlider.value = state.terrainBias;

    // Update time
    state.oscillatingBias.time++;
}

// Terrain generation using a seeded random function
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Get terrain height at any x position
function getTerrainHeight(x) {
    // Check if we already calculated this height
    if (state.terrainCache.has(x)) {
        return state.terrainCache.get(x);
    }

    let height;
    if (x === 0) {
        height = canvas.height / 2;
    } else {
        const prevHeight = getTerrainHeight(x - 1);
        
        // Calculate target height based on bias
        // Map bias from [-1, 1] to [20%, 80%] of canvas height
        const targetHeight = canvas.height * (0.5 + state.terrainBias * 0.3);
        
        // Generate random change, but tend towards target height
        const distanceToTarget = targetHeight - prevHeight;
        const pullToTarget = distanceToTarget * 0.1; // Strength of pull towards target
        
        // Random variation plus pull towards target
        const randomChange = (seededRandom(x * 0.5) * 2 - 1) * 0.5;
        const totalChange = randomChange + pullToTarget;
        
        // Limit maximum change per step
        const maxStep = 1;
        const clampedChange = Math.max(-maxStep, Math.min(maxStep, totalChange));
        
        height = prevHeight + clampedChange;
        
        // Prevent terrain from going too high or too low
        const maxHeight = canvas.height * 0.1; // 10% from top
        const minHeight = canvas.height * 0.9; // 10% from bottom
        height = Math.max(maxHeight, Math.min(minHeight, height));
    }

    // Cache the result
    state.terrainCache.set(x, height);
    
    // Clear old cache entries periodically
    if (state.terrainCache.size > canvas.width * 2) {
        const keysToDelete = [];
        for (const [key] of state.terrainCache) {
            if (Math.abs(key - x) > canvas.width) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => state.terrainCache.delete(key));
    }

    return height;
}

// Update rectangle physics
function updateRectangle() {
    const worldX = Math.floor(state.rectangle.x + state.terrainOffset);
    const groundHeight = getTerrainHeight(worldX);
    const targetY = groundHeight - state.rectangle.targetHeight;
    const heightDiff = state.rectangle.y - targetY;
    
    // Apply spring force
    const force = -heightDiff * state.rectangle.springConstant;
    state.rectangle.velocity += force;
    
    // Apply damping
    state.rectangle.velocity *= state.rectangle.damping;
    
    // Update position
    state.rectangle.y += state.rectangle.velocity;
}

// Initialize feet positions
function initFeet() {
    state.feet.forEach(foot => {
        foot.x = state.rectangle.x + foot.targetOffsetX;
        foot.y = state.rectangle.y + state.rectangle.height/2;
    });
}

// Update feet physics
function updateFeet() {
    state.feet.forEach((foot, index) => {
        // Calculate ideal position relative to rectangle
        const idealX = state.rectangle.x + foot.targetOffsetX;
        const currentWorldX = foot.x + state.terrainOffset;
        const idealWorldX = state.rectangle.x + state.terrainOffset + foot.targetOffsetX;
        const distToTarget = currentWorldX - idealWorldX;

        // Check if foot needs repositioning
        let shouldReposition = false;
        if (index < 2) { // Left feet
            if (distToTarget < -MAX_DIST_THRESHOLD) {
                shouldReposition = true;
            }
        } else { // Right foot
            if (distToTarget > MIN_DIST_THRESHOLD) {
                shouldReposition = true;
            }
        }

        if (shouldReposition) {
            // Calculate new target position
            let targetX;
            if (index < 2) { // Left feet
                targetX = idealX + FOOT_SPACING * 3; // Move further ahead
            } else { // Right foot
                targetX = idealX - FOOT_SPACING * 3;
            }

            // Calculate ground height at target position
            const worldTargetX = Math.floor(targetX + state.terrainOffset);
            const groundHeight = getTerrainHeight(worldTargetX);
            
            // Create new foot at target position
            const newFoot = {
                x: targetX,
                y: groundHeight - ARC_HEIGHT * 1.5, // Start higher
                velocity: { x: 0, y: 4 }, // Faster fall
                grounded: false,
                targetOffsetX: foot.targetOffsetX,
                repositioning: false
            };
            
            // Replace the old foot
            state.feet[index] = newFoot;
        } else if (!foot.repositioning) {
            // Normal physics update
            foot.velocity.y += GRAVITY;
            foot.x += foot.velocity.x;
            foot.y += foot.velocity.y;
            
            // Ground collision check
            const worldX = Math.floor(foot.x + state.terrainOffset);
            const groundHeight = getTerrainHeight(worldX);
            
            if (foot.y > groundHeight) {
                foot.y = groundHeight;
                foot.velocity.y *= -0.1; // Less bounce
                foot.grounded = true;
            } else {
                foot.grounded = false;
            }
            
            // Apply damping
            foot.velocity.x *= FOOT_DAMPING;
            foot.velocity.y *= FOOT_DAMPING;
        }
    });
    
    // Update rectangle rotation based on feet positions in world space
    const leftY = (state.feet[0].y + state.feet[1].y) / 2;
    const rightY = state.feet[2].y;
    const dx = (state.feet[2].x + state.terrainOffset) - (state.feet[0].x + state.terrainOffset);
    const dy = rightY - leftY;
    state.rectangle.rotation = Math.atan2(dy, dx) * 0.5;
}

// Draw everything
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw terrain
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    
    // Draw terrain points for each pixel
    for (let x = 0; x < canvas.width; x++) {
        const worldX = Math.floor(x + state.terrainOffset);
        const terrainHeight = getTerrainHeight(worldX);
        ctx.lineTo(x, terrainHeight);
    }
    
    ctx.lineTo(canvas.width, canvas.height);
    ctx.fillStyle = '#654321';
    ctx.fill();

    // Draw target height line
    const targetHeight = canvas.height * (0.5 + state.terrainBias * 0.3);
    ctx.beginPath();
    ctx.moveTo(0, targetHeight);
    ctx.lineTo(canvas.width, targetHeight);
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.stroke();

    // Draw feet with proper offset and trails
    state.feet.forEach(foot => {
        // Draw foot
        ctx.fillStyle = foot.repositioning ? 'blue' : (foot.grounded ? 'green' : 'red');
        ctx.beginPath();
        const screenX = foot.x - state.terrainOffset;
        ctx.arc(screenX, foot.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw connection line
        ctx.beginPath();
        ctx.moveTo(screenX, foot.y);
        ctx.lineTo(state.rectangle.x, state.rectangle.y);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.stroke();
    });

    // Draw rectangle with rotation
    ctx.save();
    ctx.translate(state.rectangle.x, state.rectangle.y);
    ctx.rotate(state.rectangle.rotation);
    ctx.fillStyle = '#333';
    ctx.fillRect(
        -state.rectangle.width/2,
        -state.rectangle.height/2,
        state.rectangle.width,
        state.rectangle.height
    );
    
    // Draw center dot
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

// Game loop
function gameLoop() {
    // Handle speed changes
    if (state.keys.up) {
        state.currentSpeed = Math.min(state.maxSpeed, state.currentSpeed * state.speedMultiplier);
    }
    if (state.keys.down) {
        state.currentSpeed = Math.max(state.minSpeed, state.currentSpeed / state.speedMultiplier);
    }
    
    // Always move right
    let movement = state.currentSpeed;
    
    // Allow moving left
    if (state.keys.left) {
        movement = -state.currentSpeed;
    }
    
    // Update terrain offset
    state.terrainOffset += movement;

    updateOscillatingBias();
    updateRectangle();
    updateFeet();
    draw();
    requestAnimationFrame(gameLoop);
}

// Event listeners
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') state.keys.left = true;
    if (e.key === 'ArrowUp') state.keys.up = true;
    if (e.key === 'ArrowDown') state.keys.down = true;
    if (e.key.toLowerCase() === 'r') {
        state.oscillatingBias.active = !state.oscillatingBias.active;
        if (state.oscillatingBias.active) {
            state.oscillatingBias.time = 0;
            terrainBiasSlider.disabled = true;
        } else {
            terrainBiasSlider.disabled = false;
            state.terrainBias = parseFloat(terrainBiasSlider.value);
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') state.keys.left = false;
    if (e.key === 'ArrowUp') state.keys.up = false;
    if (e.key === 'ArrowDown') state.keys.down = false;
});

// Initialize feet and start the game
initFeet();
gameLoop(); 