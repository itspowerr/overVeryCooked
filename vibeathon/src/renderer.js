class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.scale = 1; // Can implement zoom later
    }

    clear() {
        this.ctx.fillStyle = '#111';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawGrid(width, height, tileSize) {
        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 1;

        const offsetX = (this.canvas.width - width) / 2;
        const offsetY = (this.canvas.height - height) / 2;

        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);

        // Floor
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, width, height);
        this.ctx.strokeRect(0, 0, width, height);

        // Grid lines
        this.ctx.beginPath();
        for (let x = 0; x <= width; x += tileSize) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += tileSize) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
        }
        this.ctx.stroke();

        this.ctx.restore();
        return { x: offsetX, y: offsetY };
    }

    drawEntities(entities, offsetX, offsetY) {
        this.ctx.save();
        this.ctx.translate(offsetX, offsetY);

        // Draw shadows first
        entities.forEach(e => {
            this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
            this.ctx.fillRect(e.x + 4, e.y + 4, e.w, e.h);
        });

        // Draw entities
        entities.forEach(e => {
            // Highlight Interactable
            if (e.highlight) {
                this.ctx.strokeStyle = '#ffff00';
                this.ctx.lineWidth = 4;
                this.ctx.strokeRect(e.x - 2, e.y - 2, e.w + 4, e.h + 4);

                // Prompt
                this.ctx.fillStyle = '#ffff00';
                this.ctx.font = 'bold 20px "VT323"';
                this.ctx.textAlign = 'center'; // Ensure text is centered for prompt
                this.ctx.fillText(e.highlightPrompt || 'INTERACT', e.x + e.w / 2, e.y - 20);
            }

            // Base
            this.ctx.fillStyle = e.color;
            this.ctx.fillRect(e.x, e.y, e.w, e.h);

            // Detail (Border)
            this.ctx.strokeStyle = (e.highlight ? '#ffff00' : '#fff'); // Keep white normally, but we drew highlight outside already
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(e.x, e.y, e.w, e.h);

            // Text Label
            if (e.label) {
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '16px "VT323"';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(e.label, e.x + e.w / 2, e.y + e.h / 2 + 6);
            }

            // Player specific
            if (e instanceof Player) {
                this.ctx.fillStyle = '#fff';
                this.ctx.fillText(e.id, e.x + e.w / 2, e.y - 5);

                // Eyes based on direction
                this.ctx.fillStyle = '#000';
                const eyeOffX = e.direction === 1 ? -4 : (e.direction === 3 ? 4 : 0);
                const eyeOffY = e.direction === 2 ? -4 : (e.direction === 0 ? 4 : 0);
                this.ctx.fillRect(e.x + e.w / 2 - 6 + eyeOffX, e.y + e.h / 3 + eyeOffY, 4, 4);
                this.ctx.fillRect(e.x + e.w / 2 + 2 + eyeOffX, e.y + e.h / 3 + eyeOffY, 4, 4);

                // Holding Item override draw (if we wanted to draw it held)
                // We draw held items in main loop on top, so this is fine.
            }
        });

        this.ctx.restore();
    }
}
