(function() {
    const Game = {
        ball: { x: 0, y: 0, z: 0, vz: 0, vy: 0 },
        score: 0, state: 'SERVE',
        
        init: function(sys) {
            this.sys = sys; this.resetBall();
            const ui = document.getElementById('game-overlay-container');
            if(ui) ui.innerHTML = `<div style="position:absolute; top:10px; left:50%; transform:translateX(-50%); color:#fff; font-family:'Chakra Petch'; font-size:1.5rem">SCORE: <span id="ten-score">0</span></div>`;
        },

        resetBall: function() { this.ball = { x: 0, y: 100, z: 0, vz: 0, vy: 0 }; this.state = 'SERVE'; },

        update: function(dt, input) {
            if(isNaN(dt)) dt = 0.016;
            const B = this.ball;
            let swing = false;
            if (input.pose) {
                const rw = input.pose.find(k => k.name === 'right_wrist');
                if (rw && rw.score > 0.3) swing = true; // Simple logic
            }

            if (this.state !== 'SERVE') {
                B.z += B.vz * dt; B.y += B.vy * dt; B.vy -= 1000 * dt; // Gravity
                if (B.y <= 0) { B.y = 0; B.vy *= -0.7; }
                if (B.z > 1200) { this.state = 'FAIL'; setTimeout(() => this.resetBall(), 1000); }
            }

            if (this.state === 'SERVE' && swing) {
                this.state = 'PLAY'; B.vz = 600; B.vy = 300;
            } else if (this.state === 'PLAY' && B.z > 800) {
                this.state = 'RETURN'; B.vz = -600; B.vy = 300; // AI Return
            } else if (this.state === 'RETURN' && B.z < 100 && swing) {
                this.state = 'PLAY'; B.vz = 650; B.vy = 300; this.score++;
                const el = document.getElementById('ten-score'); if(el) el.innerText = this.score;
            }
        },

        draw: function(ctx, w, h) {
            const cx = w/2; const cy = h/2;
            const project = (x, y, z) => { const s = 300 / (300 + z + 400); return { x: cx + x * s, y: cy - y * s + 100 * s, s }; };
            
            ctx.fillStyle = '#2980b9';
            const p1 = project(-200, 0, 0); const p2 = project(200, 0, 0);
            const p3 = project(200, 0, 800); const p4 = project(-200, 0, 800);
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.fill();

            const b = project(this.ball.x, this.ball.y, this.ball.z);
            const s = project(this.ball.x, 0, this.ball.z);
            ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y, 10*s.s, 5*s.s, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(b.x, b.y, 15 * b.s, 0, Math.PI*2); ctx.fill();
        },
        cleanup: function() { const ui = document.getElementById('game-overlay-container'); if(ui) ui.innerHTML = ''; }
    };
    const register = () => { if(window.System?.registerGame) window.System.registerGame('tennis_pro', 'TENNIS PRO', '🎾', Game, { camOpacity: 0.1 }); else setTimeout(register, 100); };
    register();
})();
