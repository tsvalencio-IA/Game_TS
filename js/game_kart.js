/* =================================================================
   GAME: KART LEGENDS EVOLUTION (Pseudo-3D / Mode 7 Style)
   Features: Drift, Particles, Multiplayer Interpolation
   ================================================================= */

(function() {
    const Game = {
        // --- CONSTANTES ---
        COLORS: {
            road: '#555', grass: '#2d8f1e', rumble: '#c0392b', lane: '#fff'
        },
        
        // --- ESTADO ---
        state: {
            pos: 0,
            playerX: 0,
            speed: 0,
            steer: 0,
            nitro: 100,
            lap: 1,
            totalLaps: 3
        },
        
        players: {}, // Multiplayer cache
        particles: [],
        segments: [],
        trackLength: 0,
        
        // --- INICIALIZAÇÃO ---
        init: function(sys) {
            this.sys = sys;
            this.reset();
            this.buildTrack();
            this.setupMultiplayer();
            // Overlay UI
            const ui = document.getElementById('game-overlay-container');
            ui.innerHTML = `
                <div style="position:absolute; top:20px; right:20px; font-family:'Russo One'; font-size:2rem; color:#fff; text-shadow:0 2px 4px #000;">
                    <span id="kart-speed">0</span> <span style="font-size:1rem">KM/H</span>
                </div>
                <div style="position:absolute; bottom:20px; left:20px; width:200px; height:20px; background:#333; border:2px solid #fff; transform:skewX(-20deg)">
                    <div id="kart-nitro" style="width:100%; height:100%; background:#00d2ff; transition:width 0.1s"></div>
                </div>
            `;
        },

        reset: function() {
            this.state.pos = 0;
            this.state.playerX = 0;
            this.state.speed = 0;
            this.state.steer = 0;
            this.state.nitro = 100;
            this.particles = [];
        },

        // --- TRACK GENERATION (Procedural Segmented Road) ---
        buildTrack: function() {
            this.segments = [];
            const addSegment = (curve, y) => {
                const n = this.segments.length;
                this.segments.push({
                    index: n,
                    p1: { world: { z: n * 200 }, camera: {}, screen: {} },
                    p2: { world: { z: (n + 1) * 200 }, camera: {}, screen: {} },
                    curve: curve,
                    color: Math.floor(n / 3) % 2 ? 'dark' : 'light'
                });
            };

            // Layout da Pista (Curvas e Retas)
            for(let i=0; i<500; i++) addSegment(0, 0); // Start
            for(let i=0; i<800; i++) addSegment(Math.sin(i/100)*2, 0); // S-Curves
            for(let i=0; i<400; i++) addSegment(3, 0); // Hard Right
            for(let i=0; i<600; i++) addSegment(-2, 0); // Left
            for(let i=0; i<1000; i++) addSegment(0, 0); // Final Straight
            
            this.trackLength = this.segments.length * 200;
        },

        // --- NETWORKING ---
        setupMultiplayer: function() {
            if (!this.sys.net) return;
            this.roomRef = this.sys.net.ref('games/kart/room_1');
            
            // Enviar dados (Throttle 100ms)
            this.netInterval = setInterval(() => {
                this.roomRef.child(this.sys.playerId).set({
                    x: this.state.playerX,
                    z: this.state.pos,
                    steer: this.state.steer,
                    ts: Date.now()
                });
            }, 100);

            // Receber dados
            this.roomRef.on('child_added', s => { if(s.key !== this.sys.playerId) this.players[s.key] = s.val(); });
            this.roomRef.on('child_changed', s => {
                if(s.key !== this.sys.playerId) {
                    // Interpolação simples: salva alvo para lerp no update
                    const p = this.players[s.key];
                    p.targetX = s.val().x;
                    p.targetZ = s.val().z;
                }
            });
            this.roomRef.on('child_removed', s => delete this.players[s.key]);
        },

        // --- UPDATE LOOP ---
        update: function(dt, input) {
            const S = this.state;
            const maxSpeed = S.nitro > 0 && S.speed > 10000 ? 24000 : 18000;
            const accel = maxSpeed / 5;
            const breaking = -maxSpeed;
            const decel = -maxSpeed / 5;
            const offRoadDecel = -maxSpeed / 2;
            const offRoadLimit = maxSpeed / 4;

            // 1. INPUT (Pose or Touch)
            let turn = 0;
            let throttle = false;

            if (input.pose) {
                // Detecção de volante virtual (Mãos relativas ao nariz)
                const lw = input.pose.find(k => k.name === 'left_wrist');
                const rw = input.pose.find(k => k.name === 'right_wrist');
                
                if (lw && rw && lw.score > 0.3 && rw.score > 0.3) {
                    const dx = rw.x - lw.x;
                    const dy = rw.y - lw.y;
                    const angle = Math.atan2(dy, dx); // Inclinação das mãos
                    turn = angle * 2.0; // Sensibilidade
                    throttle = true; // Auto-accel se mãos detectadas
                }
            } else {
                // Fallback Teclado (Debug)
                // Implementar se necessário
            }

            // 2. PHYSICS
            S.pos += S.speed * dt;
            while (S.pos >= this.trackLength) S.pos -= this.trackLength;
            while (S.pos < 0) S.pos += this.trackLength;

            // Aceleração / Atrito
            if (throttle) S.speed += accel * dt;
            else S.speed += decel * dt;

            // Offroad physics
            if ((S.playerX < -1 || S.playerX > 1) && S.speed > offRoadLimit) {
                S.speed += offRoadDecel * dt;
                // Shake effect
                window.Gfx?.shakeScreen(2);
            }

            S.speed = window.System.Math.clamp(S.speed, 0, maxSpeed);

            // Curva (Centrífuga)
            const playerSegment = this.findSegment(S.pos);
            const speedPercent = S.speed / maxSpeed;
            const dx = dt * 2 * speedPercent;
            
            S.playerX = S.playerX - (dx * speedPercent * playerSegment.curve * 3); // Força centrífuga
            S.playerX = S.playerX + (dx * turn * 3.5); // Input do jogador

            S.playerX = window.System.Math.clamp(S.playerX, -2.5, 2.5);
            S.steer = window.System.Math.lerp(S.steer, turn, 10 * dt); // Suavização visual

            // Partículas (Escape)
            if (throttle && Math.random() > 0.8) {
                this.particles.push({x: 0 + (Math.random()-0.5)*0.5, y: 0, life: 1, speed: S.speed});
            }

            // UI Updates
            document.getElementById('kart-speed').innerText = Math.floor(S.speed / 100);
            document.getElementById('kart-nitro').style.width = S.nitro + '%';
        },

        // --- RENDER PIPELINE ---
        draw: function(ctx, w, h) {
            // Céu e Chão
            ctx.fillStyle = "#33aaff"; ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = "#2d8f1e"; ctx.fillRect(0, h/2, w, h/2);

            // Renderizar Estrada (Algoritmo de Projeção Pseudo-3D)
            const baseSegment = this.findSegment(this.state.pos);
            const basePercent = (this.state.pos % 200) / 200;
            const playerX = this.state.playerX;
            const playerY = 1500 + this.state.speed * 0.01; // Camera bounce

            let maxy = h;
            let x = 0;
            let dx = -(baseSegment.curve * basePercent);

            for(let n = 0; n < 300; n++) {
                const segment = this.segments[(baseSegment.index + n) % this.segments.length];
                const looped = segment.index < baseSegment.index;
                
                // Projeção 3D
                // (Simplificado para brevidade, mas robusto)
                const segmentZ = (n * 200) - (this.state.pos % 200); // Z relativo
                if (segmentZ < 10) continue; // Clip near plane

                const scale = 1 / segmentZ; // Perspectiva
                const projectedY = (h/2) + (playerY * scale * (h/2));
                
                // Curva acumulada
                x += dx;
                dx += segment.curve;
                const projectedX = (w/2) + (x - playerX * 2000) * scale * (w/2);
                const projectedW = 2000 * scale * (w/2); // Largura da estrada

                if (projectedY >= maxy) continue; // Clip occluded segments

                this.drawSegment(ctx, w, projectedY, maxy, projectedW, projectedX, segment.color);
                maxy = projectedY;
            }

            // Renderizar Jogador (Sprite)
            this.drawPlayer(ctx, w, h);

            // Renderizar Rivais (Interpolados)
            this.drawRivals(ctx, w, h, baseSegment.index);
        },

        drawSegment: function(ctx, w, y1, y2, rw, cx, colorType) {
            const grass = '#2d8f1e';
            const rumble = colorType === 'dark' ? '#c0392b' : '#fff';
            const road = colorType === 'dark' ? '#555' : '#5a5a5a';
            
            const r1 = rw / 10; // Rumble width
            const l1 = rw / 40; // Lane width

            // Grama (já desenhada no background, mas aqui poderia ter detalhe)
            
            // Rumble Strips
            ctx.fillStyle = rumble;
            ctx.beginPath();
            ctx.moveTo(cx - rw - r1, y1); ctx.lineTo(cx - rw - r1, y2);
            ctx.lineTo(cx + rw + r1, y2); ctx.lineTo(cx + rw + r1, y1);
            ctx.fill();

            // Estrada
            ctx.fillStyle = road;
            ctx.beginPath();
            ctx.moveTo(cx - rw, y1); ctx.lineTo(cx - rw, y2);
            ctx.lineTo(cx + rw, y2); ctx.lineTo(cx + rw, y1);
            ctx.fill();

            // Faixa Central
            if (colorType === 'dark') {
                ctx.fillStyle = '#fff';
                ctx.fillRect(cx - l1/2, y1, l1, y2-y1);
            }
        },

        drawPlayer: function(ctx, w, h) {
            const size = w * 0.15;
            const x = w/2 - size/2;
            const y = h - size - 20;
            
            // Simulação de Sprite Kart (Minimalista AAA)
            // Sombra
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.beginPath(); ctx.ellipse(w/2, y + size, size/1.5, size/4, 0, 0, Math.PI*2); ctx.fill();

            // Corpo
            ctx.save();
            ctx.translate(w/2, y + size/2);
            ctx.rotate(this.state.steer * 0.5); // Inclinação visual
            
            // Kart
            ctx.fillStyle = '#e74c3c'; // Mario Red
            ctx.fillRect(-size/2, -size/4, size, size/2);
            
            // Rodas
            ctx.fillStyle = '#111';
            ctx.fillRect(-size/2 - 10, 0, 15, 20); // Esquerda
            ctx.fillRect(size/2 - 5, 0, 15, 20);  // Direita
            
            // Personagem (Cabeça)
            ctx.fillStyle = '#d32f2f'; // Hat
            ctx.beginPath(); ctx.arc(0, -size/2, size/3, 0, Math.PI*2); ctx.fill();
            
            // Turbo Particles
            if (this.state.speed > 10000) {
                ctx.fillStyle = `rgba(0, 255, 255, ${Math.random()})`;
                ctx.fillRect(-10, 10, 20, Math.random() * 20);
            }

            ctx.restore();
        },

        drawRivals: function(ctx, w, h, playerIndex) {
            Object.values(this.players).forEach(p => {
                // Interpolação visual
                if (p.targetX !== undefined) p.x = window.System.Math.lerp(p.x || 0, p.targetX, 0.1);
                if (p.targetZ !== undefined) p.z = window.System.Math.lerp(p.z || 0, p.targetZ, 0.1);

                // Lógica simples de projeção (Mudar para cálculo real baseado no segmento)
                const relZ = p.z - this.state.pos;
                if (relZ > 0 && relZ < 20000) { // Desenhar se estiver na frente
                    const scale = 200 / relZ;
                    const rx = w/2 + (p.x - this.state.playerX) * w * scale;
                    const ry = h/2 + (1500 * scale * (h/2));
                    const size = w * scale * 20;

                    ctx.fillStyle = '#3498db'; // Rival Blue
                    ctx.beginPath(); ctx.arc(rx, ry, size, 0, Math.PI*2); ctx.fill();
                    ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `bold ${size}px Arial`;
                    ctx.fillText('CPU', rx, ry - size);
                }
            });
        },

        findSegment: function(z) {
            return this.segments[Math.floor(z / 200) % this.segments.length];
        },

        cleanup: function() {
            if (this.netInterval) clearInterval(this.netInterval);
            if (this.roomRef) this.roomRef.off();
            document.getElementById('game-overlay-container').innerHTML = '';
        }
    };

    window.System.registerGame('kart_evo', 'KART EVO', '🏎️', Game, { camOpacity: 0.2 });
})();