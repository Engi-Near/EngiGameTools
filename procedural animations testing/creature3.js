// Get the canvas context
const canvas = document.createElement('canvas');
canvas.width = 1200;  // Increased width
canvas.height = 600;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

// Physics constants
const GRAVITY = 0.5;
const FRICTION = 0.98;
const FOOT_FRICTION = 0.7;  // Strong friction for feet
const GROUND_Y = 550;
const NORMAL_LINE_LENGTH = 30;  // Length of perpendicular lines
const SPRING_STIFFNESS = 0.8;  // Increased rigidity
const SPRING_DAMPING = 0.95;   // Increased damping
const CONNECTION_LENGTH = 100;  // Fixed length for connecting lines
const SETTLING_FRAMES = 30;  // Number of frames to gradually ramp up physics

// Terrain definition
const terrain = {
    // Define terrain segments
    segments: [
        // Left trapezoid
        { type: 'line', x1: 0, y1: GROUND_Y, x2: 200, y2: GROUND_Y - 100 },
        { type: 'line', x2: 400, y2: GROUND_Y },
        // Middle flat section
        { type: 'line', x2: 800, y2: GROUND_Y },
        // Right stairs (5 steps)
        { type: 'line', x2: 880, y2: GROUND_Y - 16 },
        { type: 'line', x2: 960, y2: GROUND_Y - 16 },
        { type: 'line', x2: 960, y2: GROUND_Y - 32 },
        { type: 'line', x2: 1040, y2: GROUND_Y - 32 },
        { type: 'line', x2: 1040, y2: GROUND_Y - 48 },
        { type: 'line', x2: 1120, y2: GROUND_Y - 48 },
        { type: 'line', x2: 1120, y2: GROUND_Y - 64 },
        { type: 'line', x2: 1200, y2: GROUND_Y - 64 }
    ],
    
    // Get ground Y and normal angle at given X position
    getGroundInfo(x) {
        let prevX = 0;
        let prevY = GROUND_Y;
        
        for (const segment of this.segments) {
            const x2 = segment.x2;
            const y2 = segment.y2;
            
            if (x <= x2) {
                // Found the correct segment
                const dx = x2 - prevX;
                const dy = y2 - prevY;
                const t = (x - prevX) / dx;
                const y = prevY + t * dy;
                const angle = Math.atan2(dy, dx);
                return {
                    y: y,
                    normalAngle: angle - Math.PI/2
                };
            }
            
            prevX = x2;
            prevY = y2;
        }
        
        // Default to last segment if beyond
        return {
            y: prevY,
            normalAngle: -Math.PI/2
        };
    }
};

// Rectangle class with physics
class Rectangle {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.angle = 0;
        this.velocityX = 0;
        this.velocityY = 0;
        this.angularVelocity = 0;
        this.isGrabbed = false;
        this.angularFriction = 0.95;
        this.restitution = 0.1;      // Reduced bounce factor
        this.mass = 1.0;
        this.inertia = (width * width + height * height) * this.mass / 12;
        this.frictionCoeff = 0.8;    // Increased surface friction
        this.minBounceSpeed = 0.5;   // Minimum speed for bouncing
    }

    update() {
        if (!this.isGrabbed) {
            // Apply gravity
            this.velocityY += GRAVITY;
            
            // Apply friction and damping
            this.velocityX *= FRICTION;
            this.velocityY *= FRICTION;
            this.angularVelocity *= this.angularFriction;
            
            // Update position and rotation
            this.x += this.velocityX;
            this.y += this.velocityY;
            this.angle += this.angularVelocity;
            
            // Ground collision with terrain and rotation
            const corners = this.getCorners();
            let hasCollision = false;
            let maxImpulse = 0;
            let totalNormalX = 0;
            let totalNormalY = 0;
            let collisionCount = 0;
            
            // First pass: gather collision information
            for (const corner of corners) {
                const groundInfo = terrain.getGroundInfo(corner.x);
                if (corner.y > groundInfo.y) {
                    hasCollision = true;
                    collisionCount++;
                    
                    // Calculate collision normal
                    const normal = {
                        x: Math.cos(groundInfo.normalAngle),
                        y: Math.sin(groundInfo.normalAngle)
                    };
                    
                    totalNormalX += normal.x;
                    totalNormalY += normal.y;
                    
                    // Calculate relative velocity at collision point
                    const r = {
                        x: corner.x - this.x,
                        y: corner.y - this.y
                    };
                    
                    const relativeVelocity = {
                        x: this.velocityX - this.angularVelocity * r.y,
                        y: this.velocityY + this.angularVelocity * r.x
                    };
                    
                    // Calculate relative velocity along normal
                    const normalVelocity = 
                        relativeVelocity.x * normal.x + 
                        relativeVelocity.y * normal.y;
                    
                    // Only resolve collision if we're moving into the surface
                    if (normalVelocity < 0) {
                        // Calculate impulse scalar
                        const rCrossN = r.x * normal.y - r.y * normal.x;
                        
                        // Use restitution only if moving fast enough
                        const effectiveRestitution = 
                            Math.abs(normalVelocity) > this.minBounceSpeed ? 
                            this.restitution : 0;
                        
                        const impulseScalar = -(1 + effectiveRestitution) * normalVelocity /
                            (1/this.mass + (rCrossN * rCrossN) / this.inertia);
                        
                        maxImpulse = Math.max(maxImpulse, Math.abs(impulseScalar));
                        
                        // Apply impulse
                        this.velocityX += impulseScalar * normal.x / this.mass;
                        this.velocityY += impulseScalar * normal.y / this.mass;
                        this.angularVelocity += (rCrossN * impulseScalar) / this.inertia;
                        
                        // Move out of collision
                        const overlap = corner.y - groundInfo.y;
                        this.y -= overlap;
                        
                        // Apply surface friction
                        const tangent = {
                            x: -normal.y,
                            y: normal.x
                        };
                        const tangentVelocity = 
                            relativeVelocity.x * tangent.x + 
                            relativeVelocity.y * tangent.y;
                        
                        // Scale friction by impact force
                        const frictionScale = Math.min(1.0, Math.abs(impulseScalar) / 10);
                        const frictionImpulse = -tangentVelocity * this.frictionCoeff * frictionScale;
                        
                        this.velocityX += frictionImpulse * tangent.x / this.mass;
                        this.velocityY += frictionImpulse * tangent.y / this.mass;
                        this.angularVelocity += 
                            (r.x * tangent.y - r.y * tangent.x) * 
                            frictionImpulse / this.inertia;
                    }
                }
            }
            
            // Apply additional damping on high-impact collisions
            if (maxImpulse > 10) {
                const dampingFactor = 0.8;
                this.velocityX *= dampingFactor;
                this.velocityY *= dampingFactor;
                this.angularVelocity *= dampingFactor;
            }
            
            // Keep angle normalized between -PI and PI
            this.angle = ((this.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            if (this.angle > Math.PI) {
                this.angle -= Math.PI * 2;
            }
        }
    }

    getCorners() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const halfWidth = this.width / 2;
        const halfHeight = this.height / 2;
        
        return [
            {
                x: this.x + cos * halfWidth - sin * halfHeight,
                y: this.y + sin * halfWidth + cos * halfHeight
            },
            {
                x: this.x - cos * halfWidth - sin * halfHeight,
                y: this.y - sin * halfWidth + cos * halfHeight
            },
            {
                x: this.x - cos * halfWidth + sin * halfHeight,
                y: this.y - sin * halfWidth - cos * halfHeight
            },
            {
                x: this.x + cos * halfWidth + sin * halfHeight,
                y: this.y + sin * halfWidth - cos * halfHeight
            }
        ];
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        ctx.beginPath();
        ctx.rect(-this.width/2, -this.height/2, this.width, this.height);
        ctx.fillStyle = '#8B4513';  // Saddle brown color
        ctx.fill();
        ctx.strokeStyle = '#4A2511';  // Darker brown for border
        ctx.stroke();
        
        // Draw a line to indicate rotation
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(this.width/2, 0);
        ctx.strokeStyle = 'black';
        ctx.stroke();
        
        ctx.restore();
    }

    isPointInside(x, y) {
        // Transform point to rectangle's local space
        const dx = x - this.x;
        const dy = y - this.y;
        const cos = Math.cos(-this.angle);
        const sin = Math.sin(-this.angle);
        
        const localX = dx * cos - dy * sin;
        const localY = dx * sin + dy * cos;
        
        return Math.abs(localX) <= this.width/2 && Math.abs(localY) <= this.height/2;
    }
}

// Create rectangle with initial position above ground
const rectangle = new Rectangle(400, GROUND_Y - 100, 80, 40);

// Foot node class
class FootNode {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.radius = 10;
        this.color = color;
        this.velocityX = 0;
        this.velocityY = 0;
        this.isGrabbed = false;
        
        // Normal line rotation properties
        this.currentNormalAngle = -Math.PI/2;  // Start pointing up
        this.normalAngularVelocity = 0;
        this.normalRotationAccel = 0.001;      // Base acceleration
        this.normalRotationDamping = 0.98;
        
        // Second segment properties
        this.segmentLength = 30;
        this.segmentAngle = 0;
        this.segmentEndX = 0;
        this.segmentEndY = 0;
        this.maxAngle = Math.PI / 6;  // 30 degrees
        this.preferredSide = (color === '#0000FF') ? -1 : 1;  // -1 for left, 1 for right
        this.targetAngle = this.preferredSide * this.maxAngle * 0.7;  // 70% of max angle
        this.segmentAngularVelocity = 0;
        this.segmentAngularDamping = 0.95;
        this.segmentRotationStrength = 0.003;
        
        // Spring connection properties
        this.springEndX = 0;
        this.springEndY = 0;
        this.springRestLength = CONNECTION_LENGTH;
        
        // Increased friction for foot nodes
        this.frictionCoeff = 0.95;  // Very high friction when on ground
        
        // Add settling property
        this.physicsScale = 0;
        
        // Initialize segment end positions
        this.updateSegmentPositions();
    }

    normalizeAngle(angle) {
        return Math.atan2(Math.sin(angle), Math.cos(angle));
    }

    updateSegmentPositions() {
        // Calculate end positions for both segments
        const normalEndX = this.x + Math.cos(this.currentNormalAngle) * NORMAL_LINE_LENGTH;
        const normalEndY = this.y + Math.sin(this.currentNormalAngle) * NORMAL_LINE_LENGTH;
        
        const totalAngle = this.currentNormalAngle + this.segmentAngle;
        this.segmentEndX = normalEndX + Math.cos(totalAngle) * this.segmentLength;
        this.segmentEndY = normalEndY + Math.sin(totalAngle) * this.segmentLength;
    }

    update() {
        // Scale physics forces during settling period
        if (this.physicsScale < 1) {
            this.physicsScale = Math.min(1, this.physicsScale + 1/SETTLING_FRAMES);
        }

        if (!this.isGrabbed) {
            // Apply scaled gravity
            this.velocityY += GRAVITY * this.physicsScale;
            
            // Apply friction
            this.velocityX *= FRICTION;
            this.velocityY *= FRICTION;
            
            // Update position
            this.x += this.velocityX;
            this.y += this.velocityY;
            
            // Ground collision with terrain
            const groundInfo = terrain.getGroundInfo(this.x);
            if (this.y + this.radius > groundInfo.y) {
                this.y = groundInfo.y - this.radius;
                this.velocityY = 0;
                
                // Apply enhanced friction based on slope
                const slopeAngle = groundInfo.normalAngle + Math.PI/2;
                const slopeFriction = Math.abs(Math.cos(slopeAngle)) * this.frictionCoeff;
                this.velocityX *= (1 - slopeFriction);
                this.velocityX += Math.sin(slopeAngle) * GRAVITY;
                
                // Update normal line rotation with corrected angle calculation
                const targetAngle = this.normalizeAngle(groundInfo.normalAngle);
                const currentAngle = this.normalizeAngle(this.currentNormalAngle);
                let angleDiff = this.normalizeAngle(targetAngle - currentAngle);
                
                // Calculate rotation force based on distance to target
                const distanceToTarget = Math.abs(angleDiff);
                const accelerationScale = Math.min(1, (Math.PI/2 - distanceToTarget) * 2);
                const rotationForce = angleDiff * this.normalRotationAccel * (1 + accelerationScale * 3);
                
                // Apply rotation
                this.normalAngularVelocity += rotationForce;
                this.normalAngularVelocity *= this.normalRotationDamping;
                this.currentNormalAngle = this.normalizeAngle(this.currentNormalAngle + this.normalAngularVelocity);
            } else {
                // When not on ground, trend towards upward (-PI/2)
                const targetAngle = -Math.PI/2;
                const currentAngle = this.normalizeAngle(this.currentNormalAngle);
                let angleDiff = this.normalizeAngle(targetAngle - currentAngle);
                
                // Smoother transition when in air
                const rotationForce = angleDiff * this.normalRotationAccel;
                this.normalAngularVelocity += rotationForce;
                this.normalAngularVelocity *= this.normalRotationDamping;
                this.currentNormalAngle = this.normalizeAngle(this.currentNormalAngle + this.normalAngularVelocity);
            }
            
            // Always update second segment with preferred side bias
            const angleToTarget = this.targetAngle - this.segmentAngle;
            this.segmentAngularVelocity += angleToTarget * this.segmentRotationStrength;
            this.segmentAngularVelocity *= this.segmentAngularDamping;
            this.segmentAngle += this.segmentAngularVelocity;
        }
        
        // Always update segment positions
        this.updateSegmentPositions();
    }

    updateSpringConnection(rectangle) {
        if (this.color === '#FF0000' || this.color === '#0000FF') {
            // Get the bottom corner of the rectangle based on foot color
            const isLeft = this.color === '#FF0000';
            const corners = rectangle.getCorners();
            const targetCorner = isLeft ? corners[1] : corners[0];  // Bottom corners
            
            // Calculate direction vector from segment end to target corner
            const dx = targetCorner.x - this.segmentEndX;
            const dy = targetCorner.y - this.segmentEndY;
            const currentLength = Math.sqrt(dx * dx + dy * dy);
            
            if (currentLength > 0) {
                // Normalize direction vector
                const dirX = dx / currentLength;
                const dirY = dy / currentLength;
                
                // Set end position to maintain fixed length
                this.springEndX = this.segmentEndX + dirX * this.springRestLength;
                this.springEndY = this.segmentEndY + dirY * this.springRestLength;
                
                // Calculate force based on stretch with settling scale
                const stretch = currentLength - this.springRestLength;
                const forceX = dirX * stretch * SPRING_STIFFNESS * this.physicsScale;
                const forceY = dirY * stretch * SPRING_STIFFNESS * this.physicsScale;
                
                // Apply scaled forces to both objects if not grabbed
                if (!rectangle.isGrabbed) {
                    rectangle.velocityX += forceX / rectangle.mass;
                    rectangle.velocityY += forceY / rectangle.mass;
                    
                    // Apply scaled torque to rectangle
                    const r = {
                        x: targetCorner.x - rectangle.x,
                        y: targetCorner.y - rectangle.y
                    };
                    const torque = (r.x * forceY - r.y * forceX) / rectangle.inertia;
                    rectangle.angularVelocity += torque * 0.1 * this.physicsScale;
                }
                
                if (!this.isGrabbed) {
                    // Apply scaled opposite force to foot node
                    this.velocityX -= forceX * 2 * this.physicsScale;
                    this.velocityY -= forceY * 2 * this.physicsScale;
                }
            }
        }
    }

    draw(ctx) {
        // Draw the circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.stroke();
        ctx.closePath();

        // Always draw normal line and second segment
        const normalEndX = this.x + Math.cos(this.currentNormalAngle) * NORMAL_LINE_LENGTH;
        const normalEndY = this.y + Math.sin(this.currentNormalAngle) * NORMAL_LINE_LENGTH;
        
        // Draw normal line
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(normalEndX, normalEndY);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw second segment
        ctx.beginPath();
        ctx.moveTo(normalEndX, normalEndY);
        ctx.lineTo(this.segmentEndX, this.segmentEndY);
        ctx.strokeStyle = `${this.color}88`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw end point of second segment
        ctx.beginPath();
        ctx.arc(this.segmentEndX, this.segmentEndY, 3, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();

        // Draw spring connection for red and blue feet
        if (this.color === '#FF0000' || this.color === '#0000FF') {
            ctx.beginPath();
            ctx.moveTo(this.segmentEndX, this.segmentEndY);
            ctx.lineTo(this.springEndX, this.springEndY);
            ctx.strokeStyle = `${this.color}AA`;  // Slightly more opaque than second segment
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    }

    isPointInside(x, y) {
        const dx = this.x - x;
        const dy = this.y - y;
        return Math.sqrt(dx * dx + dy * dy) <= this.radius;
    }
}

// Create foot nodes with better initial positions
const feet = [
    new FootNode(350, GROUND_Y - 20, '#FF0000'),  // Left foot
    new FootNode(400, GROUND_Y - 20, '#00FF00'),  // Middle foot
    new FootNode(450, GROUND_Y - 20, '#0000FF')   // Right foot
];

// Mouse interaction variables
let selectedObject = null;
let grabOffsetX = 0;
let grabOffsetY = 0;
let mouseX = 0;
let mouseY = 0;

// Mouse event handlers
canvas.addEventListener('mousedown', (e) => {
    const canvasRect = canvas.getBoundingClientRect();
    mouseX = e.clientX - canvasRect.left;
    mouseY = e.clientY - canvasRect.top;

    // Check rectangle first
    if (rectangle.isPointInside(mouseX, mouseY)) {
        selectedObject = rectangle;
        selectedObject.isGrabbed = true;
        grabOffsetX = mouseX - rectangle.x;
        grabOffsetY = mouseY - rectangle.y;
        return;
    }

    // Then check feet
    for (const foot of feet) {
        if (foot.isPointInside(mouseX, mouseY)) {
            selectedObject = foot;
            selectedObject.isGrabbed = true;
            grabOffsetX = mouseX - foot.x;
            grabOffsetY = mouseY - foot.y;
            break;
        }
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (selectedObject) {
        const canvasRect = canvas.getBoundingClientRect();
        mouseX = e.clientX - canvasRect.left;
        mouseY = e.clientY - canvasRect.top;
        
        // Update position
        selectedObject.x = mouseX - grabOffsetX;
        selectedObject.y = mouseY - grabOffsetY;
        
        // Reset velocities
        selectedObject.velocityX = 0;
        selectedObject.velocityY = 0;
        if (selectedObject instanceof Rectangle) {
            selectedObject.angularVelocity = 0;
        }
    }
});

canvas.addEventListener('mouseup', () => {
    if (selectedObject) {
        selectedObject.isGrabbed = false;
        selectedObject = null;
    }
});

// Update animation loop
function animate() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw terrain
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    ctx.lineTo(0, GROUND_Y);
    
    let prevX = 0;
    let prevY = GROUND_Y;
    
    for (const segment of terrain.segments) {
        ctx.lineTo(segment.x2, segment.y2);
        prevX = segment.x2;
        prevY = segment.y2;
    }
    
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    
    ctx.fillStyle = '#654321';  // Brown color for terrain
    ctx.fill();
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Update spring connections before drawing
    for (const foot of feet) {
        foot.updateSpringConnection(rectangle);
    }
    
    // Update and draw rectangle
    rectangle.update();
    rectangle.draw(ctx);
    
    // Update and draw feet
    for (const foot of feet) {
        foot.update();
        foot.draw(ctx);
    }
    
    // Request next frame
    requestAnimationFrame(animate);
}

// Start animation
animate(); 