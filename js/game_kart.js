// =============================================================================
// ULTIMATE KART - ENGINE HÍBRIDA (VISUAL OTTO + PERFORMANCE TS)
// =============================================================================

(function() {
    // Garante carregamento seguro
    const registerWhenReady = () => {
        if (!window.System || !window.System.registerGame) {
            setTimeout(registerWhenReady, 100);
            return;
        }

        const CHARACTERS = [
            { id: 0, name: 'OTTO', color: '#e74c3c' }, 
            { id: 1, name: 'SPEED', color: '#f1c40f' }, 
            { id: 2, name: 'TANK', color: '#3498db' }   
        ];

        const TRACKS = [
            { id: 0, name: 'GP CIRCUITO', theme: 'grass', sky: 0, curv: 1.0 },
            { id: 1, name: 'DESERTO', theme: 'sand', sky: 1, curv: 0.8 },
            { id: 2, name: 'NEVE', theme: 'snow', sky: 2, curv: 1.2 }
        ];

        // CONFIGURAÇÕES DE FÍSICA E VISUAL
        const CONF = { 
            MAX_SPEED: 460,        
            ACCEL: 0.1, 
            FRICTION: 0.97, 
            SEGMENT_LENGTH: 200,   
            RUMBLE_LENGTH: 3,
            DRAW_DISTANCE: 60      
        };

        let segments = [], nitroBtn = null, trackLen = 0;
        
        const Logic = {
            state: 'MODE', roomId: 'sala_01', 
            isOnline: false, isReady: false, 
            charId: 0, trackId: 0,
            
            // Física TS-Game
            speed: 0, pos: 0, x: 0, steer: 0, nitro: 100, turbo: false,
            lap: 1, maxLaps: 3, rank: 1, score: 0,
            
            rivals: [], dbRef: null, lastSync: 0,
            virtualWheel: { x:0, y:0, r:0, op:0 }, // op = opacidade
            visualTilt: 0, bounce: 0, skyColor: 0,

            init: function() {
                this.state = 'MODE'; this.resetPhysics();
                this.setupUI();
                window.System.msg("SELECIONE");
            },

            resetPhysics: function() {
                this.speed=0; this.pos=0; this.x=0; this.lap=1; this.nitro=100;
                this.virtualWheel={x:0,y:0,r:0,op:0};
            },

            cleanup: function() {
                if(this.dbRef) this.dbRef.child('players').off();
                if(nitroBtn) nitroBtn.remove();
                window.System.canvas.onclick = null;
            },

            setupUI: function() {
                const old = document.getElementById('nitro-btn'); if(old) old.remove();
                nitroBtn = document.createElement('div');
                nitroBtn.id = 'nitro-btn'; nitroBtn.innerHTML = "NITRO";
                Object.assign(nitroBtn.style, {
                    position: 'absolute', top: '40%', right: '20px', width: '80px', height: '80px',
                    borderRadius: '50%', background: 'radial-gradient(#ffaa00, #cc5500)', border: '4px solid #fff',
                    color: '#fff', display: 'none', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', zIndex: '100', boxShadow: '0 0 15px orange'
                });
                // Lógica de Turbo (Clique)
                const hit = (e) => { 
                    e.preventDefault(); e.stopPropagation(); 
                    if(this.state==='RACE' && this.nitro>10) { 
                        this.turbo=!this.turbo; 
                        nitroBtn.style.transform=this.turbo?'scale(0.9)':'scale(1)'; 
                    }
                };
                nitroBtn.addEventListener('touchstart', hit); nitroBtn.addEventListener('mousedown', hit);
                document.getElementById('game-ui').appendChild(nitroBtn);

                // Controle de Clique na Tela (Menu)
                window.System.canvas.onclick = (e) => {
                    const h = window.System.canvas.height; const y = e.clientY;
                    if(this.state === 'MODE') {
                        if(y < h/2) this.setMode(false); else this.setMode(true);
                    } else if(this.state === 'LOBBY') {
                        if(y > h*0.7) this.toggleReady();
                        else if(y < h*0.3) this.charId = (this.charId+1)%CHARACTERS.length;
                        else this.trackId = (this.trackId+1)%TRACKS.length;
                    }
                };
            },

            setMode: function(online) {
                this.isOnline = online;
                if(online && window.DB) {
                    // LÓGICA DE REDE EFICIENTE (TS-GAME)
                    this.dbRef = window.DB.ref('rooms/' + this.roomId);
                    const pRef = this.dbRef.child('players/' + window.System.playerId);
                    pRef.set({ name: 'P1', charId: 0, ready: false, lastSeen: firebase.database.ServerValue.TIMESTAMP });
                    pRef.onDisconnect().remove();

                    this.dbRef.child('players').on('value', sn => {
                        const val = sn.val(); if(!val) return;
                        const now = Date.now();
                        // Filtra jogadores inativos (>15s) e o próprio player
                        this.rivals = Object.keys(val)
                            .filter(k => k !== window.System.playerId && (now - val[k].lastSeen < 15000))
                            .map(k => ({ id: k, ...val[k], isRemote: true, speed: 0, x: 0 }));
                        this.checkStart(this.rivals.length + 1);
                    });
                    this.state = 'LOBBY'; window.System.msg("CONECTANDO...");
                } else {
                    this.rivals = [{pos:500, lap:1, x:-0.4, speed:0, charId:1, name:'CPU', aggro:0.04}, {pos:300, lap:1, x:0.4, speed:0, charId:2, name:'CPU2', aggro:0.035}];
                    this.state = 'LOBBY'; window.System.msg("OFFLINE");
                }
            },

            checkStart: function(total) {
                if(this.state !== 'WAITING') return;
                let ready = (this.isReady ? 1 : 0) + this.rivals.filter(r=>r.ready).length;
                if(total > 1 && ready === total) this.startRace();
            },

            toggleReady: function() {
                this.isReady = !this.isReady;
                if(this.isReady && !this.isOnline) this.startRace();
                else if(this.isReady) { this.state='WAITING'; window.System.msg("AGUARDANDO..."); }
                else this.state='LOBBY';
                this.sync();
            },

            sync: function() {
                if(!this.isOnline || !this.dbRef) return;
                this.dbRef.child('players/' + window.System.playerId).update({
                    charId: this.charId, trackId: this.trackId, ready: this.isReady,
                    pos: Math.floor(this.pos), x: this.x, lap: this.lap,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP
                });
            },

            startRace: function() {
                this.state = 'RACE';
                this.buildTrack();
                nitroBtn.style.display = 'flex';
                window.System.msg("VAI!!!");
            },

            getSegment: function(index) {
                return segments[((Math.floor(index) % segments.length) + segments.length) % segments.length] || {curve:0, y:0};
            },

            buildTrack: function() {
                segments = [];
                const trk = TRACKS[this.trackId];
                this.skyColor = trk.sky;
                const mult = trk.curv;
                
                const add = (enter, curve, y) => {
                    for(let i = 0; i < enter; i++) {
                        const isDark = Math.floor(segments.length / CONF.RUMBLE_LENGTH) % 2;
                        segments.push({ curve: curve * mult, y: y, color: isDark ? 'dark' : 'light', theme: trk.theme });
                    }
                };
                
                add(50, 0, 0); 
                add(40, 1.5, 20); 
                add(40, -1.5, -20); 
                add(50, 0, 0);
                add(30, 2.5, 0); 
                add(30, -2.5, 0);
                add(100, 0, 0);

                trackLen = segments.length * CONF.SEGMENT_LENGTH;
            },

            update: function(ctx, w, h, pose) {
                // UI DE MENU (Visão OttoWii)
                if(this.state === 'MODE') return this.drawBg(ctx, w, h, "ESCOLHA MODO", "OFFLINE (CIMA)", "ONLINE (BAIXO)");
                if(this.state === 'LOBBY' || this.state === 'WAITING') {
                    this.drawBg(ctx, w, h, this.state==='WAITING'?"AGUARDANDO...":"LOBBY", `CHAR: ${CHARACTERS[this.charId].name}`, this.isReady?"CANCELAR":"PRONTO!");
                    const t = TRACKS[this.trackId];
                    ctx.font="20px Arial"; ctx.fillText(`PISTA: ${t.name}`, w/2, h*0.5);
                    ctx.fillText(`Jogadores: ${this.rivals.length+1}`, 20, h-20);
                    return;
                }

                // --- INPUT (LÓGICA TS-GAME PURA) ---
                // Isso garante que o volante e a direção funcionem rápido
                let pL = null, pR = null;
                if(pose && pose.keypoints) {
                    const lw = pose.keypoints.find(k=>k.name==='left_wrist');
                    const rw = pose.keypoints.find(k=>k.name==='right_wrist');
                    // Usa Gfx.map corrigido do core.js
                    if(lw && lw.score > 0.3) pL = window.Gfx.map(lw, w, h);
                    if(rw && rw.score > 0.3) pR = window.Gfx.map(rw, w, h);
                }

                if(pL && pR) {
                    // Detectou duas mãos = Volante
                    this.virtualWheel = { x:(pL.x+pR.x)/2, y:(pL.y+pR.y)/2, r:50, op:1 };
                    this.steer = (Math.atan2(pR.y-pL.y, pR.x-pL.x)) * 2.3;
                    if(this.speed < CONF.MAX_SPEED) this.speed += (CONF.MAX_SPEED - this.speed) * CONF.ACCEL;
                } else {
                    // Sem mãos = Desacelera
                    this.virtualWheel.op = 0.3; this.virtualWheel.x=w/2; this.virtualWheel.y=h*0.8;
                    this.speed *= CONF.FRICTION;
                    if(this.turbo) this.speed += (CONF.MAX_SPEED - this.speed) * CONF.ACCEL;
                }

                // Lógica do Turbo
                if(this.turbo && this.nitro > 0) { this.speed *= 1.05; this.nitro -= 0.5; }
                else { this.nitro = Math.min(100, this.nitro+0.2); this.turbo=false; }

                // Física de Pista
                const segIdx = Math.floor(this.pos / CONF.SEGMENT_LENGTH);
                const seg = this.getSegment(segIdx);
                const pct = this.speed / CONF.MAX_SPEED;
                
                this.x += (this.steer * 0.15 * pct) - (seg.curve * pct * 0.25);
                if(Math.abs(this.x) > 2.2) { this.speed *= 0.9; this.x = Math.max(-2.5, Math.min(2.5, this.x)); window.Gfx.shakeScreen(2); }

                this.pos += this.speed;
                if(this.pos >= trackLen) { this.pos -= trackLen; this.lap++; }
                if(this.lap > this.maxLaps) { this.state='END'; window.System.gameOver(this.rank); }

                // Sync Rede (Limitado a 10Hz para não travar)
                if(this.isOnline && Date.now()-this.lastSync>100) { this.lastSync=Date.now(); this.sync(); }
                
                // Cálculo de Rank e Interpolação de Rivais
                let myDist = (this.lap * trackLen) + this.pos;
                let rank = 1;
                this.rivals.forEach(r => {
                    if(!r.isRemote) { // IA Local (Física simples)
                        let tS = CONF.MAX_SPEED * 0.9;
                        r.speed += (tS - r.speed)*0.05; r.pos += r.speed;
                        if(r.pos >= trackLen) { r.pos -= trackLen; r.lap++; }
                        const rSeg = this.getSegment(Math.floor(r.pos/CONF.SEGMENT_LENGTH));
                        r.x += (-(rSeg.curve * 0.6) - r.x) * 0.05;
                    }
                    let rDist = (r.lap * trackLen) + r.pos;
                    if(rDist > myDist) rank++;
                });
                this.rank = rank;

                this.visualTilt += (this.steer * 15 - this.visualTilt) * 0.1;
                this.renderWorld(ctx, w, h);

                return Math.floor(this.speed); // Retorna score para UI do Core
            },

            // --- RENDERIZADOR RICO (VISUAL ORIGINAL OTTOWII) ---
            renderWorld: function(ctx, w, h) {
                const cx = w / 2;
                const horizon = h * 0.40;
                const segIdx = Math.floor(this.pos / CONF.SEGMENT_LENGTH);
                const baseSeg = this.getSegment(segIdx);

                // Céu Degradê
                const skyGrads = [['#3388ff', '#88ccff'], ['#e67e22', '#f1c40f'], ['#0984e3', '#74b9ff']];
                const sky = skyGrads[this.skyColor] || skyGrads[0];
                const g = ctx.createLinearGradient(0, 0, 0, horizon);
                g.addColorStop(0, sky[0]); g.addColorStop(1, sky[1]);
                ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon);

                // Chão
                const themes = { 'grass': '#448833', 'sand': '#e67e22', 'snow': '#dfe6e9' };
                ctx.fillStyle = themes[baseSeg.theme] || '#448833'; 
                ctx.fillRect(0, horizon, w, h-horizon);

                let dx = 0; let dy = 0;
                let camX = this.x * (w * 0.4);
                let maxDraw = CONF.DRAW_DISTANCE;
                let segmentCoords = [];

                for(let n = 0; n < maxDraw; n++) {
                    const idx = (segIdx + n) % segments.length;
                    const seg = this.getSegment(segIdx + n);
                    
                    dx += seg.curve;
                    dy += (seg.y - baseSeg.y);

                    let z1 = n * CONF.SEGMENT_LENGTH;
                    let z2 = (n+1) * CONF.SEGMENT_LENGTH;
                    let scale1 = 250 / (250 + z1);
                    let scale2 = 250 / (250 + z2);

                    let x1 = cx - (camX * scale1) - (dx * z1/1000 * w * scale1);
                    let x2 = cx - (camX * scale2) - ((dx + seg.curve) * z2/1000 * w * scale2);
                    
                    let y1 = horizon + ((1500 - dy) * scale1 * 0.1);
                    let y2 = horizon + ((1500 - (dy + (seg.y-segments[(idx-1+segments.length)%segments.length].y))) * scale2 * 0.1);

                    let w1 = w * 2.5 * scale1;
                    let w2 = w * 2.5 * scale2;

                    segmentCoords.push({ index: idx, x: x1, y: y1, scale: scale1 });

                    const colorSet = {
                        'grass': { light: '#55aa44', dark: '#448833' },
                        'sand': { light: '#f1c40f', dark: '#e67e22' },
                        'snow': { light: '#ffffff', dark: '#b2bec3' }
                    }[seg.theme];
                    
                    let roadCol = seg.color === 'dark' ? '#666' : '#636363';
                    let grassCol = seg.color === 'dark' ? colorSet.dark : colorSet.light;
                    let rumbleCol = seg.color === 'dark' ? '#c0392b' : '#fff';

                    ctx.fillStyle = grassCol; ctx.fillRect(0, Math.floor(y2), w, Math.ceil(y1-y2+1));
                    ctx.fillStyle = roadCol; ctx.beginPath(); ctx.moveTo(x1-w1, y1); ctx.lineTo(x1+w1, y1); ctx.lineTo(x2+w2, y2); ctx.lineTo(x2-w2, y2); ctx.fill();
                    ctx.fillStyle = rumbleCol; ctx.fillRect(x1-w1*1.1, y1, w1*0.1, Math.ceil(y2-y1+1)); ctx.fillRect(x1+w1, y1, w1*0.1, Math.ceil(y2-y1+1));
                }

                // Renderiza Rivais (Loop Inverso para Z-Order correto)
                for(let n = maxDraw-1; n > 0; n--) {
                    const coord = segmentCoords[n];
                    if(!coord) continue;

                    this.rivals.forEach(r => {
                        let rDist = r.pos - this.pos;
                        if(rDist < -trackLen/2) rDist += trackLen;
                        if(rDist > trackLen/2) rDist -= trackLen;
                        
                        let rSegIdx = Math.floor(rDist / CONF.SEGMENT_LENGTH);
                        if(rSegIdx === n) {
                            let rx = coord.x + (r.x * w * 2.5 * coord.scale);
                            let rScale = coord.scale * w * 0.0055;
                            let rCurve = segments[coord.index].curve * 20; 
                            this.drawKartSprite(ctx, rx, coord.y, rScale, r.x * 0.5, rCurve, 0, CHARACTERS[r.charId||0].color, true);
                        }
                    });
                }

                const pCol = CHARACTERS[this.charId].color;
                this.drawKartSprite(ctx, cx, h*0.85 + this.bounce, w * 0.0055, this.steer, this.visualTilt, this.nitro, pCol, false);

                this.renderHUD(ctx, w, h);
            },

            drawKartSprite: function(ctx, x, y, scale, steer, tilt, nitro, color, isRival) {
                ctx.save();
                ctx.translate(x, y); ctx.scale(scale, scale); ctx.rotate(tilt * 0.02);

                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.beginPath(); ctx.ellipse(0, 35, 60, 15, 0, 0, Math.PI*2); ctx.fill();

                const grad = ctx.createLinearGradient(-30, 0, 30, 0);
                grad.addColorStop(0, color); grad.addColorStop(0.5, '#fff'); grad.addColorStop(1, color);
                ctx.fillStyle = grad;
                ctx.beginPath(); ctx.moveTo(-25,-30); ctx.lineTo(25,-30); ctx.lineTo(40,10); ctx.lineTo(10,35); ctx.lineTo(-10,35); ctx.lineTo(-40,10); ctx.fill();

                if (nitro > 0 || isRival) { 
                    ctx.fillStyle = (nitro > 80 || isRival) ? '#00ffff' : '#ffaa00'; 
                    if(!isRival || Math.random()>0.5) { 
                        ctx.beginPath(); ctx.arc(-20,-30, 10+Math.random()*10, 0, Math.PI*2); ctx.arc(20,-30, 10+Math.random()*10, 0, Math.PI*2); ctx.fill();
                    }
                }

                const wheel = (wx, wy) => {
                    ctx.save(); ctx.translate(wx, wy); ctx.rotate(steer * 0.8);
                    ctx.fillStyle = '#111'; ctx.fillRect(-12, -15, 24, 30);
                    ctx.fillStyle = '#666'; ctx.fillRect(-5, -5, 10, 10);
                    ctx.restore();
                };
                wheel(-45, 15); wheel(45, 15); 
                ctx.fillStyle='#111'; ctx.fillRect(-50,-25,20,30); ctx.fillRect(30,-25,20,30); 

                ctx.translate(0, -10); ctx.rotate(steer * 0.2);
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, -20, 18, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = '#333'; ctx.fillRect(-15, -25, 30, 8);
                
                if(isRival) { ctx.fillStyle = "#000"; ctx.font="bold 12px Arial"; ctx.textAlign="center"; ctx.fillText("P2", 0, -35); }
                ctx.restore();
            },

            renderHUD: function(ctx, w, h) {
                // Desenha Volante (Importante!)
                if(this.virtualWheel.op > 0) {
                    const v = this.virtualWheel;
                    ctx.save(); ctx.translate(v.x, v.y); ctx.globalAlpha = v.op; ctx.rotate(this.steer);
                    ctx.lineWidth = 10; ctx.strokeStyle = "#333"; ctx.beginPath(); ctx.arc(0,0,50,0,Math.PI*2); ctx.stroke();
                    ctx.lineWidth = 4; ctx.strokeStyle = "#00ffff"; ctx.beginPath(); ctx.arc(0,0,42,0,Math.PI*2); ctx.stroke();
                    ctx.fillStyle = CHARACTERS[this.charId].color; ctx.beginPath(); ctx.arc(0,0,15,0,Math.PI*2); ctx.fill();
                    ctx.fillStyle = "red"; ctx.fillRect(-5,-50,10,20);
                    ctx.restore();
                }

                ctx.fillStyle = "white"; ctx.strokeStyle="black"; ctx.lineWidth=4;
                ctx.font = "bold 40px 'Russo One'";
                ctx.strokeText(`${this.rank}º / ${this.rivals.length+1}`, 20, 50); ctx.fillText(`${this.rank}º / ${this.rivals.length+1}`, 20, 50);
                ctx.font = "20px monospace"; ctx.fillText(`Volta ${this.lap}/${this.maxLaps}`, 20, 80);
                
                ctx.fillStyle="#333"; ctx.fillRect(w/2-100, 20, 200, 20);
                ctx.fillStyle=this.turbo?"cyan":"orange"; ctx.fillRect(w/2-98, 22, 196*(this.nitro/100), 16);
            },

            drawBg: function(ctx, w, h, t1, t2, t3) {
                ctx.fillStyle = "#2c3e50"; ctx.fillRect(0,0,w,h);
                ctx.fillStyle = "white"; ctx.textAlign = "center";
                ctx.font = "bold 40px 'Russo One'"; ctx.fillText(t1, w/2, h*0.2);
                if(t2) { ctx.fillStyle = "#e67e22"; ctx.fillRect(w/2-150, h*0.4-30, 300, 60); ctx.fillStyle="white"; ctx.font="25px Arial"; ctx.fillText(t2, w/2, h*0.4+10); }
                if(t3) { ctx.fillStyle = "#27ae60"; ctx.fillRect(w/2-150, h*0.6-30, 300, 60); ctx.fillStyle="white"; ctx.font="25px Arial"; ctx.fillText(t3, w/2, h*0.6+10); }
            }
        };

        window.System.registerGame('kart', 'Ultimate Kart', '🏎️', Logic, { camOpacity: 0.2 });
    };

    registerWhenReady();
})();
