// Game variables
let camera, scene, renderer;
let controls;
let raycaster;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
let prevTime = performance.now();
let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let enemies = [];
let score = 0;
let health = 100;
let ammo = 30;
let waveNumber = 1;
let blocker, instructions;
let bullets = [];
let gunModel;

// Player settings
const playerHeight = 1.8;
const movementSpeed = 300.0;

// Game state
let gameActive = false;

// Initialize the game
function init() {
    // Setup scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.Fog(0x000000, 0, 500);

    // Setup camera with better starting position
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, playerHeight, 10); // Start farther back to see the environment
    camera.lookAt(0, playerHeight, 0);
    
    console.log("Camera initialized at position:", camera.position);

    // Setup lighting
    setupLighting();

    // Create environment (floor, walls, decorations)
    createEnvironment();
    
    // Add a large visible marker at the center of the scene
    const centerMarker = new THREE.Mesh(
        new THREE.SphereGeometry(2, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xff00ff })
    );
    centerMarker.position.set(0, 5, 0);
    scene.add(centerMarker);

    // Setup renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Setup controls
    setupControls();
    
    // Create gun model
    createGunModel();

    // Setup raycaster for shooting
    raycaster = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), 0, 100);

    // Add event listeners
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    document.addEventListener('click', onShoot, false);
    window.addEventListener('resize', onWindowResize, false);

    // Set up start button with explicit event listener to ensure it works
    const startButton = document.getElementById('start-button');
    if (startButton) {
        startButton.addEventListener('click', function(event) {
            event.preventDefault();
            console.log("Start button clicked!");
            window.startGame(); // Use the window.startGame function
        });
        console.log("Start button listener added");
    } else {
        console.error("Start button not found in DOM");
    }

    // Start animation loop (will run even before game starts)
    animate();
    
    // Output debug information to help diagnose issues
    showDebugInfo("Game initialized. Click START GAME to begin.");
    console.log("Scene contains", scene.children.length, "objects");
    console.log("Camera position:", camera.position.x, camera.position.y, camera.position.z);
}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded, initializing game...");
    init();
});

// Override the startGame function defined in the HTML
window.startGame = function() {
    console.log("Game starting from script...");
    
    // Hide instructions
    document.getElementById('instructions').classList.add('hidden');
    
    // Make sure game is active
    gameActive = true;
    
    // Reset game state
    enemies = [];
    score = 0;
    health = 100;
    ammo = 30;
    waveNumber = 1;
    
    // Reset camera position if needed
    camera.position.set(0, playerHeight, 10);
    camera.lookAt(0, playerHeight, 0);
    
    // Lock controls after camera is positioned
    setTimeout(() => {
        controls.lock();
        
        // Start first wave immediately after controls are locked
        setTimeout(() => {
            startWave();
            updateHUD();
        }, 500);
    }, 100);
    
    showDebugInfo("Game started! Camera at " + camera.position.x.toFixed(1) + "," + camera.position.y.toFixed(1) + "," + camera.position.z.toFixed(1));
};

function setupLighting() {
    // Ambient light - brighten it up
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    // Directional light (sun-like)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(1, 1, 0.5);
    scene.add(directionalLight);

    // Add a light at the player position
    const playerLight = new THREE.PointLight(0xffffff, 2, 50);
    playerLight.position.set(0, 2, 0);
    camera.add(playerLight);
}

function createEnvironment() {
    // Create floor - make it VERY visible with bright colors
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x440088,
        side: THREE.DoubleSide
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    scene.add(floor);
    
    // Add grid helper for better visibility
    const gridHelper = new THREE.GridHelper(100, 20, 0xffff00, 0xff00ff);
    scene.add(gridHelper);

    // Create simple walls with basic materials
    const wallHeight = 10;
    const wallLength = 100;
    const wallMaterial = new THREE.MeshBasicMaterial({
        color: 0x8800ff,
        side: THREE.DoubleSide
    });

    // North wall
    const northWall = new THREE.Mesh(
        new THREE.PlaneGeometry(wallLength, wallHeight),
        wallMaterial
    );
    northWall.position.set(0, wallHeight / 2, -wallLength / 2);
    scene.add(northWall);

    // South wall
    const southWall = new THREE.Mesh(
        new THREE.PlaneGeometry(wallLength, wallHeight),
        wallMaterial
    );
    southWall.position.set(0, wallHeight / 2, wallLength / 2);
    southWall.rotation.y = Math.PI;
    scene.add(southWall);

    // East wall
    const eastWall = new THREE.Mesh(
        new THREE.PlaneGeometry(wallLength, wallHeight),
        wallMaterial
    );
    eastWall.position.set(wallLength / 2, wallHeight / 2, 0);
    eastWall.rotation.y = -Math.PI / 2;
    scene.add(eastWall);

    // West wall
    const westWall = new THREE.Mesh(
        new THREE.PlaneGeometry(wallLength, wallHeight),
        wallMaterial
    );
    westWall.position.set(-wallLength / 2, wallHeight / 2, 0);
    westWall.rotation.y = Math.PI / 2;
    scene.add(westWall);

    // Add pillar markers at the corners for reference
    const cornerPositions = [
        [-wallLength/2, 0, -wallLength/2],
        [wallLength/2, 0, -wallLength/2],
        [-wallLength/2, 0, wallLength/2],
        [wallLength/2, 0, wallLength/2]
    ];
    
    for (const pos of cornerPositions) {
        const pillar = new THREE.Mesh(
            new THREE.BoxGeometry(2, 20, 2),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        pillar.position.set(pos[0], pos[1] + 10, pos[2]);
        scene.add(pillar);
    }
}

function setupControls() {
    controls = new THREE.PointerLockControls(camera, document.body);
    
    document.addEventListener('click', function() {
        controls.lock();
    });
    
    controls.addEventListener('lock', function() {
        // Game is now active
        gameActive = true;
    });
    
    controls.addEventListener('unlock', function() {
        // Game is paused
        gameActive = false;
    });
    
    scene.add(controls.getObject());
}

function startWave() {
    // Clear any existing enemies
    for (let i = enemies.length - 1; i >= 0; i--) {
        scene.remove(enemies[i].mesh);
        enemies.splice(i, 1);
    }
    
    // Calculate number of enemies based on wave
    const enemyCount = 5 + (waveNumber * 2);
    showDebugInfo(`Starting wave ${waveNumber} with ${enemyCount} enemies`);
    
    // Spawn enemies in a clear pattern
    for (let i = 0; i < enemyCount; i++) {
        const enemy = spawnEnemy();
        
        // Position in a clear circle pattern
        const angle = (i / enemyCount) * Math.PI * 2;
        const radius = 15; // Fixed radius so all enemies are visible
        
        enemy.mesh.position.x = Math.cos(angle) * radius;
        enemy.mesh.position.z = Math.sin(angle) * radius;
        
        // Add bright debug sphere at exact position
        const debugSphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        debugSphere.position.set(0, 3, 0);
        enemy.mesh.add(debugSphere);
    }
    
    // Update wave number display
    updateHUD();
    
    // Add a visible marker at the origin for debugging
    const originMarker = new THREE.Mesh(
        new THREE.SphereGeometry(1, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    );
    originMarker.position.set(0, 1, 0);
    scene.add(originMarker);
    
    // Create directional helper lines from center
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const lineGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(Math.cos(angle) * 20, 1, Math.sin(angle) * 20)
        ]);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffff00 });
        const line = new THREE.Line(lineGeometry, lineMaterial);
        scene.add(line);
    }
}

function spawnEnemy() {
    // Determine enemy type based on random roll
    const roll = Math.random() * 100;
    let enemyType;
    
    if (roll < 10 && waveNumber > 3) {
        enemyType = 'magaBoss';
    } else if (roll < 30) {
        enemyType = 'magatrumpSupporter';
    } else {
        enemyType = 'magatroop';
    }
    
    // Set enemy properties based on type
    const enemyProps = {
        magatroop: {
            health: 50,
            damage: 10,
            speed: 0.03,
            color: 0xf8d3ac, // Light skin tone
            size: 1.0,
            points: 100
        },
        magatrumpSupporter: {
            health: 75,
            damage: 15,
            speed: 0.02,
            color: 0xf4c397, // Medium skin tone
            size: 1.2,
            points: 200
        },
        magaBoss: {
            health: 150,
            damage: 25,
            speed: 0.015,
            color: 0xffbf7f, // Orange-tinted skin tone
            size: 1.8,
            points: 500
        }
    };
    
    const props = enemyProps[enemyType];
    
    // Create enemy mesh group
    const enemyGroup = new THREE.Group();
    
    // Create body based on type with simpler geometry
    const bodyGeometry = new THREE.BoxGeometry(props.size, props.size * 2, props.size);
    const bodyMaterial = new THREE.MeshBasicMaterial({ 
        color: props.color
    });
    
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = props.size;
    enemyGroup.add(body);
    
    // Add head - using basic material to ensure visibility
    const headGeometry = new THREE.SphereGeometry(props.size * 0.5, 16, 16);
    const headMaterial = new THREE.MeshBasicMaterial({
        color: props.color
    });
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = props.size * 2;
    enemyGroup.add(head);
    
    // Add MAGA hat - using bright red
    const hatGeometry = new THREE.CylinderGeometry(props.size * 0.5, props.size * 0.5, props.size * 0.3, 16);
    const hatMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000
    });
    
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = props.size * 2.3;
    enemyGroup.add(hat);
    
    // Add debug marker to make it extra visible
    const markerGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const markerMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.8
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.y = props.size * 3;
    enemyGroup.add(marker);
    
    // Position enemies in fixed positions around the center
    enemyGroup.position.set(0, 0, 0);  // Will be positioned in startWave
    
    // Add enemy to scene
    scene.add(enemyGroup);
    
    // Create enemy object
    const enemy = {
        mesh: enemyGroup,
        type: enemyType,
        health: props.health,
        damage: props.damage,
        speed: props.speed,
        points: props.points,
        lastAttackTime: 0
    };
    
    enemies.push(enemy);
    
    console.log(`Spawned ${enemyType} at position ${enemyGroup.position.x.toFixed(2)}, ${enemyGroup.position.z.toFixed(2)}`);
    
    return enemy;
}

function addFaceFeatures(head, size, enemyType) {
    // Add eyes
    const eyeGeometry = new THREE.SphereGeometry(size * 0.05, 8, 8);
    const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const pupilMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });  // Blue eyes
    
    // Right eye
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(size * 0.15, size * 0.05, size * 0.25);
    head.add(rightEye);
    
    // Right pupil
    const rightPupil = new THREE.Mesh(new THREE.SphereGeometry(size * 0.025, 8, 8), pupilMaterial);
    rightPupil.position.set(0, 0, size * 0.03);
    rightEye.add(rightPupil);
    
    // Left eye
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-size * 0.15, size * 0.05, size * 0.25);
    head.add(leftEye);
    
    // Left pupil
    const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(size * 0.025, 8, 8), pupilMaterial);
    leftPupil.position.set(0, 0, size * 0.03);
    leftEye.add(leftPupil);
    
    // Mouth
    const mouthGeometry = new THREE.BoxGeometry(size * 0.3, size * 0.05, size * 0.05);
    const mouthMaterial = new THREE.MeshStandardMaterial({ color: 0xcc6666 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, -size * 0.1, size * 0.25);
    head.add(mouth);
    
    // Add Trump-specific features for the boss
    if (enemyType === 'magaBoss') {
        // Yellow-blonde hair
        const hairGeometry = new THREE.CylinderGeometry(size * 0.35, size * 0.3, size * 0.2, 16);
        const hairMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700, 
            roughness: 0.8 
        });
        
        const hair = new THREE.Mesh(hairGeometry, hairMaterial);
        hair.position.y = size * 0.15;
        head.add(hair);
        
        // Add eyebrows
        const eyebrowGeometry = new THREE.BoxGeometry(size * 0.15, size * 0.03, size * 0.05);
        const eyebrowMaterial = new THREE.MeshStandardMaterial({ color: 0xFFD700 });
        
        const rightEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
        rightEyebrow.position.set(size * 0.15, size * 0.15, size * 0.25);
        rightEyebrow.rotation.z = -0.3;
        head.add(rightEyebrow);
        
        const leftEyebrow = new THREE.Mesh(eyebrowGeometry, eyebrowMaterial);
        leftEyebrow.position.set(-size * 0.15, size * 0.15, size * 0.25);
        leftEyebrow.rotation.z = 0.3;
        head.add(leftEyebrow);
    }
}

function addMAGAClothing(body, size, enemyType) {
    // Add a t-shirt
    const torsoGeometry = new THREE.CylinderGeometry(size * 0.45, size * 0.4, size * 0.8, 16);
    
    // Create clothing material based on type
    let shirtMaterial;
    
    if (enemyType === 'magatrumpSupporter') {
        // Create American flag pattern shirt
        const shirtCanvas = document.createElement('canvas');
        shirtCanvas.width = 256;
        shirtCanvas.height = 256;
        const ctx = shirtCanvas.getContext('2d');
        
        // Draw flag pattern
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 256, 256);
        
        // Draw red stripes
        ctx.fillStyle = 'red';
        for (let i = 0; i < 13; i += 2) {
            ctx.fillRect(0, i * 20, 256, 20);
        }
        
        // Draw blue rectangle
        ctx.fillStyle = 'blue';
        ctx.fillRect(0, 0, 100, 140);
        
        // Draw white stars
        ctx.fillStyle = 'white';
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 6; col++) {
                drawStar(ctx, 10 + col * 15, 10 + row * 25, 5, 5, 5);
            }
        }
        
        // Create texture and material
        const flagTexture = new THREE.CanvasTexture(shirtCanvas);
        shirtMaterial = new THREE.MeshStandardMaterial({
            map: flagTexture,
            roughness: 0.8
        });
    } else {
        // Regular red shirt for magatroop
        shirtMaterial = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            roughness: 0.7
        });
    }
    
    const torso = new THREE.Mesh(torsoGeometry, shirtMaterial);
    torso.position.y = size * 0.5;
    body.add(torso);
    
    // Add text "MAGA" to the shirt front
    if (enemyType === 'magatroop') {
        const textCanvas = document.createElement('canvas');
        textCanvas.width = 128;
        textCanvas.height = 64;
        const textCtx = textCanvas.getContext('2d');
        
        textCtx.fillStyle = 'white';
        textCtx.font = 'bold 32px Arial';
        textCtx.textAlign = 'center';
        textCtx.textBaseline = 'middle';
        textCtx.fillText('MAGA', 64, 32);
        
        const textTexture = new THREE.CanvasTexture(textCanvas);
        const textMaterial = new THREE.MeshBasicMaterial({
            map: textTexture,
            transparent: true
        });
        
        const textPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(size * 0.6, size * 0.3),
            textMaterial
        );
        textPlane.position.set(0, size * 0.6, size * 0.45);
        textPlane.rotation.x = -0.2;
        body.add(textPlane);
    }
}

function addTrumpSuit(body, size) {
    // Add black suit
    const suitGeometry = new THREE.CylinderGeometry(size * 0.5, size * 0.45, size, 16);
    const suitMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.7
    });
    
    const suit = new THREE.Mesh(suitGeometry, suitMaterial);
    suit.position.y = size * 0.5;
    body.add(suit);
    
    // Add red tie
    const tieGeometry = new THREE.BoxGeometry(size * 0.15, size * 0.6, size * 0.05);
    const tieMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.6,
        emissive: 0x330000
    });
    
    const tie = new THREE.Mesh(tieGeometry, tieMaterial);
    tie.position.set(0, size * 0.3, size * 0.45);
    body.add(tie);
    
    // Add white shirt collar
    const collarGeometry = new THREE.BoxGeometry(size * 0.4, size * 0.1, size * 0.05);
    const collarMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5
    });
    
    const collar = new THREE.Mesh(collarGeometry, collarMaterial);
    collar.position.set(0, size * 0.75, size * 0.45);
    body.add(collar);
}

function addMagaHat(head, size, enemyType) {
    // Create red MAGA hat
    const hatGeometry = new THREE.CylinderGeometry(size * 0.4, size * 0.35, size * 0.2, 16);
    const hatMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000, 
        roughness: 0.8 
    });
    
    const hat = new THREE.Mesh(hatGeometry, hatMaterial);
    hat.position.y = size * 0.3;
    head.add(hat);
    
    // Add hat top
    const topGeometry = new THREE.CircleGeometry(size * 0.4, 16);
    const top = new THREE.Mesh(topGeometry, hatMaterial);
    top.position.y = size * 0.1;
    top.rotation.x = -Math.PI / 2;
    hat.add(top);
    
    // Add brim
    const brimGeometry = new THREE.BoxGeometry(size * 0.85, size * 0.05, size * 0.4);
    const brim = new THREE.Mesh(brimGeometry, hatMaterial);
    brim.position.set(0, -size * 0.1, size * 0.2);
    hat.add(brim);
    
    // Add "MAGA" text to hat
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 128;
    textCanvas.height = 32;
    const ctx = textCanvas.getContext('2d');
    
    // Draw text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (enemyType === 'magaBoss') {
        ctx.fillText('MAKE AMERICA', 64, 10);
        ctx.fillText('GREAT AGAIN', 64, 24);
    } else {
        ctx.fillText('MAGA', 64, 16);
    }
    
    const textTexture = new THREE.CanvasTexture(textCanvas);
    const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true
    });
    
    const textPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(size * 0.7, size * 0.2),
        textMaterial
    );
    textPlane.position.set(0, 0, size * 0.21);
    textPlane.rotation.x = -0.2;
    hat.add(textPlane);
}

// Helper function to draw stars for the flag shirt
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    
    for (let i = 0; i < spikes; i++) {
        x = cx + Math.cos(rot) * outerRadius;
        y = cy + Math.sin(rot) * outerRadius;
        ctx.lineTo(x, y);
        rot += step;

        x = cx + Math.cos(rot) * innerRadius;
        y = cy + Math.sin(rot) * innerRadius;
        ctx.lineTo(x, y);
        rot += step;
    }
    
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
}

function onKeyDown(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = true;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = true;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = true;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = true;
            break;
        case 'Space':
            if (canJump === true) velocity.y += 350;
            canJump = false;
            break;
        case 'KeyR':
            // Reload weapon
            ammo = 30;
            updateHUD();
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'ArrowUp':
        case 'KeyW':
            moveForward = false;
            break;
        case 'ArrowLeft':
        case 'KeyA':
            moveLeft = false;
            break;
        case 'ArrowDown':
        case 'KeyS':
            moveBackward = false;
            break;
        case 'ArrowRight':
        case 'KeyD':
            moveRight = false;
            break;
    }
}

function onShoot(event) {
    if (!gameActive || ammo <= 0) return;
    
    // Only process left clicks (not right clicks or middle clicks)
    if (event && event.button !== 0) return;
    
    // Decrease ammo
    ammo--;
    
    // Create a bullet
    const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const bulletMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xcc00ff,  // Purple bullet for Afro aesthetic
        emissive: 0x8800cc,
        emissiveIntensity: 1.0
    });
    
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    
    // Position bullet at gun barrel
    const bulletStartPos = new THREE.Vector3();
    gunModel.getWorldPosition(bulletStartPos);
    bulletStartPos.z -= 0.5; // Adjust to come from barrel
    bullet.position.copy(bulletStartPos);
    
    // Calculate bullet direction from camera
    const bulletDirection = new THREE.Vector3(0, 0, -1);
    bulletDirection.unproject(camera).sub(controls.getObject().position).normalize();
    
    // Add bullet to scene
    scene.add(bullet);
    
    // Add bullet light
    const bulletLight = new THREE.PointLight(0xcc00ff, 1, 5);
    bullet.add(bulletLight);
    
    // Add bullet to bullets array
    bullets.push({
        mesh: bullet,
        direction: bulletDirection,
        speed: 50,
        distance: 0,
        maxDistance: 100,
        createdTime: performance.now()
    });
    
    // Play gun shot sound effect
    // (would add audio here if available)
    
    // Add muzzle flash
    createMuzzleFlash();
    
    // Add gun recoil animation
    animateGunRecoil();
    
    updateHUD();
}

function createMuzzleFlash() {
    // Create a bright purple light at the gun position
    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xcc00ff,
        transparent: true,
        opacity: 0.8
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    
    // Position at gun barrel
    const flashPos = new THREE.Vector3();
    gunModel.getWorldPosition(flashPos);
    flashPos.z -= 0.5; // Position at barrel end
    flash.position.copy(flashPos);
    
    // Add to scene
    scene.add(flash);
    
    // Add flash light
    const flashLight = new THREE.PointLight(0xcc00ff, 2, 10);
    flash.add(flashLight);
    
    // Remove after a short time
    setTimeout(() => {
        scene.remove(flash);
    }, 50);
}

function animateGunRecoil() {
    // Save the original position
    const originalPos = gunModel.position.clone();
    
    // Apply recoil
    gunModel.position.z += 0.1;
    
    // Return to original position
    setTimeout(() => {
        gunModel.position.copy(originalPos);
    }, 100);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function updateHUD() {
    document.getElementById('health').textContent = `Health: ${health}`;
    document.getElementById('ammo').textContent = `Ammo: ${ammo}`;
    document.getElementById('score').textContent = `Score: ${score}`;
    document.getElementById('info').textContent = `Wave ${waveNumber} - Enemies remaining: ${enemies.length}`;
    
    // Update debug info
    showDebugInfo(`Enemies: ${enemies.length}, Position: ${controls ? controls.getObject().position.x.toFixed(1) + ',' + controls.getObject().position.z.toFixed(1) : 'N/A'}`);
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = performance.now();
    const delta = (time - prevTime) / 1000;
    
    if (gameActive) {
        // Update bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            const bullet = bullets[i];
            
            // Move bullet
            bullet.mesh.position.add(bullet.direction.clone().multiplyScalar(bullet.speed * delta));
            bullet.distance += bullet.speed * delta;
            
            // Check if bullet hit an enemy
            for (let j = enemies.length - 1; j >= 0; j--) {
                const enemy = enemies[j];
                const distance = bullet.mesh.position.distanceTo(enemy.mesh.position);
                
                // Adjust hit distance based on enemy size
                const hitDistance = enemy.type === 'magaBoss' ? 2.0 : 1.2;
                
                if (distance < hitDistance) {
                    // Bullet hit enemy
                    createHitEffect(bullet.mesh.position.clone());
                    
                    // Remove bullet
                    scene.remove(bullet.mesh);
                    bullets.splice(i, 1);
                    
                    // Damage enemy
                    enemy.health -= 25;
                    
                    // Check if enemy is defeated
                    if (enemy.health <= 0) {
                        // Create death effect
                        createDeathEffect(enemy.mesh.position.clone(), enemy.type);
                        
                        // Remove enemy
                        scene.remove(enemy.mesh);
                        score += enemy.points;
                        enemies.splice(j, 1);
                        
                        // Check if wave is complete
                        if (enemies.length === 0) {
                            waveNumber++;
                            setTimeout(startWave, 3000);
                        }
                    }
                    
                    updateHUD();
                    break;
                }
            }
            
            // Remove bullet if it's too far or hit something
            if (bullet.distance > bullet.maxDistance) {
                scene.remove(bullet.mesh);
                bullets.splice(i, 1);
            }
        }
        
        // Update enemy positions
        for (let enemy of enemies) {
            // Get direction to player
            const direction = new THREE.Vector3();
            direction.subVectors(controls.getObject().position, enemy.mesh.position).normalize();
            direction.y = 0; // Keep enemies on the ground
            
            // Move enemy toward player
            enemy.mesh.position.x += direction.x * enemy.speed * delta * 100;
            enemy.mesh.position.z += direction.z * enemy.speed * delta * 100;
            
            // Make enemy face the player
            enemy.mesh.lookAt(new THREE.Vector3(
                controls.getObject().position.x,
                enemy.mesh.position.y,
                controls.getObject().position.z
            ));
            
            // Check if enemy is close to player
            const distanceToPlayer = enemy.mesh.position.distanceTo(controls.getObject().position);
            if (distanceToPlayer < 2 && time - enemy.lastAttackTime > 1000) {
                // Enemy attacks player
                health -= enemy.damage;
                enemy.lastAttackTime = time;
                
                // Check if player is defeated
                if (health <= 0) {
                    health = 0;
                    gameActive = false;
                    document.getElementById('instructions').classList.remove('hidden');
                    document.getElementById('instructions').innerHTML = '<h1>Game Over!</h1><p>You were defeated by MAGA supporters.</p><button id="restart-button">PLAY AGAIN</button>';
                    document.getElementById('restart-button').addEventListener('click', function() {
                        location.reload();
                    });
                    controls.unlock();
                }
                
                updateHUD();
            }
        }
        
        // Player movement
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;
        velocity.y -= 9.8 * 100.0 * delta; // Apply gravity
        
        direction.z = Number(moveForward) - Number(moveBackward);
        direction.x = Number(moveRight) - Number(moveLeft);
        direction.normalize();
        
        if (moveForward || moveBackward) velocity.z -= direction.z * movementSpeed * delta;
        if (moveLeft || moveRight) velocity.x -= direction.x * movementSpeed * delta;
        
        controls.moveRight(-velocity.x * delta);
        controls.moveForward(-velocity.z * delta);
        
        controls.getObject().position.y += (velocity.y * delta);
        
        // Keep player above ground
        if (controls.getObject().position.y < playerHeight) {
            velocity.y = 0;
            controls.getObject().position.y = playerHeight;
            canJump = true;
        }
    }
    
    prevTime = time;
    renderer.render(scene, camera);
}

function createHitEffect(position) {
    // Create a spark effect when bullet hits
    const sparkGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const sparkMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.8
    });
    
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    spark.position.copy(position);
    scene.add(spark);
    
    // Add a flash light
    const sparkLight = new THREE.PointLight(0xff0000, 2, 3);
    spark.add(sparkLight);
    
    // Remove after a short time
    setTimeout(() => {
        scene.remove(spark);
    }, 100);
}

function createDeathEffect(position, enemyType) {
    // Create explosion when enemy dies
    const particleCount = enemyType === 'magaBoss' ? 30 : 15;
    
    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.2, 8, 8);
        const particleMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff3300,
            transparent: true,
            opacity: 0.8
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Random position within radius
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 2;
        particle.position.set(
            position.x + Math.cos(angle) * radius,
            position.y + 1 + Math.random() * 2,
            position.z + Math.sin(angle) * radius
        );
        
        scene.add(particle);
        
        // Add a small light
        if (i % 5 === 0) {
            const particleLight = new THREE.PointLight(0xff5500, 1, 3);
            particle.add(particleLight);
        }
        
        // Remove after a random time
        setTimeout(() => {
            scene.remove(particle);
        }, 500 + Math.random() * 500);
    }
}

// Create a visible gun model that appears in front of the player
function createGunModel() {
    // Create a gun group
    gunModel = new THREE.Group();
    
    // Create gun barrel
    const barrelGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.4,
        metalness: 0.7
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.z = -0.3;
    gunModel.add(barrel);
    
    // Create gun body
    const bodyGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.5,
        metalness: 0.6
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -0.2;
    gunModel.add(body);
    
    // Create gun handle
    const handleGeometry = new THREE.BoxGeometry(0.15, 0.3, 0.1);
    const handleMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 0.8,
        metalness: 0.2
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, -0.35, 0.05);
    handle.rotation.x = Math.PI * 0.1;
    gunModel.add(handle);
    
    // Add glowing purple details (Afro futuristic)
    const detailGeometry = new THREE.BoxGeometry(0.22, 0.05, 0.22);
    const detailMaterial = new THREE.MeshStandardMaterial({
        color: 0x8800ff,
        emissive: 0x6600cc,
        emissiveIntensity: 0.5,
        roughness: 0.4
    });
    const detail = new THREE.Mesh(detailGeometry, detailMaterial);
    detail.position.set(0, -0.1, 0);
    gunModel.add(detail);
    
    // Position the gun model in front of the camera
    gunModel.position.set(0.3, -0.3, -0.5);
    camera.add(gunModel);
}

// Debug helper function
function showDebugInfo(message) {
    const debugDiv = document.getElementById('debug-info');
    if (debugDiv) {
        debugDiv.textContent = message;
        console.log(message);
    }
}

// Start the game
init(); 