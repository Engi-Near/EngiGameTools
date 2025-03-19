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
        render: {
            visible: false
        }
    }
});

// Keep the mouse in sync with rendering
render.mouse = mouse;

// Create ground with specific collision category
const ground = Bodies.rectangle(400, 580, 810, 40, { 
    isStatic: true,
    collisionFilter: {
        category: 0x0001
    }
});

// Create creature parts with collision groups
// Torso (2x4)
const torso = Bodies.rectangle(400, 300, 80, 40, {
    collisionFilter: {
        group: -1,  // Negative group means it can collide with itself
        category: 0x0002  // Different category from ground
    }
});

// Abdomen (3x3)
const abdomen = Bodies.rectangle(340, 300, 60, 60, {
    collisionFilter: {
        group: -1,  // Same group as torso allows them to pass through each other
        category: 0x0002
    }
});

// Head (1x1)
const head = Bodies.rectangle(460, 280, 20, 20, {
    collisionFilter: {
        group: 1,  // Different group from torso prevents clipping
        category: 0x0002
    }
});

// Create limb segments
// Hind leg with specific angles
const hindUpper = Bodies.rectangle(370, 350, 60, 5, {
    angle: -Math.PI/4,  // -45 degrees (northwest)
    collisionFilter: {
        category: 0x0004,
        mask: 0x0001
    }
});

// Calculate middle segment position based on end of upper segment
const hindUpperEndX = 370 + (60/2) * Math.cos(-Math.PI/4);
const hindUpperEndY = 350 + (60/2) * Math.sin(-Math.PI/4);
const hindMiddle = Bodies.rectangle(hindUpperEndX, hindUpperEndY, 45, 5, {
    angle: Math.PI/4,   // 45 degrees (southwest)
    collisionFilter: {
        category: 0x0004,
        mask: 0x0001
    }
});

// Calculate lower segment position based on end of middle segment
const hindMiddleEndX = hindUpperEndX + (45/2) * Math.cos(Math.PI/4);
const hindMiddleEndY = hindUpperEndY + (45/2) * Math.sin(Math.PI/4);
const hindLower = Bodies.rectangle(hindMiddleEndX, hindMiddleEndY, 40, 5, {
    angle: Math.PI/2,   // 90 degrees (south)
    collisionFilter: {
        category: 0x0004,
        mask: 0x0001
    }
});

// Middle leg
const middleUpper = Bodies.rectangle(400, 350, 60, 5, {
    collisionFilter: {
        category: 0x0004,
        mask: 0x0001
    }
});
const middleMiddle = Bodies.rectangle(400, 400, 45, 5, {
    collisionFilter: {
        category: 0x0004,
        mask: 0x0001
    }
});
const middleLower = Bodies.rectangle(400, 440, 40, 5, {
    collisionFilter: {
        category: 0x0004,
        mask: 0x0001
    }
});

// Front leg
const frontUpper = Bodies.rectangle(430, 350, 60, 5, {
    collisionFilter: {
        category: 0x0004,
        mask: 0x0001
    }
});
const frontMiddle = Bodies.rectangle(430, 400, 45, 5, {
    collisionFilter: {
        category: 0x0004,
        mask: 0x0001
    }
});
const frontLower = Bodies.rectangle(430, 440, 40, 5, {
    collisionFilter: {
        category: 0x0004,
        mask: 0x0001
    }
});

// Create joints
const abdomenToTorso = Constraint.create({
    bodyA: abdomen,
    bodyB: torso,
    pointA: { x: 30, y: 30 },     // Bottom right of abdomen
    pointB: { x: -40, y: 20 },    // Bottom left of torso
    stiffness: 1,                 // Maximum stiffness for a rigid joint
    length: 0,                    // No slack in the joint
    angularStiffness: 0.5,       // Allows rotation but with some resistance
});
const abdomenTorsoMuscle = Constraint.create({
    bodyA: abdomen,
    bodyB: torso,
    pointA: { x: 30, y: -30 },     // top right of abdomen
    pointB: { x: 40, y: -20 },     // top right of torso
    stiffness: 1,                  // Maximum stiffness for a rigid joint
});

const headToTorso = Constraint.create({
    bodyA: head,
    bodyB: torso,
    pointA: { x: -10, y: 10 },    // Bottom left of head
    pointB: { x: 40, y: -20 },    // Top right of torso
    stiffness: 1,                 // Maximum stiffness for a rigid joint
    length: 0,                    // No slack in the joint
    angularStiffness: 0.5,       // Allows rotation but with some resistance
});

// Create leg joints
// Hind leg joints with corrected positions
const hindLegToTorso = Constraint.create({
    bodyA: torso,
    bodyB: hindUpper,
    pointA: { x: -30, y: 20 },    // 1/8th from bottom left of torso
    pointB: { x: -30, y: -2.5 },  // Top of upper segment
    stiffness: 1,
    length: 0,
    angularStiffness: 1
});

const hindUpperToMiddle = Constraint.create({
    bodyA: hindUpper,
    bodyB: hindMiddle,
    pointA: { x: 30, y: 2.5 },    // End of upper segment
    pointB: { x: -22.5, y: -2.5 }, // Start of middle segment
    stiffness: 1,
    length: 0,
    angularStiffness: 1
});

const hindMiddleToLower = Constraint.create({
    bodyA: hindMiddle,
    bodyB: hindLower,
    pointA: { x: 22.5, y: 2.5 },  // End of middle segment
    pointB: { x: -20, y: -2.5 },  // Start of lower segment
    stiffness: 1,
    length: 0,
    angularStiffness: 1
});

// Middle leg joints
const middleLegToTorso = Constraint.create({
    bodyA: torso,
    bodyB: middleUpper,
    pointA: { x: 0, y: 20 },      // Center bottom of torso
    pointB: { x: -30, y: 0 },     // Top of upper segment
    stiffness: 1,
    length: 0,
    angularStiffness: 0.5
});

const middleUpperToMiddle = Constraint.create({
    bodyA: middleUpper,
    bodyB: middleMiddle,
    pointA: { x: 30, y: 2.5 },    // Bottom of upper segment
    pointB: { x: -22.5, y: -2.5 }, // Top of middle segment
    stiffness: 1,
    length: 0,
    angularStiffness: 0.5
});

const middleMiddleToLower = Constraint.create({
    bodyA: middleMiddle,
    bodyB: middleLower,
    pointA: { x: 22.5, y: 2.5 },   // Bottom of middle segment
    pointB: { x: -20, y: -2.5 },   // Top of lower segment
    stiffness: 1,
    length: 0,
    angularStiffness: 0.5
});

// Front leg joints
const frontLegToTorso = Constraint.create({
    bodyA: torso,
    bodyB: frontUpper,
    pointA: { x: 30, y: 20 },     // 1/8th from bottom right of torso
    pointB: { x: -30, y: 0 },     // Top of upper segment
    stiffness: 1,
    length: 0,
    angularStiffness: 0.5
});

const frontUpperToMiddle = Constraint.create({
    bodyA: frontUpper,
    bodyB: frontMiddle,
    pointA: { x: 30, y: 2.5 },    // Bottom of upper segment
    pointB: { x: -22.5, y: -2.5 }, // Top of middle segment
    stiffness: 1,
    length: 0,
    angularStiffness: 0.5
});

const frontMiddleToLower = Constraint.create({
    bodyA: frontMiddle,
    bodyB: frontLower,
    pointA: { x: 22.5, y: 2.5 },   // Bottom of middle segment
    pointB: { x: -20, y: -2.5 },   // Top of lower segment
    stiffness: 1,
    length: 0,
    angularStiffness: 0.5
});

// Update hind leg IK target position
const hindLowerEndX = hindMiddleEndX + 20 * Math.cos(Math.PI/2);
const hindLowerEndY = hindMiddleEndY + 20 * Math.sin(Math.PI/2);
const hindLegTarget = Bodies.circle(
    hindLowerEndX,
    hindLowerEndY,
    4,
    {
        isStatic: true,
        render: { fillStyle: '#FF0000' },
        collisionFilter: { mask: 0x0000 }
    }
);

// Add IK target points (small, static points that we can move)
const middleLegTarget = Bodies.circle(400, 540, 4, {
    isStatic: true,
    render: { fillStyle: '#00FF00' },
    collisionFilter: { mask: 0x0000 }
});

const frontLegTarget = Bodies.circle(430, 540, 4, {
    isStatic: true,
    render: { fillStyle: '#0000FF' },
    collisionFilter: { mask: 0x0000 }
});

// Create IK constraints for each leg
// Hind leg IK with increased stiffness
const hindIK = Constraint.create({
    bodyA: hindLower,
    pointA: { x: 20, y: 2.5 },
    bodyB: hindLegTarget,
    pointB: { x: 0, y: 0 },
    stiffness: 0.5,               // Increased from 0.01 to 0.5
    length: 0,
    render: { visible: true, strokeStyle: '#FF0000' }
});

// Middle leg IK with increased stiffness
const middleIK = Constraint.create({
    bodyA: middleLower,
    pointA: { x: 20, y: 2.5 },
    bodyB: middleLegTarget,
    pointB: { x: 0, y: 0 },
    stiffness: 0.5,               // Increased from 0.01 to 0.5
    length: 0,
    render: { visible: true, strokeStyle: '#00FF00' }
});

// Front leg IK with increased stiffness
const frontIK = Constraint.create({
    bodyA: frontLower,
    pointA: { x: 20, y: 2.5 },
    bodyB: frontLegTarget,
    pointB: { x: 0, y: 0 },
    stiffness: 0.5,               // Increased from 0.01 to 0.5
    length: 0,
    render: { visible: true, strokeStyle: '#0000FF' }
});

// Add all bodies to the world
World.add(engine.world, [
    ground,
    torso,
    abdomen,
    head,
    // Add leg segments
    hindUpper, hindMiddle, hindLower,
    middleUpper, middleMiddle, middleLower,
    frontUpper, frontMiddle, frontLower,
    // Add IK targets
    hindLegTarget, middleLegTarget, frontLegTarget,
    // Add all constraints
    abdomenToTorso,
    headToTorso,
    hindLegToTorso, hindUpperToMiddle, hindMiddleToLower,
    middleLegToTorso, middleUpperToMiddle, middleMiddleToLower,
    frontLegToTorso, frontUpperToMiddle, frontMiddleToLower,
    // Add IK constraints
    hindIK, middleIK, frontIK,
    mouseConstraint
]);

// Add function to update IK targets
let isDragging = false;
let selectedTarget = null;

Events.on(mouseConstraint, 'mousedown', function(event) {
    const mousePosition = event.mouse.position;
    const bodies = Query.point([hindLegTarget, middleLegTarget, frontLegTarget], mousePosition);
    
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

// Run the engine
Engine.run(engine);

// Run the renderer
Render.run(render); 