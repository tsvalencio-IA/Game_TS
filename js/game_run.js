(function() {
    const Game = {
        state: { x: 0, y: 0, vy: 0, grounded: true },
        obstacles: [], score: 0, speed: 500,
        
        init: function(sys) {
            this.sys = sys;
            this.state = { x: 0, y: 0, vy: 0, grounded: true };
            this.obstacles = [];
            this.score = 0;
            const ui = document.getElementById('game-overlay-container');
            if(ui) ui.innerHTML = `<div style="position:absolute; top:20px; left:20px; color:#0f0; font-family:'Chakra Petch'; font-size:1.5rem">DIST: <span id="run-dist">0</span>m</div>`;
        },

        update: function(dt, input) {
            if(isNaN(dt)) dt = 0.016;
            this.speed += 10 * dt;
            this.score += this.speed * dt * 0.01;

            let jump = false;
            if (input.pose) {
                const nose = input.pose.find(k => k.name === 'nose');
                const lw = input.pose.find(k => k.name === 'left_wrist');
                if (nose && lw && lw.y < nose.y) jump = true;
            }

            if (!this.state.grounded) {
                this.state.vy += 2000 * dt;
                this.state.y += this.state.vy * dt;
                if (this.state.y >= 0) { this.state.y = 0; this.state.vy = 0; this.state.grounded = true; }
            } else if (jump) {
                this.state.vy = -900; this.state.grounded = false;
            }

            if (this.obstacles.length === 0 || this.obstacles[this.obstacles.length-1].x < 600) {
                if (Math.random() > 0.5) this.obstacles.push({ x: 1000 + Math.random() * 500, w: 50, h: 50 + Math.random() * 50 });
            }
            this.obstacles.forEach(o => o.x -= this.speed * dt);
            this.obstacles = this.obstacles.filter(o => o.x > -100);

            const el = document.getElementById('run-dist');
            if(el) el.innerText = Math.floor(this.score);
        },

        draw: function(ctx, w, h) {
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(0,0,w,h);
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(w-100, 100, 50, 0, Math.PI*2); ctx.fill();
            const groundY = h * 0.8;
            ctx.fillStyle = '#27ae60'; ctx.fillRect(0, groundY, w, h-groundY);
            ctx.fillStyle = '#c0392b';
            this.obstacles.forEach(o => {
                const scaleX = w / 800; const scaleY = h / 600;
                ctx.fillRect(o.x * scaleX, (groundY - o.h * scaleY), o.w * scaleX, o.h * scaleY);
            });
            const py = groundY + this.state.y * (h/600) - 50;
            ctx.fillStyle = '#fff'; ctx.fillRect(100 * (w/800), py, 50, 50);
        },
        
        cleanup: function() {
            const ui = document.getElementById('game-overlay-container');
            if(ui) ui.innerHTML = '';
        }
    };
    const register = () => { if(window.System?.registerGame) window.System.registerGame('runner', 'SPEED RUN', '🏃', Game, { camOpacity: 0.1 }); else setTimeout(register, 100); };
    register();
})();
