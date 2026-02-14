/* =================================================================
   GAME: SUPER KART GP (Pseudo-3D Raster Road)
   Features: Mode 7 style, Virtual Steering, Particles
   ================================================================= */
(function() {
    const Game = {
        pos: 0, playerX: 0, speed: 0, 
        segments: [], trackLength: 0,
        particles: [],
        
        init: function(pid, audio) {
            this.audio = audio;
            this.reset();
            this.buildTrack();
        },

        reset: function() {
            this.pos = 0; this.playerX = 0; this.speed = 0;
            this.particles = [];
        },

        buildTrack: function() {
            this.segments = [];
            const add = (len, curve, h) => {
                for(let i=0; i<len; i++) this.segments.push({
                    curve: curve, 
                    y: h,
                    color: Math.floor(this.segments.length/3)%2 ? 'dark' : 'light'
                });
            };
            // Pista Procedural
            for(let i=0; i<500; i++) add(1, 0, 0); // Start
            for(let i=0; i<500; i++) add(1, 2, 0); // Curva Dir
            for(let i=0; i<500; i++) add(1, -2, 0); // Curva Esq
            for(let i=0; i<500; i++) add(1, 0, Math.sin(i/20)*1000); // Colinas
            this.trackLength = this.segments.length * 200;
        },

        update: function(dt, input, ctx, w, h) {
            // 1. INPUT (Volante Virtual)
            let turn = 0;
            let accel = false;
            
            if (input.type === 'pose') {
                const l = input.get('left_wrist');
                const r = input.get('right_wrist');
                if (l.found && r.found) {
                    const dx = r.x - l.x;
                    const dy = r.y - l.y;
                    turn = Math.atan2(dy, dx) * 2.5; // Calcula ângulo
                    accel = true; // Auto-acelera se mãos detectadas
                    
                    // Desenha Volante HUD
                    const cx = (l.x + r.x)/2 * w;
                    const cy = (l.y + r.y)/2 * h;
                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(turn);
                    ctx.strokeStyle = 'rgba(0, 242, 255, 0.5)';
                    ctx.lineWidth = 10;
                    ctx.beginPath(); ctx.arc(0,0, 60, 0, Math.PI*2); ctx.stroke();
                    ctx.fillStyle = '#f00'; ctx.fillRect(-5, -60, 10, 20); // Marcador
                    ctx.restore();
                }
            } else {
                // Mouse Fallback
                turn = (input.get().x - 0.5) * 3;
                accel = input.get().found;
            }

            // 2. PHYSICS
            const maxSpeed = 22000;
            if (accel) this.speed += 10000 * dt;
            else this.speed -= 10000 * dt;
            
            // Offroad drag
            if (Math.abs(this.playerX) > 1.2) {
                this.speed *= 0.95;
                if(this.speed > 5000) this.spawnParticle(w/2 + (Math.random()-0.5)*100, h, '#8B4513');
            }
            
            this.speed = Math.max(0, Math.min(this.speed, maxSpeed));
            this.pos += this.speed * dt;
            while (this.pos >= this.trackLength) this.pos -= this.trackLength;
            while (this.pos < 0) this.pos += this.trackLength;

            // Curvas
            const segIdx = Math.floor(this.pos / 200);
            const seg = this.segments[segIdx % this.segments.length];
            const speedRatio = this.speed / maxSpeed;
            
            this.playerX -= (seg.curve * speedRatio * 3 * dt); // Força centrífuga
            this.playerX += turn * dt * 4 * speedRatio; // Steering
            this.playerX = Math.max(-2, Math.min(2, this.playerX));

            // 3. RENDER (Raster Road)
            ctx.fillStyle = '#0099ff'; ctx.fillRect(0,0,w,h/2); // Céu
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(0,h/2,w,h/2); // Chão (fallback)

            let dx = 0;
            let ddx = -(seg.curve * (this.pos % 200)/200);
            let maxY = h;

            for(let n=0; n<200; n++) {
                const s = this.segments[(segIdx + n) % this.segments.length];
                const z = (n * 200);
                if (z < 10) continue;
                
                const proj = 1 / z;
                const sy = (h/2) + (1000 * proj * (h/2)); // 1000 = camera height
                
                dx += ddx; ddx += s.curve;
                const sx = (w/2) + (dx - this.playerX * 2000) * proj * (w/2);
                const sw = 2000 * proj * (w/2);

                if (sy >= maxY) continue;
                
                // Draw Segment
                const color = s.color === 'dark' ? '#555' : '#666';
                const rumble = s.color === 'dark' ? '#c00' : '#fff';
                const grass = s.color === 'dark' ? '#009900' : '#00aa00';
                
                // Grass
                ctx.fillStyle = grass; ctx.fillRect(0, sy, w, maxY-sy);
                // Rumble
                ctx.fillStyle = rumble; ctx.fillRect(sx-sw*1.2, sy, sw*2.4, maxY-sy);
                // Road
                ctx.fillStyle = color; ctx.fillRect(sx-sw, sy, sw*2, maxY-sy);

                maxY = sy;
            }

            // Draw Kart Sprite (Procedural)
            const kx = w/2; const ky = h - 80;
            const turnVisual = turn * 10;
            ctx.save();
            ctx.translate(kx, ky);
            ctx.rotate(turn * 0.2);
            
            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 40, 60, 20, 0, 0, Math.PI*2); ctx.fill();
            
            // Rodas
            ctx.fillStyle = '#111'; 
            ctx.fillRect(-60, 10, 30, 40); ctx.fillRect(30, 10, 30, 40);
            
            // Chassis
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.roundRect(-40, -20, 80, 60, 10); ctx.fill();
            
            // Piloto
            ctx.fillStyle = '#ffe0bd'; ctx.beginPath(); ctx.arc(0, -20, 25, 0, Math.PI*2); ctx.fill(); // Cabeça
            ctx.fillStyle = '#d32f2f'; ctx.beginPath(); ctx.arc(0, -25, 26, Math.PI, 0); ctx.fill(); // Boné

            ctx.restore();

            // Particles
            this.renderParticles(ctx);

            return Math.floor(this.speed/100);
        },

        spawnParticle: function(x, y, color) {
            this.particles.push({x, y, vx: (Math.random()-0.5)*5, vy: -Math.random()*5, life: 1, color});
        },
        
        renderParticles: function(ctx) {
            this.particles.forEach((p, i) => {
                p.x += p.vx; p.y += p.vy; p.life -= 0.05;
                if(p.life <= 0) this.particles.splice(i, 1);
                else {
                    ctx.globalAlpha = p.life;
                    ctx.fillStyle = p.color;
                    ctx.fillRect(p.x, p.y, 8, 8);
                }
            });
            ctx.globalAlpha = 1;
        }
    };

    // Retry registration if System is not ready
    const reg = () => {
        if(window.System) window.System.register('kart', 'Super Kart GP', 'Arcade Racer', '🏎️', Game);
        else setTimeout(reg, 100);
    };
    reg();
})();