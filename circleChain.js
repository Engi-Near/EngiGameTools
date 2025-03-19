const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Constants
const CIRCLE_RADIUS = 15;
const CHAIN_LENGTH = 22.5; // 3/4 of the original 30
const POINTS_COUNT = 14; // Added 2 more nodes
const ITERATIONS = 10; // Physics iterations for constraint solving
const PATH_SPEED = 0.002; // Speed of movement along the path

// Animation state
let isFollowingPath = false;
let pathTime = 0;

// Path parameters
function updatePathParameters() {
    const width = window.innerWidth * 0.75;
    const height = window.innerHeight * 0.75;
    return { width, height };
}

let pathParams = updatePathParameters();

// Update path parameters when window is resized
window.addEventListener('resize', () => {
    pathParams = updatePathParameters();
});

// Calculate position on modified elliptical path
function getPathPosition(t) {
    const { width, height } = pathParams;
    const theta = t * Math.PI * 2;
    const r = 1 + 1/4 * Math.sin(theta);
    // Center the path by using canvas dimensions
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    // Calculate position relative to center
    const x = centerX + (width/2 * r * Math.cos(theta));
    const y = centerY + (height/2 * r * Math.sin(theta));
    return { x, y };
}

// Keyboard control
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();  // Prevent page scrolling
        isFollowingPath = !isFollowingPath;
        if (isFollowingPath) {
            // Start from current position
            const head = chain.points[0];
            const current = getPathPosition(pathTime);
            // Find closest point on path
            let minDist = Infinity;
            let bestT = 0;
            for (let t = 0; t < 1; t += 0.01) {
                const pos = getPathPosition(t);
                const dist = Math.hypot(pos.x - head.x, pos.y - head.y);
                if (dist < minDist) {
                    minDist = dist;
                    bestT = t;
                }
            }
            pathTime = bestT;
        }
    }
});

// Radius multipliers for each node
const RADIUS_MULTIPLIERS = [
    1,    // First node (index 0)
    1.65,  // Second node
    2.0,  // Third node
    2.0,  // Fourth node
    1.75, // Fifth node
    1.5,  // Sixth node
    1.25, // Seventh node
    1.0,  // Eighth node
    0.75, // Ninth node
    0.5,  // Tenth node
    0.25, // Eleventh node
    0.25, // Twelfth node
    0.25, // Thirteenth node
    0.75, // Fourteenth node
    0.75  // Fifteenth node
];

// Point class
class Point {
    constructor(x, y, index) {
        this.x = x;
        this.y = y;
        this.pinned = false;
        this.radiusMultiplier = RADIUS_MULTIPLIERS[index];
    }

    update() {
        // No update needed when pinned or when there's no inertia
        if (this.pinned) return;
    }
}

// Chain class
class Chain {
    constructor() {
        this.points = [];
        
        // Create chain points
        const startX = canvas.width / 2;
        const startY = canvas.height / 3;
        
        // Add first 12 points with normal spacing
        for (let i = 0; i < POINTS_COUNT - 2; i++) {
            this.points.push(new Point(startX, startY + i * CHAIN_LENGTH, i));
        }
        
        // Add last 2 points with half spacing
        const halfLength = CHAIN_LENGTH / 2;
        const lastBaseY = startY + (POINTS_COUNT - 3) * CHAIN_LENGTH;
        this.points.push(new Point(startX, lastBaseY + halfLength, POINTS_COUNT - 2));
        this.points.push(new Point(startX, lastBaseY + halfLength * 2, POINTS_COUNT - 1));
        
        // Pin the first point
        this.points[0].pinned = true;
    }

    update() {
        // Update path position if following
        if (isFollowingPath) {
            pathTime = (pathTime + PATH_SPEED) % 1;
            const pos = getPathPosition(pathTime);
            this.points[0].x = pos.x;
            this.points[0].y = pos.y;
        }

        // Update points
        this.points.forEach(point => point.update());
        
        // Solve constraints multiple times for stability
        for (let i = 0; i < ITERATIONS; i++) {
            // Distance constraint between consecutive points (forward pass)
            for (let j = 0; j < this.points.length - 1; j++) {
                const pointA = this.points[j];
                const pointB = this.points[j + 1];
                
                const dx = pointB.x - pointA.x;
                const dy = pointB.y - pointA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                // Use half length for last two segments
                const targetLength = j >= POINTS_COUNT - 3 ? CHAIN_LENGTH / 2 : CHAIN_LENGTH;
                const difference = targetLength - distance;
                const percent = difference / distance / 2;
                const offsetX = dx * percent;
                const offsetY = dy * percent;
                
                if (!pointA.pinned) {
                    pointA.x -= offsetX;
                    pointA.y -= offsetY;
                }
                if (!pointB.pinned) {
                    pointB.x += offsetX;
                    pointB.y += offsetY;
                }
            }

            // Distance constraint between consecutive points (backward pass)
            for (let j = this.points.length - 2; j >= 0; j--) {
                const pointA = this.points[j];
                const pointB = this.points[j + 1];
                
                const dx = pointB.x - pointA.x;
                const dy = pointB.y - pointA.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                // Use half length for last two segments
                const targetLength = j >= POINTS_COUNT - 3 ? CHAIN_LENGTH / 2 : CHAIN_LENGTH;
                const difference = targetLength - distance;
                const percent = difference / distance / 2;
                const offsetX = dx * percent;
                const offsetY = dy * percent;
                
                if (!pointA.pinned) {
                    pointA.x -= offsetX;
                    pointA.y -= offsetY;
                }
                if (!pointB.pinned) {
                    pointB.x += offsetX;
                    pointB.y += offsetY;
                }
            }

            // Angle constraints
            const MAX_ANGLE = 20 * Math.PI / 180; // 20 degrees in radians
            
            for (let j = 1; j < this.points.length - 1; j++) {
                const prev = this.points[j - 1];
                const curr = this.points[j];
                const next = this.points[j + 1];
                
                // Calculate current angle
                const dx1 = curr.x - prev.x;
                const dy1 = curr.y - prev.y;
                const dx2 = next.x - curr.x;
                const dy2 = next.y - curr.y;
                
                const angle1 = Math.atan2(dy1, dx1);
                const angle2 = Math.atan2(dy2, dx2);
                let angleDiff = angle2 - angle1;
                
                // Normalize angle difference to [-PI, PI]
                while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
                
                // If angle is too large, rotate points
                if (Math.abs(angleDiff) > MAX_ANGLE) {
                    const targetAngle = angle1 + Math.sign(angleDiff) * MAX_ANGLE;
                    
                    if (!next.pinned) {
                        // Rotate next point around current point
                        const dist = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                        next.x = curr.x + dist * Math.cos(targetAngle);
                        next.y = curr.y + dist * Math.sin(targetAngle);
                    }
                }
            }
        }
    }

    draw() {
        // First calculate all points and angles for reuse
        const nodeAngles = [];
        for (let i = 0; i < this.points.length - 1; i++) {
            const angle = Math.atan2(
                this.points[i + 1].y - this.points[i].y,
                this.points[i + 1].x - this.points[i].x
            );
            nodeAngles.push(angle);
        }
        // Add last node angle (using previous direction)
        nodeAngles.push(nodeAngles[nodeAngles.length - 1]);

        // Calculate total curvature for sections
        let totalCurvature = 0;
        for (let i = 5; i < 9; i++) {
            let angleDiff = nodeAngles[i] - nodeAngles[i-1];
            // Normalize angle difference to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            totalCurvature += angleDiff;
        }

        // Draw the tail section first (it goes on bottom)
        this.drawTailSection(this.points.length - 1, totalCurvature);

        // First draw the ellipses (they go on bottom)
        // Use angle between nodes 2-3 for first pair
        this.drawEllipsesBetweenNodes(2, 3, 20, 10, nodeAngles[2]);
        // Use angle of node 7 for second pair
        this.drawEllipsesBetweenNodes(7, 8, 10, 5, nodeAngles[7]);

        // Calculate all points first (moved up for reuse)
        const leftPoints = [];
        const rightPoints = [];

        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            let angle;
            let directionVector = { x: 0, y: 0 };

            // Calculate direction vector based on neighboring points
            if (i === 0) {
                const nextPoint = this.points[i + 1];
                directionVector.x = nextPoint.x - point.x;
                directionVector.y = nextPoint.y - point.y;
            } else if (i === this.points.length - 1) {
                const prevPoint = this.points[i - 1];
                directionVector.x = point.x - prevPoint.x;
                directionVector.y = point.y - prevPoint.y;
            } else {
                const prevPoint = this.points[i - 1];
                const nextPoint = this.points[i + 1];
                directionVector.x = nextPoint.x - prevPoint.x;
                directionVector.y = nextPoint.y - prevPoint.y;
            }

            const length = Math.sqrt(directionVector.x * directionVector.x + directionVector.y * directionVector.y);
            directionVector.x /= length;
            directionVector.y /= length;

            angle = Math.atan2(directionVector.y, directionVector.x);

            const radius = CIRCLE_RADIUS * point.radiusMultiplier;
            const perpX = -directionVector.y;
            const perpY = directionVector.x;
            
            leftPoints.push({
                x: point.x + radius * perpX,
                y: point.y + radius * perpY,
                angle: angle,
                radius: radius
            });
            rightPoints.push({
                x: point.x - radius * perpX,
                y: point.y - radius * perpY,
                angle: angle,
                radius: radius
            });
        }

        // Fill the fish body with dark blue
        ctx.fillStyle = '#1a4c7c';  // Dark blue

        // Fill head circle first
        ctx.beginPath();
        ctx.arc(this.points[0].x, this.points[0].y, CIRCLE_RADIUS * this.points[0].radiusMultiplier, 0, Math.PI * 2);
        ctx.fill();

        // Create a single continuous polygon for the fill
        ctx.beginPath();
        
        // Start from the last left point and move forward
        ctx.moveTo(leftPoints[leftPoints.length - 1].x, leftPoints[leftPoints.length - 1].y);
        
        // Draw lines through all left points from back to front
        for (let i = leftPoints.length - 2; i >= 0; i--) {
            ctx.lineTo(leftPoints[i].x, leftPoints[i].y);
        }
        
        // Draw lines through all right points from front to back
        for (let i = 0; i < rightPoints.length; i++) {
            ctx.lineTo(rightPoints[i].x, rightPoints[i].y);
        }
        
        // Close the path and fill
        ctx.closePath();
        ctx.fill();

        // Draw the outline
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;

        // Function to draw smooth line through points
        const drawSmoothLine = (points, isLeft) => {
            ctx.beginPath();
            
            // Draw front half circle
            const startAngle = leftPoints[0].angle + (isLeft ? Math.PI/2 : -Math.PI/2);
            const endAngle = leftPoints[0].angle + (isLeft ? -Math.PI/2 : Math.PI/2);
            ctx.arc(this.points[0].x, this.points[0].y, leftPoints[0].radius, startAngle, endAngle, !isLeft);
            
            ctx.moveTo(points[0].x, points[0].y);
            
            // Draw curves between points
            for (let i = 1; i < points.length - 1; i++) {
                const current = points[i];
                const previous = points[i - 1];
                
                const smoothing = 0.2;
                
                if (i < points.length - 2) {
                    const next = points[i + 1];
                    const cp1x = previous.x + (current.x - previous.x) * (1 - smoothing);
                    const cp1y = previous.y + (current.y - previous.y) * (1 - smoothing);
                    const cp2x = current.x - (next.x - previous.x) * smoothing;
                    const cp2y = current.y - (next.y - previous.y) * smoothing;
                    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, current.x, current.y);
                } else {
                    const cpx = previous.x + (current.x - previous.x) * (1 - smoothing);
                    const cpy = previous.y + (current.y - previous.y) * (1 - smoothing);
                    ctx.quadraticCurveTo(cpx, cpy, current.x, current.y);
                }
            }
            
            // Draw straight line for the last node
            ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
            
            ctx.stroke();
        };

        // Draw smooth lines for both sides
        drawSmoothLine(leftPoints, true);
        drawSmoothLine(rightPoints, false);

        // Draw the curved section over the body
        this.drawCurvedSection(5, 9, totalCurvature);

        // Draw white spheres on first node
        const firstPoint = this.points[0];
        const firstAngle = Math.atan2(
            this.points[1].y - firstPoint.y,
            this.points[1].x - firstPoint.x
        );
        const sphereRadius = 6;
        const sphereOffset = CIRCLE_RADIUS * firstPoint.radiusMultiplier*0.85;

        // Calculate positions for spheres
        const leftSphereX = firstPoint.x + Math.cos(firstAngle + Math.PI/2) * sphereOffset;
        const leftSphereY = firstPoint.y + Math.sin(firstAngle + Math.PI/2) * sphereOffset;
        const rightSphereX = firstPoint.x + Math.cos(firstAngle - Math.PI/2) * sphereOffset;
        const rightSphereY = firstPoint.y + Math.sin(firstAngle - Math.PI/2) * sphereOffset;

        // Draw left sphere
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(leftSphereX, leftSphereY, sphereRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw right sphere
        ctx.beginPath();
        ctx.arc(rightSphereX, rightSphereY, sphereRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    drawEllipsesBetweenNodes(nodeIndex1, nodeIndex2, ellipseWidth = 20, ellipseHeight = 10, referenceAngle = null) {
        const point1Left = {
            x: this.points[nodeIndex1].x + CIRCLE_RADIUS * this.points[nodeIndex1].radiusMultiplier * (-this.points[nodeIndex2].y + this.points[nodeIndex1].y) / Math.sqrt((this.points[nodeIndex2].x - this.points[nodeIndex1].x) ** 2 + (this.points[nodeIndex2].y - this.points[nodeIndex1].y) ** 2),
            y: this.points[nodeIndex1].y + CIRCLE_RADIUS * this.points[nodeIndex1].radiusMultiplier * (this.points[nodeIndex2].x - this.points[nodeIndex1].x) / Math.sqrt((this.points[nodeIndex2].x - this.points[nodeIndex1].x) ** 2 + (this.points[nodeIndex2].y - this.points[nodeIndex1].y) ** 2)
        };
        
        const point2Left = {
            x: this.points[nodeIndex2].x + CIRCLE_RADIUS * this.points[nodeIndex2].radiusMultiplier * (-this.points[nodeIndex2].y + this.points[nodeIndex1].y) / Math.sqrt((this.points[nodeIndex2].x - this.points[nodeIndex1].x) ** 2 + (this.points[nodeIndex2].y - this.points[nodeIndex1].y) ** 2),
            y: this.points[nodeIndex2].y + CIRCLE_RADIUS * this.points[nodeIndex2].radiusMultiplier * (this.points[nodeIndex2].x - this.points[nodeIndex1].x) / Math.sqrt((this.points[nodeIndex2].x - this.points[nodeIndex1].x) ** 2 + (this.points[nodeIndex2].y - this.points[nodeIndex1].y) ** 2)
        };

        const point1Right = {
            x: this.points[nodeIndex1].x - CIRCLE_RADIUS * this.points[nodeIndex1].radiusMultiplier * (-this.points[nodeIndex2].y + this.points[nodeIndex1].y) / Math.sqrt((this.points[nodeIndex2].x - this.points[nodeIndex1].x) ** 2 + (this.points[nodeIndex2].y - this.points[nodeIndex1].y) ** 2),
            y: this.points[nodeIndex1].y - CIRCLE_RADIUS * this.points[nodeIndex1].radiusMultiplier * (this.points[nodeIndex2].x - this.points[nodeIndex1].x) / Math.sqrt((this.points[nodeIndex2].x - this.points[nodeIndex1].x) ** 2 + (this.points[nodeIndex2].y - this.points[nodeIndex1].y) ** 2)
        };

        const point2Right = {
            x: this.points[nodeIndex2].x - CIRCLE_RADIUS * this.points[nodeIndex2].radiusMultiplier * (-this.points[nodeIndex2].y + this.points[nodeIndex1].y) / Math.sqrt((this.points[nodeIndex2].x - this.points[nodeIndex1].x) ** 2 + (this.points[nodeIndex2].y - this.points[nodeIndex1].y) ** 2),
            y: this.points[nodeIndex2].y - CIRCLE_RADIUS * this.points[nodeIndex2].radiusMultiplier * (this.points[nodeIndex2].x - this.points[nodeIndex1].x) / Math.sqrt((this.points[nodeIndex2].x - this.points[nodeIndex1].x) ** 2 + (this.points[nodeIndex2].y - this.points[nodeIndex1].y) ** 2)
        };

        // Calculate centers for left and right ellipses
        const leftCenter = {
            x: (point1Left.x + point2Left.x) / 2,
            y: (point1Left.y + point2Left.y) / 2
        };

        const rightCenter = {
            x: (point1Right.x + point2Right.x) / 2,
            y: (point1Right.y + point2Right.y) / 2
        };

        // Use provided reference angle if available, otherwise calculate from points
        const baseAngle = referenceAngle !== null ? referenceAngle : Math.atan2(
            this.points[nodeIndex2].y - this.points[nodeIndex1].y,
            this.points[nodeIndex2].x - this.points[nodeIndex1].x
        );

        // Set fill style for ellipses
        ctx.fillStyle = '#a8d5ff';  // Light blue
        ctx.strokeStyle = 'black';

        // Draw left ellipse (30 degrees backwards)
        ctx.save();
        ctx.translate(leftCenter.x, leftCenter.y);
        ctx.rotate(baseAngle + 30 * Math.PI / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, ellipseWidth, ellipseHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Draw right ellipse (30 degrees forwards - mirrored)
        ctx.save();
        ctx.translate(rightCenter.x, rightCenter.y);
        ctx.rotate(baseAngle - 30 * Math.PI / 180);
        ctx.beginPath();
        ctx.ellipse(0, 0, ellipseWidth, ellipseHeight, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    drawCurvedSection(startIndex, endIndex, curvature) {
        ctx.fillStyle = '#a8d5ff';  // Light blue
        
        // Draw first curve
        ctx.beginPath();
        ctx.moveTo(this.points[startIndex].x, this.points[startIndex].y);

        // Draw curve through actual points
        for (let i = startIndex + 1; i <= endIndex; i++) {
            const prev = this.points[i - 1];
            const curr = this.points[i];
            const smoothing = 0.2;
            
            if (i < endIndex) {
                const next = this.points[i + 1];
                const cp1x = prev.x + (curr.x - prev.x) * (1 - smoothing);
                const cp1y = prev.y + (curr.y - prev.y) * (1 - smoothing);
                const cp2x = curr.x - (next.x - prev.x) * smoothing;
                const cp2y = curr.y - (next.y - prev.y) * smoothing;
                ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
            } else {
                const cpx = prev.x + (curr.x - prev.x) * (1 - smoothing);
                const cpy = prev.y + (curr.y - prev.y) * (1 - smoothing);
                ctx.quadraticCurveTo(cpx, cpy, curr.x, curr.y);
            }
        }

        // Calculate control point for return curve
        const dx = this.points[endIndex].x - this.points[startIndex].x;
        const dy = this.points[endIndex].y - this.points[startIndex].y;
        const angle = Math.atan2(dy, dx);
        const offsetAngle = angle + Math.PI/2; // Always bulge inward
        const offsetMagnitude = - 10 * curvature; // Increased magnitude for more pronounced effect
        
        const midX = (this.points[startIndex].x + this.points[endIndex].x) / 2;
        const midY = (this.points[startIndex].y + this.points[endIndex].y) / 2;
        const offsetX = Math.cos(offsetAngle) * offsetMagnitude;
        const offsetY = Math.sin(offsetAngle) * offsetMagnitude;

        // Complete the path with quadratic curve back to start
        ctx.quadraticCurveTo(
            midX + offsetX, midY + offsetY,
            this.points[startIndex].x, this.points[startIndex].y
        );
        
        // Fill and add white border to first curve
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    drawTailSection(endIndex, curvature) {
        const startIndex = endIndex - 2;
        ctx.fillStyle = '#a8d5ff';  // Light blue
        
        // Calculate the direction vector from start to end
        const dx = this.points[endIndex].x - this.points[endIndex-1].x;
        const dy = this.points[endIndex].y - this.points[endIndex-1].y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const normalizedDx = dx / length;
        const normalizedDy = dy / length;

        // Calculate a point extended beyond the end point
        const extensionLength = 30; // How far to extend beyond the end point
        const extendedEndX = this.points[endIndex].x + normalizedDx * extensionLength;
        const extendedEndY = this.points[endIndex].y + normalizedDy * extensionLength;

        // Calculate angle for the curve
        const angle = Math.atan2(dy, dx);
        // Use curvature to determine which side to swing
        const offsetAngle = angle + (Math.PI/2 * Math.sign(curvature));
        const baseOffsetMagnitude = 25;
        
        // Calculate swing point based on curvature
        const swingOffsetMagnitude = baseOffsetMagnitude * Math.abs(curvature);
        const swingX = extendedEndX + Math.cos(offsetAngle) * swingOffsetMagnitude;
        const swingY = extendedEndY + Math.sin(offsetAngle) * swingOffsetMagnitude;

        // Draw first curve
        ctx.beginPath();
        ctx.moveTo(this.points[endIndex].x, this.points[endIndex].y);
        ctx.lineTo(extendedEndX, extendedEndY);
        ctx.quadraticCurveTo(
            swingX, swingY,
            this.points[endIndex].x, this.points[endIndex].y
        );
        // Fill and stroke first curve
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw second curve
        ctx.beginPath();
        ctx.moveTo(this.points[endIndex].x, this.points[endIndex].y);
        ctx.lineTo(extendedEndX, extendedEndY);
        // Use opposite side for second curve
        const oppositeOffsetAngle = angle - (Math.PI/2 * Math.sign(curvature));
        const oppositeSwingX = extendedEndX + Math.cos(oppositeOffsetAngle) * swingOffsetMagnitude;
        const oppositeSwingY = extendedEndY + Math.sin(oppositeOffsetAngle) * swingOffsetMagnitude;
        ctx.quadraticCurveTo(
            oppositeSwingX, oppositeSwingY,
            this.points[endIndex].x, this.points[endIndex].y
        );
        // Fill and stroke second curve
        ctx.fill();
        ctx.stroke();
    }
}

// Create chain
const chain = new Chain();

// Mouse interaction
let isDragging = false;
let draggedPoint = null;

canvas.addEventListener('mousedown', (e) => {
    if (isFollowingPath) return;  // Disable mouse control while following path
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    chain.points.forEach(point => {
        const dx = point.x - mouseX;
        const dy = point.y - mouseY;
        if (dx * dx + dy * dy < CIRCLE_RADIUS * CIRCLE_RADIUS) {
            isDragging = true;
            draggedPoint = point;
        }
    });
});

canvas.addEventListener('mousemove', (e) => {
    if (isDragging && draggedPoint) {
        const rect = canvas.getBoundingClientRect();
        draggedPoint.x = e.clientX - rect.left;
        draggedPoint.y = e.clientY - rect.top;
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
    draggedPoint = null;
});

// Animation loop
function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    chain.update();
    chain.draw();
    
    requestAnimationFrame(animate);
}

animate(); 