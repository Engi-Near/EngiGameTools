// Matter.js module aliases
const Engine = Matter.Engine,
      Render = Matter.Render,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Constraint = Matter.Constraint,
      Body = Matter.Body,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint,
      Events = Matter.Events,
      Query = Matter.Query;

// Create engine
const engine = Engine.create();

// Create renderer
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: 800,
        height: 600,
        wireframes: true,
        showAngleIndicator: true
    }
});

// Add mouse control
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
});
render.mouse = mouse;

// Create ground
const ground = Bodies.rectangle(400, 580, 810, 40, { 
    isStatic: true,
    collisionFilter: { category: 0x0001 }
});

// Create main body (central rectangle)
const mainBody = Bodies.rectangle(400, 300, 120, 60, {
    collisionFilter: {
        group: -1,
        category: 0x0002
    }
});

// Function to create a limb segment
function createSegment(x, y, length, angle, category) {
    return Bodies.rectangle(x, y, length, 5, {
        angle: angle,
        collisionFilter: {
            category: category,
            mask: 0x0001
        }
    });
}

// Function to create a joint between segments with angle limits and preferred angle
function createJoint(bodyA, bodyB, pointA, pointB, stiffness = 1, angularStiffness = 0.8, angleLimit = Math.PI/2, preferredAngle = null) {
    return Constraint.create({
        bodyA: bodyA,
        bodyB: bodyB,
        pointA: pointA,
        pointB: pointB,
        stiffness: stiffness,
        length: 0,
        angularStiffness: angularStiffness,
        angleLimit: angleLimit,
        preferredAngle: preferredAngle
    });
}

// Create limbs
const segmentLengths = {
    upper: 50,
    middle: 40,
    lower: 35
};

// Left limb - all segments start vertical (0 angle)
const leftLimb = {
    upper: createSegment(340, 280, segmentLengths.upper, 0, 0x0004),
    middle: createSegment(340, 320, segmentLengths.middle, 0, 0x0004),
    lower: createSegment(340, 360, segmentLengths.lower, 0, 0x0004)
};

// Middle limb - all segments start vertical (0 angle)
const middleLimb = {
    upper: createSegment(400, 280, segmentLengths.upper, 0, 0x0004),
    middle: createSegment(400, 320, segmentLengths.middle, 0, 0x0004),
    lower: createSegment(400, 360, segmentLengths.lower, 0, 0x0004)
};

// Right limb - all segments start vertical (0 angle)
const rightLimb = {
    upper: createSegment(460, 280, segmentLengths.upper, 0, 0x0004),
    middle: createSegment(460, 320, segmentLengths.middle, 0, 0x0004),
    lower: createSegment(460, 360, segmentLengths.lower, 0, 0x0004)
};

// Create IK target points on the ground
const leftTarget = Bodies.circle(300, 550, 4, {
    isStatic: true,
    render: { fillStyle: '#FF0000' },
    collisionFilter: { mask: 0x0000 }
});

const middleTarget = Bodies.circle(400, 550, 4, {
    isStatic: true,
    render: { fillStyle: '#00FF00' },
    collisionFilter: { mask: 0x0000 }
});

const rightTarget = Bodies.circle(500, 550, 4, {
    isStatic: true,
    render: { fillStyle: '#0000FF' },
    collisionFilter: { mask: 0x0000 }
});

// Create joints for left limb with specific behaviors
const leftJoints = {
    toBody: createJoint(mainBody, leftLimb.upper, 
        { x: -40, y: 0 }, { x: -25, y: -2.5 }, 0.4, 0.3),  // Loose upper joint
    upperToMiddle: createJoint(leftLimb.upper, leftLimb.middle,
        { x: 25, y: 2.5 }, { x: -20, y: -2.5 }, 0.8, 0.8, Math.PI/4, -Math.PI/2),  // Middle tries to stay vertical
    middleToLower: createJoint(leftLimb.middle, leftLimb.lower,
        { x: 20, y: 2.5 }, { x: -17.5, y: -2.5 }, 1, 1, Math.PI/12)  // Lower segment limited to ±15 degrees
};

// Create joints for middle limb with specific behaviors
const middleJoints = {
    toBody: createJoint(mainBody, middleLimb.upper,
        { x: 0, y: 30 }, { x: -25, y: -2.5 }, 0.4, 0.3),  // Loose upper joint
    upperToMiddle: createJoint(middleLimb.upper, middleLimb.middle,
        { x: 25, y: 2.5 }, { x: -20, y: -2.5 }, 0.8, 0.8, Math.PI/4, -Math.PI/2),  // Middle tries to stay vertical
    middleToLower: createJoint(middleLimb.middle, middleLimb.lower,
        { x: 20, y: 2.5 }, { x: -17.5, y: -2.5 }, 1, 1, Math.PI/12)  // Lower segment limited to ±15 degrees
};

// Create joints for right limb with specific behaviors
const rightJoints = {
    toBody: createJoint(mainBody, rightLimb.upper,
        { x: 40, y: 0 }, { x: -25, y: -2.5 }, 0.4, 0.3),  // Loose upper joint
    upperToMiddle: createJoint(rightLimb.upper, rightLimb.middle,
        { x: 25, y: 2.5 }, { x: -20, y: -2.5 }, 0.8, 0.8, Math.PI/4, -Math.PI/2),  // Middle tries to stay vertical
    middleToLower: createJoint(rightLimb.middle, rightLimb.lower,
        { x: 20, y: 2.5 }, { x: -17.5, y: -2.5 }, 1, 1, Math.PI/12)  // Lower segment limited to ±15 degrees
};

// Update IK constraints with higher stiffness for better control
const leftIK = Constraint.create({
    bodyA: leftLimb.lower,
    pointA: { x: 17.5, y: 2.5 },
    bodyB: leftTarget,
    pointB: { x: 0, y: 0 },
    stiffness: 0.8,
    length: 0,
    render: { visible: true, strokeStyle: '#FF0000' }
});

const middleIK = Constraint.create({
    bodyA: middleLimb.lower,
    pointA: { x: 17.5, y: 2.5 },
    bodyB: middleTarget,
    pointB: { x: 0, y: 0 },
    stiffness: 0.8,
    length: 0,
    render: { visible: true, strokeStyle: '#00FF00' }
});

const rightIK = Constraint.create({
    bodyA: rightLimb.lower,
    pointA: { x: 17.5, y: 2.5 },
    bodyB: rightTarget,
    pointB: { x: 0, y: 0 },
    stiffness: 0.8,
    length: 0,
    render: { visible: true, strokeStyle: '#0000FF' }
});

// Ground physics for IK targets
function updateIKTargets() {
    const groundY = 550;  // Y position of the ground
    
    // Update each IK target
    [leftTarget, middleTarget, rightTarget].forEach(target => {
        const pos = target.position;
        
        // Keep on ground
        if (pos.y !== groundY) {
            Body.setPosition(target, {
                x: pos.x,
                y: groundY
            });
        }
        
        // Prevent moving too far from body center
        const maxDistance = 200;  // Maximum distance from body center
        const centerX = mainBody.position.x;
        const dx = pos.x - centerX;
        if (Math.abs(dx) > maxDistance) {
            Body.setPosition(target, {
                x: centerX + (maxDistance * Math.sign(dx)),
                y: groundY
            });
        }
    });
}

// Update lower segments to align with ground normal with tighter constraints
function updateLowerSegments() {
    const groundNormal = -Math.PI/2;  // Normal to flat ground (pointing up)
    
    [leftLimb.lower, middleLimb.lower, rightLimb.lower].forEach(segment => {
        // Get the angle of the middle segment this lower segment is attached to
        let parentMiddle;
        if (segment === leftLimb.lower) parentMiddle = leftLimb.middle;
        else if (segment === middleLimb.lower) parentMiddle = middleLimb.middle;
        else parentMiddle = rightLimb.middle;
        
        // Target angle is parent angle ± maximum 15 degrees
        const parentAngle = parentMiddle.angle;
        const currentAngle = segment.angle;
        const maxDeviation = Math.PI/12; // 15 degrees
        
        // Calculate target angle within constraints
        let targetAngle = groundNormal;
        const angleToParent = ((currentAngle - parentAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
        
        if (Math.abs(angleToParent) > maxDeviation) {
            targetAngle = parentAngle + maxDeviation * Math.sign(angleToParent);
        }
        
        const angleStep = 0.1;  // Adjust rotation speed
        const angleDiff = targetAngle - currentAngle;
        if (Math.abs(angleDiff) > 0.01) {
            Body.setAngle(segment, currentAngle + angleStep * Math.sign(angleDiff));
        }
    });
}

// Update middle segments to stay upward
function updateMiddleSegments() {
    const upwardAngle = -Math.PI/2;  // Pointing straight up
    const maxDeviation = Math.PI/4;  // Maximum 45-degree deviation
    
    [leftLimb.middle, middleLimb.middle, rightLimb.middle].forEach(segment => {
        const currentAngle = segment.angle;
        let targetAngle = upwardAngle;
        
        // Limit the angle to within 45 degrees of vertical
        const deviation = ((currentAngle - upwardAngle + Math.PI) % (2 * Math.PI)) - Math.PI;
        if (Math.abs(deviation) > maxDeviation) {
            targetAngle = upwardAngle + maxDeviation * Math.sign(deviation);
        }
        
        const angleStep = 0.05;  // Slower rotation for smoother movement
        const angleDiff = targetAngle - currentAngle;
        if (Math.abs(angleDiff) > 0.01) {
            Body.setAngle(segment, currentAngle + angleStep * Math.sign(angleDiff));
        }
    });
}

// Add update function to engine events
Events.on(engine, 'beforeUpdate', function() {
    updateIKTargets();
    updateLowerSegments();
    updateMiddleSegments();
});

// Add all bodies and constraints to the world
World.add(engine.world, [
    ground,
    mainBody,
    // Left limb
    leftLimb.upper, leftLimb.middle, leftLimb.lower,
    leftJoints.toBody, leftJoints.upperToMiddle, leftJoints.middleToLower,
    // Middle limb
    middleLimb.upper, middleLimb.middle, middleLimb.lower,
    middleJoints.toBody, middleJoints.upperToMiddle, middleJoints.middleToLower,
    // Right limb
    rightLimb.upper, rightLimb.middle, rightLimb.lower,
    rightJoints.toBody, rightJoints.upperToMiddle, rightJoints.middleToLower,
    // IK targets and constraints
    leftTarget, middleTarget, rightTarget,
    leftIK, middleIK, rightIK,
    mouseConstraint
]);

// Add mouse control for IK targets
let isDragging = false;
let selectedTarget = null;

Events.on(mouseConstraint, 'mousedown', function(event) {
    const mousePosition = event.mouse.position;
    const bodies = Query.point([leftTarget, middleTarget, rightTarget], mousePosition);
    
    if (bodies.length > 0) {
        isDragging = true;
        selectedTarget = bodies[0];
    }
});

Events.on(mouseConstraint, 'mousemove', function(event) {
    if (isDragging && selectedTarget) {
        Body.setPosition(selectedTarget, event.mouse.position);
    }
});

Events.on(mouseConstraint, 'mouseup', function() {
    isDragging = false;
    selectedTarget = null;
});

// Run the engine and renderer
Engine.run(engine);
Render.run(render); 