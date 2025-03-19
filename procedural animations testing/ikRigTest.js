// Get the canvas context
const canvas = document.createElement('canvas');
canvas.width = 1200;
canvas.height = 600;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

// Constants
const CENTER_X = canvas.width / 2;
const CENTER_Y = canvas.height / 2;
const SEGMENT_LENGTH = 80;
const ITERATIONS = 10;
const TOLERANCE = 1;
const GRAVITY = 0.5;
const FRICTION = 0.95;
const STEP_SIZE = 20;
const TERRAIN_SCROLL_SPEED = -1;  // Negative for right to left movement
const LIFT_THRESHOLD = 269;
const LIFT_HEIGHT = 301;
const LIFT_TARGET_X = 775;
const LIFT_SPEED = 0.05;

// Debug flag
const DEBUG = true;

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    copy() {
        return new Point(this.x, this.y);
    }
}

class IKChain {
    constructor(startX, startY, segmentLength, numSegments) {
        this.basePoint = new Point(startX, startY);
        this.targetBaseX = startX;
        this.points = [this.basePoint];
        this.lengths = [];
        this.useStarboard = true;
        this.isLifting = false;
        this.liftProgress = 0;
        this.maxReach = 0;  // Calculate max reach distance
        
        // Initialize chain points with different lengths
        let currentX = startX;
        let totalLength = 0;
        for (let i = 0; i < numSegments; i++) {
            let length = segmentLength;
            if (i === 0) {
                length = segmentLength * 2;
            } else if (i === 1) {
                length = segmentLength * 1.5;
            }
            totalLength += length;
            currentX += length;
            this.points.push(new Point(currentX, startY));
            this.lengths.push(length);
        }
        
        this.maxReach = totalLength * 0.95;  // 95% of total length as max reach
        this.leaderLength = segmentLength * 2;
        this.leaderPoint = new Point(currentX + this.leaderLength, startY);

        if (DEBUG) {
            console.log('Chain created with points:', this.points);
            console.log('Segment lengths:', this.lengths);
            console.log('Max reach:', this.maxReach);
        }
    }

    updateBasePosition(targetX, targetY) {
        const distanceToTarget = Math.sqrt(
            Math.pow(targetX - this.basePoint.x, 2) + 
            Math.pow(targetY - this.basePoint.y, 2)
        );

        // Return adjusted target position if needed
        if (distanceToTarget > this.maxReach) {
            // Calculate direction vector
            const dx = targetX - this.basePoint.x;
            const dy = targetY - this.basePoint.y;
            const angle = Math.atan2(dy, dx);
            
            // Return new target position at max reach distance
            return new Point(
                this.basePoint.x + Math.cos(angle) * this.maxReach,
                this.basePoint.y + Math.sin(angle) * this.maxReach
            );
        }

        return new Point(targetX, targetY);
    }

    solve(targetX, targetY) {
        // Get potentially adjusted target position
        const adjustedTarget = this.updateBasePosition(targetX, targetY);
        const target = adjustedTarget;
        const base = this.basePoint.copy();
        
        // Stage 1: Solve for leader segment and first segment to find second node
        const stage1Result = this.solveTwoSegmentFABRIK(
            base,
            target,
            this.lengths[0],
            this.leaderLength,
            ITERATIONS
        );

        // Update first segment point and leader point
        this.points[1].x = stage1Result.point1.x;
        this.points[1].y = stage1Result.point1.y;
        this.leaderPoint.x = stage1Result.point2.x;
        this.leaderPoint.y = stage1Result.point2.y;

        // Calculate leader line angle
        const leaderAngle = Math.atan2(
            this.leaderPoint.y - this.points[1].y,
            this.leaderPoint.x - this.points[1].x
        );

        // Find both solutions for the remaining segments
        const portBase = new Point(
            this.points[1].x + Math.cos(leaderAngle + Math.PI/2) * 0.1,
            this.points[1].y + Math.sin(leaderAngle + Math.PI/2) * 0.1
        );
        
        const starboardBase = new Point(
            this.points[1].x + Math.cos(leaderAngle - Math.PI/2) * 0.1,
            this.points[1].y + Math.sin(leaderAngle - Math.PI/2) * 0.1
        );

        const portResult = this.solveOneSide(
            portBase,
            target,
            this.lengths[1],
            this.lengths[2],
            ITERATIONS,
            Math.PI/2
        );

        const starboardResult = this.solveOneSide(
            starboardBase,
            target,
            this.lengths[1],
            this.lengths[2],
            ITERATIONS,
            -Math.PI/2
        );

        // Choose the solution with highest total y-values
        const portY = portResult.point1.y + portResult.point2.y;
        const starboardY = starboardResult.point1.y + starboardResult.point2.y;
        
        const finalResult = portY > starboardY ? portResult : starboardResult;

        // Update remaining points with chosen solution
        this.points[2].x = finalResult.point1.x;
        this.points[2].y = finalResult.point1.y;
        this.points[3].x = finalResult.point2.x;
        this.points[3].y = finalResult.point2.y;

        // Apply angle constraints if needed
        const current = this.points[1];
        const next = this.points[2];
        const parent = this.points[0];
        const length = this.lengths[1];

        // Get angles
        const parentAngle = Math.atan2(current.y - parent.y, current.x - parent.x);
        let currentAngle = Math.atan2(next.y - current.y, next.x - current.x);
        
        // Calculate relative angle
        let relativeAngle = currentAngle - parentAngle;
        while (relativeAngle > Math.PI) relativeAngle -= 2 * Math.PI;
        while (relativeAngle < -Math.PI) relativeAngle += 2 * Math.PI;
        
        // Constrain angle if needed
        if (Math.abs(relativeAngle) > Math.PI) {
            relativeAngle = relativeAngle > 0 ? Math.PI : -Math.PI;
            
            // Apply constrained angle
            const constrainedAngle = parentAngle + relativeAngle;
            next.x = current.x + Math.cos(constrainedAngle) * length;
            next.y = current.y + Math.sin(constrainedAngle) * length;
            
            // Resolve final segment
            const finalBase = new Point(
                next.x + Math.cos(constrainedAngle + (portY > starboardY ? Math.PI/2 : -Math.PI/2)) * 0.1,
                next.y + Math.sin(constrainedAngle + (portY > starboardY ? Math.PI/2 : -Math.PI/2)) * 0.1
            );

            const finalSegment = this.solveOneSide(
                finalBase,
                target,
                this.lengths[2],
                0.1,
                ITERATIONS,
                portY > starboardY ? Math.PI/2 : -Math.PI/2
            );
            
            this.points[3].x = finalSegment.point1.x;
            this.points[3].y = finalSegment.point1.y;
        }
    }

    solveTwoSegmentFABRIK(basePoint, targetPoint, length1, length2, iterations) {
        // Find both solutions (port and starboard)
        const portSolution = this.solveOneSide(basePoint, targetPoint, length1, length2, iterations, Math.PI/2);
        const starboardSolution = this.solveOneSide(basePoint, targetPoint, length1, length2, iterations, -Math.PI/2);
        
        // Calculate total y-values for each solution
        const portY = portSolution.point1.y + portSolution.point2.y;
        const starboardY = starboardSolution.point1.y + starboardSolution.point2.y;
        
        // Return the solution with highest y-values
        return portY > starboardY ? portSolution : starboardSolution;
    }

    solveOneSide(basePoint, targetPoint, length1, length2, iterations, sideAngleOffset) {
        let point1 = new Point(basePoint.x + length1, basePoint.y);
        let point2 = new Point(point1.x + length2, point1.y);
        
        for (let i = 0; i < iterations; i++) {
            // Forward reaching
            point2.x = targetPoint.x;
            point2.y = targetPoint.y;
            
            const dist1 = point2.distanceTo(point1);
            const ratio1 = length2 / dist1;
            point1.x = point2.x + (point1.x - point2.x) * ratio1;
            point1.y = point2.y + (point1.y - point2.y) * ratio1;
            
            // Backward reaching
            const dist0 = point1.distanceTo(basePoint);
            const ratio0 = length1 / dist0;
            point1.x = basePoint.x + (point1.x - basePoint.x) * ratio0;
            point1.y = basePoint.y + (point1.y - basePoint.y) * ratio0;
            
            const dist2 = point1.distanceTo(point2);
            const ratio2 = length2 / dist2;
            point2.x = point1.x + (point2.x - point1.x) * ratio2;
            point2.y = point1.y + (point2.y - point1.y) * ratio2;

            // After backward reaching, apply a slight bias in the desired direction
            const baseToPoint1Angle = Math.atan2(point1.y - basePoint.y, point1.x - basePoint.x);
            const biasAngle = baseToPoint1Angle + sideAngleOffset;
            const biasForce = 0.1; // Small bias force
            point1.x += Math.cos(biasAngle) * biasForce;
            point1.y += Math.sin(biasAngle) * biasForce;
        }
        
        return { point1, point2 };
    }

    getSegmentAngles() {
        const angles = [];
        for (let i = 0; i < this.points.length - 1; i++) {
            const current = this.points[i];
            const next = this.points[i + 1];
            
            // Calculate angle in radians (clockwise from horizontal)
            let angle = Math.atan2(next.y - current.y, next.x - current.x);
            
            // Convert to clockwise angle from horizontal (in degrees)
            angle = (-angle * 180 / Math.PI) % 360;
            if (angle < 0) angle += 360;
            
            angles.push(angle);
        }
        return angles;
    }

    draw(ctx) {
        // Draw leader segment (semi-transparent)
        ctx.beginPath();
        ctx.moveTo(this.points[1].x, this.points[1].y);
        ctx.lineTo(this.leaderPoint.x, this.leaderPoint.y);
        ctx.strokeStyle = '#FF6B6B44';  // Semi-transparent red
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        // Draw segments with different colors
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1'];
        const angles = this.getSegmentAngles();
        
        for (let i = 0; i < this.points.length - 1; i++) {
            const current = this.points[i];
            const next = this.points[i + 1];
            
            // Draw segment
            ctx.beginPath();
            ctx.moveTo(current.x, current.y);
            ctx.lineTo(next.x, next.y);
            ctx.strokeStyle = colors[i];
            ctx.lineWidth = 8;
            ctx.lineCap = 'round';
            ctx.stroke();
            
            // Draw joint
            ctx.beginPath();
            ctx.arc(current.x, current.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = '#2C3E50';
            ctx.fill();

            // Draw angle
            const midX = (current.x + next.x) / 2;
            const midY = (current.y + next.y) / 2 - 20;
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = colors[i];
            ctx.fillText(`${Math.round(angles[i])}°`, midX, midY);
        }
        
        // Draw end effector joint
        const lastPoint = this.points[this.points.length - 1];
        ctx.beginPath();
        ctx.arc(lastPoint.x, lastPoint.y, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#2C3E50';
        ctx.fill();

        if (DEBUG) {
            // Draw debug info
            ctx.font = '12px Arial';
            ctx.fillStyle = 'black';
            for (let i = 0; i < this.points.length; i++) {
                const point = this.points[i];
                ctx.fillText(`P${i}: (${Math.round(point.x)}, ${Math.round(point.y)})`, point.x + 15, point.y);
            }
        }
    }
}

// Terrain definition
class Terrain {
    constructor() {
        this.segments = [];
        this.scrollOffset = 0;
        this.generateTerrain();
    }

    generateTerrainSegment(startX, startY) {
        const segmentWidth = 200;
        const nextX = Math.min(startX + segmentWidth, canvas.width + 400);
        
        // Randomly choose terrain type
        const terrainType = Math.floor(Math.random() * 5);
        let nextY = startY;

        switch (terrainType) {
            case 0: // Slope up
                nextY = Math.min(450, startY + Math.random() * 50);
                return [{
                    x1: startX,
                    y1: startY,
                    x2: nextX,
                    y2: nextY
                }];
            case 1: // Flat
                return [{
                    x1: startX,
                    y1: startY,
                    x2: nextX,
                    y2: startY
                }];
            case 2: // Slope down
                nextY = Math.max(350, startY - Math.random() * 50);
                return [{
                    x1: startX,
                    y1: startY,
                    x2: nextX,
                    y2: nextY
                }];
            case 3: // Stairs up
                const segments = [];
                let currentX = startX;
                let currentY = startY;
                while (currentX < nextX) {
                    const stepWidth = Math.min(STEP_SIZE, nextX - currentX);
                    segments.push({
                        x1: currentX,
                        y1: currentY,
                        x2: currentX + stepWidth,
                        y2: currentY
                    });
                    currentX += stepWidth;
                    currentY = Math.min(450, currentY + 10);
                }
                return segments;
            case 4: // Stairs down
                const segmentsDown = [];
                let currentXDown = startX;
                let currentYDown = startY;
                while (currentXDown < nextX) {
                    const stepWidth = Math.min(STEP_SIZE, nextX - currentXDown);
                    segmentsDown.push({
                        x1: currentXDown,
                        y1: currentYDown,
                        x2: currentXDown + stepWidth,
                        y2: currentYDown
                    });
                    currentXDown += stepWidth;
                    currentYDown = Math.max(350, currentYDown - 10);
                }
                return segmentsDown;
        }
    }

    generateTerrain() {
        this.segments = [];
        let currentX = 0;
        let currentY = 400;

        // Generate enough terrain to fill the canvas plus extra for scrolling
        while (currentX < canvas.width + 400) {
            const newSegments = this.generateTerrainSegment(currentX, currentY);
            this.segments.push(...newSegments);
            currentX = newSegments[newSegments.length - 1].x2;
            currentY = newSegments[newSegments.length - 1].y2;
        }
    }

    update() {
        // Scroll terrain
        this.scrollOffset += TERRAIN_SCROLL_SPEED;

        // Check if we need to generate more terrain
        if (this.segments.length > 0) {
            const firstSegment = this.segments[0];
            if (firstSegment.x2 - this.scrollOffset < -200) {  // Remove segments further off screen
                // Remove off-screen segments
                this.segments.shift();
            }

            // Generate new segments if needed
            const lastSegment = this.segments[this.segments.length - 1];
            if (lastSegment.x2 - this.scrollOffset < canvas.width + 600) {  // Generate further ahead
                const newSegments = this.generateTerrainSegment(
                    lastSegment.x2,
                    lastSegment.y2
                );
                this.segments.push(...newSegments);
            }
        } else {
            // If no segments exist, generate initial terrain
            this.generateTerrain();
        }
    }

    getHeightAt(x) {
        const scrolledX = x + this.scrollOffset;
        for (const segment of this.segments) {
            if (scrolledX >= segment.x1 && scrolledX <= segment.x2) {
                const t = (scrolledX - segment.x1) / (segment.x2 - segment.x1);
                return segment.y1 + t * (segment.y2 - segment.y1);
            }
        }
        return 450;
    }

    draw(ctx) {
        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        
        // Draw first segment from canvas bottom
        const firstY = this.getHeightAt(0);
        ctx.lineTo(0, firstY);

        // Draw all visible segments
        for (let x = 0; x <= canvas.width; x += 5) {
            const y = this.getHeightAt(x);
            ctx.lineTo(x, y);
        }

        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();

        ctx.fillStyle = '#654321';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.stroke();
    }
}

// Create terrain
const terrain = new Terrain();

// Modify target to include physics
class PhysicsTarget extends Point {
    constructor(x, y) {
        super(x, y);
        this.velocityX = 0;
        this.velocityY = 0;
        this.isGrounded = false;
        this.lastGroundY = 0;
        this.isJumping = false;
        this.jumpStartTime = 0;
        this.jumpStartX = 0;
        this.jumpStartY = 0;
        this.jumpPhase = 0; // 0: not jumping, 1: moving up, 2: moving sideways
    }

    update() {
        if (!isDragging) {
            // Check distance to base point
            const distanceToBase = Math.sqrt(
                Math.pow(this.x - chain.basePoint.x, 2) + 
                Math.pow(this.y - chain.basePoint.y, 2)
            );

            // Start jump if distance exceeds threshold
            if (distanceToBase > LIFT_THRESHOLD && !this.isJumping) {
                this.isJumping = true;
                this.jumpStartTime = performance.now();
                this.jumpStartX = this.x;
                this.jumpStartY = this.y;
                this.jumpPhase = 1;

                // Calculate target position 120 units away from base point
                const dx = this.x - chain.basePoint.x;
                const dy = this.y - chain.basePoint.y;
                const currentAngle = Math.atan2(dy, dx);
                const targetDistance = 120;
                this.jumpTargetX = chain.basePoint.x + Math.cos(currentAngle) * targetDistance;
                this.jumpTargetY = this.y - 75; // Reduce height by 75 units
            }

            // Handle jumping animation
            if (this.isJumping) {
                const currentTime = performance.now();
                const elapsedTime = (currentTime - this.jumpStartTime) / 1000; // Convert to seconds
                const jumpDuration = 0.75; // Total jump duration in seconds
                
                if (elapsedTime < jumpDuration) {
                    const progress = elapsedTime / jumpDuration;
                    
                    // Create elliptical motion
                    // Y movement is faster initially (sin^2)
                    const yProgress = Math.sin(progress * Math.PI / 2) ** 2;
                    // X movement is more linear (smooth step)
                    const xProgress = progress * progress * (3 - 2 * progress);
                    
                    this.y = this.jumpStartY + (this.jumpTargetY - this.jumpStartY) * yProgress;
                    this.x = this.jumpStartX + (this.jumpTargetX - this.jumpStartX) * xProgress;
                } else {
                    this.x = this.jumpTargetX;
                    this.y = this.jumpTargetY;
                    this.isJumping = false;
                }
            } else {
                // Normal physics when not jumping
                this.velocityY += GRAVITY;

                // Get ground height at current x position
                const groundY = terrain.getHeightAt(this.x);

                // Ground collision
                if (this.y >= groundY) {
                    this.y = groundY;
                    this.isGrounded = true;
                    
                    // Move with the terrain when grounded
                    if (this.isGrounded) {
                        // Calculate terrain slope for smooth movement
                        const nextX = this.x + TERRAIN_SCROLL_SPEED;
                        const nextGroundY = terrain.getHeightAt(nextX);
                        const slope = (nextGroundY - groundY) / Math.abs(TERRAIN_SCROLL_SPEED);
                        
                        // Update position based on terrain movement
                        this.x -= TERRAIN_SCROLL_SPEED;
                        this.y = groundY + slope * TERRAIN_SCROLL_SPEED;
                        
                        // Update velocity to match terrain movement
                        this.velocityX = -TERRAIN_SCROLL_SPEED;
                    }
                    
                    // Apply high friction when on ground
                    this.velocityX *= FRICTION;
                    
                    // Stop vertical movement
                    if (this.velocityY > 0) {
                        this.velocityY = 0;
                    }
                } else {
                    this.isGrounded = false;
                    // Update position with current velocity when in air
                    this.x += this.velocityX;
                    this.y += this.velocityY;
                }
            }

            // Boundary checks
            if (this.x < 0) {
                this.x = 0;
                this.velocityX = 0;
            } else if (this.x > canvas.width) {
                this.x = canvas.width;
                this.velocityX = 0;
            }
        }
    }
}

// Create IK chain and physics target
const chain = new IKChain(CENTER_X, CENTER_Y, SEGMENT_LENGTH, 3);
const target = new PhysicsTarget(450, 400);
let isDragging = false;

// Mouse interaction
canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if mouse is near target
    if (target.distanceTo(new Point(mouseX, mouseY)) < 20) {
        isDragging = true;
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        target.x = e.clientX - rect.left;
        target.y = e.clientY - rect.top;
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

// Animation loop
function animate() {
    // Clear canvas with a light background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Update and draw terrain
    terrain.update();
    terrain.draw(ctx);
    
    // Update target physics
    target.update();
    
    // Draw reference grid if debug is enabled
    if (DEBUG) {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
    
    // Solve IK
    chain.solve(target.x, target.y);
    
    // Draw chain
    chain.draw(ctx);
    
    // Draw target
    ctx.beginPath();
    ctx.arc(target.x, target.y, 12, 0, Math.PI * 2);
    ctx.fillStyle = target.isGrounded ? '#C0392B' : '#E74C3C';
    ctx.fill();
    ctx.strokeStyle = '#C0392B';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Request next frame
    requestAnimationFrame(animate);
}

// Start animation
animate(); 