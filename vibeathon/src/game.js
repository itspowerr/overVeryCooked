class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);

        this.inputState = {};
        this.lastTime = 0;

        this.mapWidth = CONFIG.MAP_WIDTH * CONFIG.TILE_SIZE;
        this.mapHeight = CONFIG.MAP_HEIGHT * CONFIG.TILE_SIZE;

        this.players = [];
        this.stations = [];
        this.blocks = [];
        this.entities = []; // All updateable/drawable

        this.gameState = 'MENU'; // MENU, PLAY, GAMEOVER
        this.score = 0;
        this.combo = 1;
        this.timer = 0;

        this.activeTicket = null;
        this.chaosMode = null;
        this.wrongBlockPenalty = null; // Track wrong block penalty
        this.submissionDeadline = null; // Track P2 submission deadline

        this.bindInput();
        this.setupLevel(); // Prepare entities even if not started

        // UI Refs
        this.ui = {
            score: document.getElementById('score-val'),
            timer: document.getElementById('timer-val'),
            combo: document.getElementById('combo-val'),
            startScreen: document.getElementById('start-screen'),
            gameEventModal: document.getElementById('chaos-indicator'),
            readerModal: document.getElementById('reader-modal'),
            compilerModal: document.getElementById('compiler-modal')
        };

        // Start button
        document.getElementById('start-btn').onclick = () => this.startGame();
        document.getElementById('restart-btn').onclick = () => this.startGame();
    }

    bindInput() {
        window.addEventListener('keydown', (e) => {
            this.inputState[e.key] = true;
            this.inputState[e.code] = true; // Support both

            // Prevent scrolling with arrows/space
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) > -1 || e.code === 'Space') {
                e.preventDefault();
            }

            if (this.gameState === 'MENU' && e.code === 'Space') {
                this.startGame();
            }

            // Restart on game over
            if (this.gameState === 'GAMEOVER' && e.code === 'Space') {
                this.startGame();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.inputState[e.key] = false;
            this.inputState[e.code] = false;

            // Handle interaction trigger on key UP (to prevent spam)
            // Check both code and key for robustness
            this.checkInteraction(e.code);
        });
    }

    startGame() {
        this.gameState = 'PLAY';
        this.score = 0;
        this.combo = 1;
        this.ui.startScreen.classList.add('hidden');
        document.getElementById('game-over-modal').classList.add('hidden');

        this.setupLevel();
        this.spawnTicket();
        this.lastTime = performance.now();

        // Start background music
        const music = document.getElementById('bgMusic');
        if (music) {
            music.volume = 0.3; // Set volume to 30%
            music.play().catch(e => console.log('Music autoplay blocked:', e));
        }

        // Start Loop
        requestAnimationFrame((t) => this.loop(t));
    }

    setupLevel() {
        this.players = [
            new Player(1, 100, 100, 'READER', { UP: 'KeyW', DOWN: 'KeyS', LEFT: 'KeyA', RIGHT: 'KeyD', ACTION: 'KeyE' }),
            new Player(2, 200, 100, 'COMPILER', { UP: 'ArrowUp', DOWN: 'ArrowDown', LEFT: 'ArrowLeft', RIGHT: 'ArrowRight', ACTION: 'Enter' })
        ];

        // Stations
        this.stations = [
            new Station('BOARD', this.mapWidth / 2 - 50, 20, 100, 50, 'TICKET BOARD'),
            new Station('COMPILER', this.mapWidth / 2 - 75, this.mapHeight - 80, 150, 60, 'COMPILER DESK'),
            new Station('BIN', this.mapWidth - 100, this.mapHeight - 80, 60, 60, 'TRASH'),

            // Shelves
            new KnowledgeShelf(BLOCK_TYPES.PYTHON, 100, 150),
            new KnowledgeShelf(BLOCK_TYPES.MATH, 300, 150),
            new KnowledgeShelf(BLOCK_TYPES.LOGIC, 500, 150),
            new KnowledgeShelf(BLOCK_TYPES.PHYSICS, 700, 150)
        ];

        this.blocks = [];
    }

    spawnTicket() {
        const q = QUESTIONS[Math.floor(Math.random() * QUESTIONS.length)];
        this.activeTicket = {
            ...q,
            startTime: Date.now(),
            expiresAt: Date.now() + q.time * 1000,
            collectedBlocks: [] // Will be filled as blocks are collected
        };
        this.submissionDeadline = null; // Reset submission deadline for new ticket
        this.updateTicketUI();
    }

    updateTicketUI() {
        const hud = document.getElementById('active-ticket-hud');
        if (!this.activeTicket) {
            hud.classList.add('hidden');
            return;
        }
        hud.classList.remove('hidden');

        const reqsDiv = document.getElementById('ticket-reqs');
        reqsDiv.innerHTML = '';

        // Blocks needed
        this.activeTicket.blocks.forEach((bType, idx) => {
            const hasIt = this.activeTicket.collectedBlocks[idx];
            const div = document.createElement('div');
            div.style.color = hasIt ? '#0f0' : '#fff';
            // Find label for this block type string
            const typeObj = BLOCK_TYPES[bType];
            div.innerText = `[${hasIt ? 'OK' : ' '}] ${typeObj.label}`;
            reqsDiv.appendChild(div);
        });
    }

    checkInteraction(code) {
        if (this.gameState !== 'PLAY') return;

        this.players.forEach(p => {
            // Check if this player's action key matches the released key
            if (code === p.controls.ACTION) {
                this.handlePlayerAction(p);
            }
        });
    }

    handlePlayerAction(p) {
        // If holding item, try to drop
        if (p.holdingItem) {
            // Check if near station
            const station = this.getNearestStation(p);
            if (station) {
                if (station.type === 'COMPILER') {
                    // Add to compiler
                    // Simplify: Just put on desk for P2 to submit?
                    // Or "insert" into ticket?
                    // Let's say we "insert" into the active ticket if it matches requirement
                    this.tryInsertBlock(p);
                } else if (station.type === 'BIN') {
                    // Check if this was a wrong block being cleaned up
                    if (p.holdingItem.isWrongBlock) {
                        // Successfully trashed wrong block!
                        this.clearWrongBlockPenalty();
                    }
                    p.holdingItem = null; // Delete
                } else {
                    // Just drop on station (table)
                    p.holdingItem.x = station.x + 10;
                    p.holdingItem.y = station.y + 10;
                    this.blocks.push(p.holdingItem);
                    p.holdingItem = null;
                }
            } else {
                // Drop on ground - check if it's a wrong block!
                const blockTypeKey = Object.keys(BLOCK_TYPES).find(key => BLOCK_TYPES[key] === p.holdingItem.type);
                const isNeeded = this.activeTicket && this.activeTicket.blocks.includes(blockTypeKey);

                if (!isNeeded) {
                    // Wrong block dropped! Start penalty timer
                    p.holdingItem.isWrongBlock = true;
                    this.startWrongBlockPenalty(p.holdingItem);
                }

                p.holdingItem.x = p.x;
                p.holdingItem.y = p.y + p.h;
                this.blocks.push(p.holdingItem);
                p.holdingItem = null;
            }
        } else {
            // Try to pick up
            // Priority 1: Stations (Shelves, Board)
            const station = this.getNearestStation(p);
            if (station) {
                if (station.type === 'SHELF') {
                    // Spawn new block
                    const b = new Block(station.blockType, p.x, p.y);
                    p.holdingItem = b;
                } else if (station.type === 'BOARD' && p.role === 'READER') {
                    this.openReaderModal();
                } else if (station.type === 'COMPILER' && p.role === 'COMPILER') {
                    this.openCompilerModal();
                }
                return;
            }

            // Priority 2: Blocks on ground
            const block = this.getNearestBlock(p);
            if (block) {
                p.holdingItem = block;
                // Remove from ground array
                this.blocks = this.blocks.filter(b => b !== block);
            }
        }
    }

    tryInsertBlock(p) {
        if (!this.activeTicket) return;

        // Check if this block type is needed
        // We need to match the type string
        const blockTypeKey = Object.keys(BLOCK_TYPES).find(key => BLOCK_TYPES[key] === p.holdingItem.type);

        // Find first missing slot of this type
        // activeTicket.blocks is array like ['PYTHON', 'MATH']
        // activeTicket.collectedBlocks is array like [true, false]
        // But we store 'true' if filled? No, let's store the block itself or just true.

        // Simplified: Just match first Unfilled requirement of this type
        const neededIdx = this.activeTicket.blocks.findIndex((reqType, idx) =>
            reqType === blockTypeKey && !this.activeTicket.collectedBlocks[idx]
        );

        if (neededIdx !== -1) {
            this.activeTicket.collectedBlocks[neededIdx] = true;
            p.holdingItem = null; // Consumed
            this.updateTicketUI();

            // Check if all blocks are now ready
            const allReady = this.activeTicket.blocks.every((_, i) => this.activeTicket.collectedBlocks[i]);
            if (allReady && !this.submissionDeadline) {
                // Start submission timer! P2 has 15 seconds to submit
                this.submissionDeadline = Date.now() + 15000; // 15 seconds
                this.showNotification('BLOCKS READY!', 'P2: SUBMIT IN 15 SECONDS!', 'warning');
            }
        }
        // Else keep holding
    }

    getNearestStation(p) {
        // Add a small buffer distance for interaction (10px)
        const buffer = 15;
        const expandedP = {
            x: p.x - buffer,
            y: p.y - buffer,
            w: p.w + buffer * 2,
            h: p.h + buffer * 2
        };

        return this.stations.find(s => this.rectIntersect(expandedP, s));
    }

    rectIntersect(r1, r2) {
        return (
            r1.x < r2.x + r2.w &&
            r1.x + r1.w > r2.x &&
            r1.y < r2.y + r2.h &&
            r1.y + r1.h > r2.y
        );
    }

    getNearestBlock(p) {
        return this.blocks.find(b => p.collidesWith(b));
    }

    openReaderModal() {
        if (!this.activeTicket) return;
        const m = this.ui.readerModal;
        m.classList.remove('hidden');
        document.getElementById('ticket-id').innerText = this.activeTicket.id;
        document.getElementById('ticket-question').innerText = this.activeTicket.text;

        const opts = document.getElementById('ticket-options-view');
        opts.innerHTML = '';
        this.activeTicket.options.forEach(opt => {
            const d = document.createElement('div');
            d.className = 'option-item';
            d.innerText = opt;
            opts.appendChild(d);
        });

        // Close on E/Action
        // Since we are in a loop, we need a "modal mode" or just checking input in loop
        // Simplest: just one-off toggle logic in handlePlayerAction
        // But need to pause game? No, overcooked runs real time.
        // Just verify P1 cannot move while reading?
        // Let's keep it simple: Modal is just overlay. P1 can still move (maybe unintentional). 
        // To fix: add 'READING' state to player relative to modal.

        // For now: Close automatically if player moves away? OR press E again.
        // Let's implement Close on E logic in `checkInteraction` if modal open. 
        // Actually, let's just use the `keydown` listener to close if open.
    }

    openCompilerModal() {
        if (!this.activeTicket) return;

        // Check if all blocks collected
        const allReady = this.activeTicket.blocks.every((_, i) => this.activeTicket.collectedBlocks[i]);

        if (!allReady) {
            // Maybe show "MISSING BLOCKS" toast
            return;
        }

        const m = this.ui.compilerModal;
        m.classList.remove('hidden');

        // Show the question text so P2 knows what they're answering!
        const modalContent = m.querySelector('.modal-content');
        let questionDisplay = modalContent.querySelector('.compiler-question');
        if (!questionDisplay) {
            questionDisplay = document.createElement('div');
            questionDisplay.className = 'code-block compiler-question';
            modalContent.insertBefore(questionDisplay, modalContent.querySelector('.instruction'));
        }
        questionDisplay.innerText = this.activeTicket.text;

        const grid = document.getElementById('compiler-options');
        grid.innerHTML = '';

        this.activeTicket.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = opt;
            btn.onclick = () => {
                clearTimeout(this.compilerTimeout);
                clearInterval(this.compilerTimerInterval);
                this.submitAnswer(opt);
            };
            grid.appendChild(btn);
        });

        // Start timer countdown (15 seconds to choose)
        const timerFill = document.getElementById('compiler-timer-fill');
        const timerText = document.getElementById('compiler-timer-text');
        const timerDisplay = document.querySelector('.timer-display');
        const timeLimit = 15000; // 15 seconds
        let timeLeft = 15;

        // Reset display
        timerText.innerText = timeLeft;
        timerDisplay.className = 'timer-display';

        // Visual bar animation
        timerFill.style.width = '100%';
        timerFill.style.transition = 'none';
        void timerFill.offsetWidth; // Force reflow

        timerFill.style.transition = `width ${timeLimit}ms linear`;
        timerFill.style.width = '0%';

        // Numeric countdown (updates every second)
        this.compilerTimerInterval = setInterval(() => {
            timeLeft--;
            timerText.innerText = timeLeft;

            // Color changes based on time
            if (timeLeft <= 5) {
                timerDisplay.className = 'timer-display danger';
            } else if (timeLeft <= 10) {
                timerDisplay.className = 'timer-display warning';
            }

            if (timeLeft <= 0) {
                clearInterval(this.compilerTimerInterval);
            }
        }, 1000);

        // Auto-submit wrong answer on timeout
        this.compilerTimeout = setTimeout(() => {
            clearInterval(this.compilerTimerInterval);
            this.submitAnswer(null); // null = timeout
        }, timeLimit);
    }

    submitAnswer(ans) {
        // Clear any active compiler timers/intervals
        clearTimeout(this.compilerTimeout);
        if (this.compilerTimerInterval) {
            clearInterval(this.compilerTimerInterval);
        }

        // Clear submission deadline
        this.submissionDeadline = null;

        const correct = ans === this.activeTicket.answer;

        if (ans === null) {
            // Timeout
            this.score -= 20;
            this.showNotification('TIME OUT!', '-20 POINTS', 'error');
            this.combo = 1;
            setTimeout(() => {
                this.spawnTicket();
            }, 1500);
        } else if (correct) {
            const points = 100 * this.combo;
            this.score += points;
            this.showNotification('SUCCESS!', `+${points} POINTS`, 'success');
            this.combo++;
            setTimeout(() => {
                this.spawnTicket();
            }, 1500); // Delay to show notification
        } else {
            this.score -= 20; // Reduced from 50
            this.showNotification('WRONG!', '-20 POINTS', 'error');
            this.combo = 1;
            setTimeout(() => {
                this.spawnTicket();
            }, 1500);
        }

        this.ui.compilerModal.classList.add('hidden');
        this.ui.readerModal.classList.add('hidden'); // Force close reader if open
        this.updateHUD();
    }

    showNotification(title, message, type) {
        const notification = document.getElementById('notification');
        const notificationContent = notification.querySelector('.notification-content');
        const titleEl = document.getElementById('notification-title');
        const messageEl = document.getElementById('notification-message');

        titleEl.innerText = title;
        messageEl.innerText = message;

        // Set type class
        notificationContent.className = `notification-content ${type}`;

        // Show
        notification.classList.remove('hidden');
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Hide after 1.2 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.classList.add('hidden');
            }, 300);
        }, 1200);
    }

    updateHUD() {
        this.ui.score.innerText = this.score;
        this.ui.combo.innerText = this.combo;
        this.updateTutorialText();
    }

    updateTutorialText() {
        const el = document.getElementById('tutorial-overlay');
        if (!this.activeTicket) {
            el.innerText = "WAITING FOR TICKET...";
            return;
        }

        // Check what blocks are still needed
        const needed = this.activeTicket.blocks.map((b, i) => !this.activeTicket.collectedBlocks[i]);
        const anyNeeded = needed.some(n => n);

        if (anyNeeded) {
            // Show which specific blocks are needed
            const neededBlocks = this.activeTicket.blocks
                .filter((b, i) => !this.activeTicket.collectedBlocks[i])
                .map(blockType => BLOCK_TYPES[blockType].label)
                .join(', ');

            el.innerHTML = `STEP 1: P1 READ TICKET (PRESS E AT BOARD)<br>STEP 2: GET ${neededBlocks} BLOCK FROM SHELF<br>STEP 3: DROP AT COMPILER DESK`;
        } else {
            el.innerHTML = "ALL BLOCKS READY!<br>P2: GO TO COMPILER DESK & PRESS ENTER";
        }
    }

    loop(timestamp) {
        if (this.gameState !== 'PLAY') return;
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame((t) => this.loop(t));
    }

    update(dt) {
        // Ticket Timer
        if (this.activeTicket) {
            let elapsed = Date.now() - this.lastTime; // Wait, lastTime is frame time.
            // Using real time for expiration
            let timeRem = Math.max(0, this.activeTicket.expiresAt - Date.now());

            // Chaos: SPEED (Reduce expiration faster? Or just visual?)
            // If SPEED mode, we should decrease expiresAt, but that's complex since expiresAt is absolute.
            // Alternative: recalculate expiresAt when chaos starts? 
            // Simpler: Just subtract extra time from Time Remaining visual and Logic if chaos is active?
            // Correct approach: When SPEED starts, reduce expiresAt by X amount?
            // Or just tick timer faster? 
            // Let's just spawn chaos on fail first.

            if (this.chaosMode === 'SPEED') {
                // To simulate 2x speed, we need to artificially advance the expiration
                // Every frame, subtract extra dt?
                // Since expiresAt is absolute, we should shift it closer.
                this.activeTicket.expiresAt -= dt; // 2x speed (normal time passes + we subtract elapsed again)
                timeRem = Math.max(0, this.activeTicket.expiresAt - Date.now());
            }

            this.ui.timer.innerText = Math.ceil(timeRem / 1000);

            if (timeRem === 0) {
                // GAME OVER when deadline hits zero
                this.gameOver();
            }

            // Update tutorial text
            this.updateTutorialText();
        }

        // Wrong Block Penalty Timer
        if (this.wrongBlockPenalty) {
            const timeLeft = this.wrongBlockPenalty.expiresAt - Date.now();
            const secondsLeft = Math.ceil(timeLeft / 1000);

            // Update display
            const penaltyTimer = document.getElementById('penalty-timer');
            const countdown = document.getElementById('penalty-countdown');
            penaltyTimer.classList.remove('hidden');
            countdown.innerText = secondsLeft;

            if (timeLeft <= 0) {
                // Time's up! Game over
                penaltyTimer.classList.add('hidden');
                this.gameOver();
                return;
            }
        } else {
            // Hide penalty timer if no penalty active
            document.getElementById('penalty-timer').classList.add('hidden');
        }

        // Submission Deadline (P2 must submit when blocks are ready)
        if (this.submissionDeadline) {
            const timeLeft = this.submissionDeadline - Date.now();
            const secondsLeft = Math.ceil(timeLeft / 1000);

            // Update display
            const submissionTimer = document.getElementById('submission-timer');
            const countdown = document.getElementById('submission-countdown');
            submissionTimer.classList.remove('hidden');
            countdown.innerText = secondsLeft;

            if (timeLeft <= 0) {
                // P2 didn't submit in time! Game over
                submissionTimer.classList.add('hidden');
                this.gameOver();
                return;
            }
        } else {
            // Hide submission timer if no deadline active
            document.getElementById('submission-timer').classList.add('hidden');
        }

        // Entities
        const solids = [...this.stations];
        const mapBounds = { width: this.mapWidth, height: this.mapHeight };

        this.players.forEach(p => p.update(this.inputState, mapBounds, solids, this.chaosMode));

        // Chaos Timer
        if (this.chaosMode) {
            if (Date.now() > this.chaosEndTime) {
                this.endChaos();
            }
        }

        // Highlights & Prompts
        this.stations.forEach(s => {
            s.highlight = false;
            s.highlightPrompt = null;
        });

        this.players.forEach(p => {
            const nearby = this.getNearestStation(p);
            if (nearby) {
                nearby.highlight = true;
                const keyName = p.controls.ACTION === 'KeyE' ? 'E' : 'ENTER';
                nearby.highlightPrompt = `PRESS ${keyName}`;
            }
        });

        // Simple Modal Close Check
        if (this.ui.readerModal.classList.contains('hidden') === false) {
            // If P1 moves away from board, close?
            const p1 = this.players.find(p => p.role === 'READER');
            const board = this.stations.find(s => s.type === 'BOARD');
            if (!p1.collidesWith(board)) {
                this.ui.readerModal.classList.add('hidden');
            }
        }
    }

    triggerChaos() {
        if (this.chaosMode) return; // Already active

        const event = CHAOS_EVENTS[Math.floor(Math.random() * CHAOS_EVENTS.length)];
        this.chaosMode = event.id;
        this.chaosEndTime = Date.now() + event.duration;

        // Show UI
        const hud = this.ui.gameEventModal;
        hud.classList.remove('hidden');
        document.getElementById('chaos-name').innerText = event.name;

        // Specific effects
        if (this.chaosMode === 'BLIND') {
            // CSS obfuscation?
            // Maybe add a class to the container
            document.body.classList.add('chaos-blind');
        }
    }

    endChaos() {
        this.chaosMode = null;
        this.ui.gameEventModal.classList.add('hidden');
        document.body.classList.remove('chaos-blind');
    }

    startWrongBlockPenalty(block) {
        // Only one penalty at a time
        if (this.wrongBlockPenalty) {
            return;
        }

        this.wrongBlockPenalty = {
            block: block,
            expiresAt: Date.now() + 10000 // 10 seconds to trash it
        };

        // Show warning
        this.showNotification('WRONG BLOCK!', 'TRASH IT IN 10 SECONDS!', 'error');
    }

    clearWrongBlockPenalty() {
        this.wrongBlockPenalty = null;
    }

    gameOver() {
        this.gameState = 'GAMEOVER';

        // Pause music
        const music = document.getElementById('bgMusic');
        if (music) {
            music.pause();
        }

        // Close all modals
        this.ui.compilerModal.classList.add('hidden');
        this.ui.readerModal.classList.add('hidden');

        // Clear any timers
        clearTimeout(this.compilerTimeout);
        if (this.compilerTimerInterval) {
            clearInterval(this.compilerTimerInterval);
        }

        // Show game over modal
        const modal = document.getElementById('game-over-modal');
        modal.classList.remove('hidden');
        document.getElementById('final-score').innerText = this.score;
    }

    draw() {
        this.renderer.clear();

        // Center camera
        const offset = this.renderer.drawGrid(this.mapWidth, this.mapHeight, CONFIG.TILE_SIZE);

        // Pass state to renderer
        this.renderer.hasActiveTicket = !!this.activeTicket;

        // Draw Stations
        this.renderer.drawEntities(this.stations, offset.x, offset.y);

        // Draw Blocks
        this.renderer.drawEntities(this.blocks, offset.x, offset.y);

        // Draw Players
        this.renderer.drawEntities(this.players, offset.x, offset.y);

        // Draw Held Items on top
        this.players.forEach(p => {
            if (p.holdingItem) {
                this.renderer.drawEntities([p.holdingItem], offset.x, offset.y);
            }
        });
    }
}
