/* =================================================================
   GAME: KART LEGENDS EVOLUTION (Safe Version)
   ================================================================= */
(function() {
    const Game = {
        state: { pos: 0, playerX: 0, speed: 0, steer: 0, nitro: 100 },
        players: {}, segments: [], trackLength: 0,
        
        init: function(sys) {
            this.sys = sys;
            this.reset();
            this.buildTrack();
            this.setupMultiplayer();
            const ui = document.getElementById('game-overlay-container');
            if(ui) ui.innerHTML = `
                <div style="position:absolute; top:20px; right:20px; font-family:'Russo One'; font-size:2rem; color:#fff; text-shadow:0 2px 4px #000;">
                    <span id="kart-speed">0</span> <span style="font-size:1rem">KM/H</span>
                </div>
                <div style="position:absolute; bottom:20px; left:20px; width:200px; height:20px; background:#333; border:2px solid #fff; transform:skewX(-20deg)">
                    <div id="kart-nitro" style="width:100%; height:100%; background:#00d2ff; transition:width 0.1s"></div>
                </div>`;
        },

        reset: function() {
            this.state.pos = 0; this.state.playerX = 0; this.state.speed = 0; this.state.steer = 0; this.state.nitro = 100;
        },

        buildTrack: function() {
            this.segments = [];
            for(let i=0; i<3000; i++) {
                this.segments.push({
                    index: i,
                    curve: (Math.floor(i/100)%2) * ((i%200)>100 ? 2 : -2),
                    color: Math.floor(i/3)%2 ? 'dark' : 'light'
                });
            }
            this.trackLength = this.segments.length * 200;
        },

        setupMultiplayer: function() {
            if (!this.sys.net) return;
            this.roomRef = this.sys.net.ref('games/kart/room_1');
            this.netInterval = setInterval(() => {
                this.roomRef.child(this.sys.playerId).set({ x: this.state.playerX, z: this.state.pos, ts: Date.now() });
            }, 100);
            this.roomRef.on('child_added', s => { if(s.key !== this.sys.playerId) this.players[s.key] = s.val(); });
            this.roomRef.on('child_changed', s => { if(s.key !== this.sys.playerId) { this.players[s.key].targetX = s.val().x; this.players[s.key].targetZ = s.val().z; } });
            this.roomRef.on('child_removed', s => delete this.players[s.key]);
        },

        update: function(dt, input) {
            // Guardrail contra NaN
            if (isNaN(dt)) dt = 0.016; 
            
            const S = this.state;
            let throttle = false; let turn = 0;
            
            if (input.pose) {
                const lw = input.pose.find(k => k.name === 'left_wrist');
                const rw = input.pose.find(k => k.name === 'right_wrist');
                if (lw && rw && lw.score > 0.3 && rw.score > 0.3) {
                    turn = (Math.atan2(rw.y - lw.y, rw.x - lw.x)) * 2.0;
                    throttle = true;
                }
            } else { throttle = true; } // Auto-accel

            const maxSpeed = 20000;
            if (throttle) S.speed += maxSpeed/5 * dt; else S.speed -= maxSpeed/5 * dt;
            S.speed = Math.max(0, Math.min(S.speed, maxSpeed));

            S.pos += S.speed * dt;
            while (S.pos >= this.trackLength) S.pos -= this.trackLength;
            
            // Safe segment access
            const segIndex = Math.floor(S.pos/200);
            const seg = this.segments[segIndex % this.segments.length] || this.segments[0];
            
            S.playerX -= (S.speed/maxSpeed) * seg.curve * 3 * dt;
            S.playerX += turn * dt * 5;
            S.playerX = Math.max(-2.5, Math.min(2.5, S.playerX));
            S.steer = turn;

            const elS = document.getElementById('kart-speed');
            if(elS) elS.innerText = Math.floor(S.speed/100);
            const elN = document.getElementById('kart-nitro');
            if(elN) elN.style.width = S.nitro + '%';
        },

        draw: function(ctx, w, h) {
            ctx.fillStyle = "#33aaff"; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "#2d8f1e"; ctx.fillRect(0, h/2, w, h/2);

            const baseSeg = this.segments[Math.floor(this.state.pos/200)%this.segments.length];
            let x = 0; let dx = -(baseSeg.curve * ((this.state.pos%200)/200));
            let maxY = h;

            for(let n=0; n<300; n++) {
                const seg = this.segments[(baseSeg.index + n)%this.segments.length];
                const z = (n*200) - (this.state.pos%200);
                if (z < 10) continue;
                const scale = 1/z;
                const py = (h/2) + (1500 * scale * (h/2));
                
                x += dx; dx += seg.curve;
                const px = (w/2) + (x - this.state.playerX * 2000) * scale * (w/2);
                const pw = 2000 * scale * (w/2);

                if (py >= maxY) continue;
                
                ctx.fillStyle = seg.color === 'dark' ? '#555' : '#666';
                ctx.fillRect(px - pw, py, pw*2, maxY-py);
                
                ctx.fillStyle = seg.color === 'dark' ? '#c00' : '#fff';
                ctx.fillRect(px - pw - pw*0.1, py, pw*0.1, maxY-py);
                ctx.fillRect(px + pw, py, pw*0.1, maxY-py);

                maxY = py;
            }

            // Player
            const pSize = w * 0.15;
            ctx.save(); ctx.translate(w/2, h - pSize - 20); ctx.rotate(this.state.steer * 0.5);
            ctx.fillStyle = '#e74c3c'; ctx.fillRect(-pSize/2, -pSize/4, pSize, pSize/2);
            ctx.fillStyle = '#111'; ctx.fillRect(-pSize/2 - 10, 0, 15, 20); ctx.fillRect(pSize/2 - 5, 0, 15, 20);
            ctx.fillStyle = '#d32f2f'; ctx.beginPath(); ctx.arc(0, -pSize/2, pSize/3, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        },

        cleanup: function() {
            if (this.netInterval) clearInterval(this.netInterval);
            if (this.roomRef) this.roomRef.off();
            const ui = document.getElementById('game-overlay-container');
            if(ui) ui.innerHTML = '';
        }
    };

    const register = () => {
        if (window.System && window.System.registerGame) {
            window.System.registerGame('kart_evo', 'KART EVO', '🏎️', Game, { camOpacity: 0.2 });
        } else setTimeout(register, 100);
    };
    register();
})();
