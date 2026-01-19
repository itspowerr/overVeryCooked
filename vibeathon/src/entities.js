class Entity {
    constructor(x, y, w, h, color) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.color = color;
        this.markedForDeletion = false;
    }

    getBounds() {
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    collidesWith(other) {
        return (
            this.x < other.x + other.w &&
            this.x + this.w > other.x &&
            this.y < other.y + other.h &&
            this.y + this.h > other.y
        );
    }
}

class Player extends Entity {
    constructor(id, x, y, role, controlScheme) {
        super(x, y, CONFIG.TILE_SIZE - 8, CONFIG.TILE_SIZE - 8, role === 'READER' ? '#00ffff' : '#ff00ff');
        this.id = id;
        this.role = role; // 'READER', 'COMPILER', 'INTERN'
        this.controls = controlScheme;
        this.speed = 4; // px per frame
        this.holdingItem = null;
        this.direction = 0; // 0: down, 1: left, 2: up, 3: right
        this.isInteracting = false;
        this.dashCooldown = 0;
        this.name = role;
    }

    update(inputState, mapBounds, solids, chaosMode) {
        let dx = 0;
        let dy = 0;

        let leftKey = this.controls.LEFT;
        let rightKey = this.controls.RIGHT;
        let upKey = this.controls.UP;
        let downKey = this.controls.DOWN;

        // Chaos: Reverse Controls
        if (chaosMode === 'REVERSE') {
            leftKey = this.controls.RIGHT;
            rightKey = this.controls.LEFT;
            upKey = this.controls.DOWN;
            downKey = this.controls.UP;
        }

        // Movement
        if (inputState[upKey]) dy -= this.speed;
        if (inputState[downKey]) dy += this.speed;
        if (inputState[leftKey]) dx -= this.speed;
        if (inputState[rightKey]) dx += this.speed;

        // Chaos: Slow
        if (chaosMode === 'SLOW') {
            dx *= 0.5;
            dy *= 0.5;
        }

        // Interact
        this.isInteracting = inputState[this.controls.ACTION];

        // Normalize diagonal
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // Apply Move X
        let nextX = this.x + dx;
        if (!this.checkCollision(nextX, this.y, mapBounds, solids)) {
            this.x = nextX;
        }

        // Apply Move Y
        let nextY = this.y + dy;
        if (!this.checkCollision(this.x, nextY, mapBounds, solids)) {
            this.y = nextY;
        }

        // Update Direction for visuals/interaction
        // (Visuals shouldn't be reversed, just movement)
        if (Math.abs(dy) > 0 || Math.abs(dx) > 0) {
            // Calculate intended direction based on movement
            if (dy > 0) this.direction = 0;
            if (dx < 0) this.direction = 1;
            if (dy < 0) this.direction = 2;
            if (dx > 0) this.direction = 3;
        }

        // Carry item
        if (this.holdingItem) {
            this.holdingItem.x = this.x + 4;
            this.holdingItem.y = this.y - 10;
        }
    }

    checkCollision(x, y, bounds, solids) {
        // Map Bounds
        if (x < 0 || x + this.w > bounds.width || y < 0 || y + this.h > bounds.height) {
            return true;
        }

        // Solids (Stations, Walls)
        const myRect = { x, y, w: this.w, h: this.h };
        for (const solid of solids) {
            if (this.rectIntersect(myRect, solid)) return true;
        }
        return false;
    }

    rectIntersect(r1, r2) {
        return (
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y
        );
    }
}

class Block extends Entity {
    constructor(type, x, y) {
        super(x, y, 32, 32, type.color);
        this.type = type; // From BLOCK_TYPES
        this.isPickedUp = false;
        this.label = type.label;
    }
}

class Station extends Entity {
    constructor(type, x, y, w, h, label) {
        super(x, y, w, h, '#555');
        this.type = type; // 'BOARD', 'SHELF', 'COMPILER', 'BIN', 'COFFEE', 'DEBUG'
        this.label = label;
        this.highlight = false;
    }
}

class KnowledgeShelf extends Station {
    constructor(blockType, x, y) {
        super('SHELF', x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, 'SHELF');
        this.blockType = blockType;
        this.color = blockType.color;
    }
}
