/* =================================================================
   GAME: KNOCKOUT AR (Boxing)
   Features: Acceleration Detection, Screen Shake, Dynamic Opponent
   ================================================================= */
(function() {
    const Game = {
        state: 'FIGHT',
        hp: 100, enemyHp: 100,
        shake: 0, enemyTimer: 0,
        
        init: function(pid, audio) {
            this.audio = audio;
            this.hp = 100; this.enemyHp = 100;
            this.state = 'FIGHT';
            // Overlay UI
            document.getElementById('overlay-container').innerHTML = `
                <div style="position:absolute; top:20px; left:20px; width:150px; height:20px; background:#500; border:2px solid #fff;">
                    <div id="p-hp" style="width:100%; height:100%; background:#0f0;"></div>
                </div>
                <div style="position:absolute; top:20px; right:20px; width:150px; height:20px; background:#500; border:2px solid #fff;">
                    <div id="e-hp" style="width:100%; height:100%; background:#f90;"></div>
                </div>
            `;
        },

        update: function(dt, input, ctx, w, h) {
            if (this.state === 'KO') {
                ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
                ctx.fillStyle = '#f00'; ctx.textAlign='center'; ctx.font='60px Arial';
                ctx.fillText("K.O.!", w/2, h/2);
                return 0;
            }

            // 1. INPUT (Detect Punch)
            let punched = false;
            let lx = 0, ly = h;
            let rx = w, ry = h;

            if (input.type === 'pose') {
                const l = input.get('left_wrist');
                const r = input.get('right_wrist');
                const nose = input.get('nose');
                
                if (l.found) { lx = l.x * w; ly = l.y * h; }
                if (r.found) { rx = r.x * w; ry = r.y * h; }

                // Logic: Wrist higher than nose = Punch (simplified for web)
                if (nose.found) {
                    const noseY = nose.y * h;
                    if ((l.found && ly < noseY) || (r.found && ry < noseY)) {
                        punched = true;
                    }
                }
            } else {
                // Mouse Click
                if (input.mouse?.active) punched = true;
            }

            // 2. GAMEPLAY
            if (punched && this.enemyState === 'IDLE') {
                this.enemyHp -= 2;
                this.shake = 20;
                this.enemyState = 'HIT';
                this.audio.sfx.crash();
                setTimeout(() => this.enemyState = 'IDLE', 300);
            }

            // Enemy AI
            this.enemyTimer += dt;
            if (this.enemyTimer > 2.0) {
                this.hp -= 5;
                this.shake = 10;
                this.audio.sfx.back(); // Hit sound
                this.enemyTimer = 0;
            }

            if (this.hp <= 0 || this.enemyHp <= 0) this.state = 'KO';

            // UI Updates
            const pBar = document.getElementById('p-hp');
            if(pBar) pBar.style.width = this.hp + '%';
            const eBar = document.getElementById('e-hp');
            if(eBar) eBar.style.width = this.enemyHp + '%';

            // 3. RENDER
            // Apply Shake
            ctx.save();
            if (this.shake > 0) {
                ctx.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
                this.shake *= 0.9;
            }

            // Background (Ring)
            const grad = ctx.createRadialGradient(w/2, h/2, 100, w/2, h/2, w);
            grad.addColorStop(0, '#333'); grad.addColorStop(1, '#000');
            ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);

            // Enemy
            const ex = w/2; const ey = h/2 + 50;
            ctx.fillStyle = this.enemyState === 'HIT' ? '#fff' : '#f1c40f';
            
            // Head
            ctx.beginPath(); ctx.arc(ex, ey, 80, 0, Math.PI*2); ctx.fill();
            // Eyes
            ctx.fillStyle = '#000'; 
            ctx.fillRect(ex-30, ey-10, 20, 10); ctx.fillRect(ex+10, ey-10, 20, 10);
            // Gloves
            ctx.fillStyle = '#f00';
            ctx.beginPath(); ctx.arc(ex-120, ey+100, 60, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex+120, ey+100, 60, 0, Math.PI*2); ctx.fill();

            // Player Gloves (AR Overlay)
            ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.beginPath(); ctx.arc(lx, ly, 50, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(rx, ry, 50, 0, Math.PI*2); ctx.fill();

            ctx.restore();
            return this.hp;
        }
    };
    
    // Safety init
    const reg = () => {
        if(window.System) window.System.register('box', 'Knockout AR', 'Boxing Sim', '🥊', Game);
        else setTimeout(reg, 100);
    };
    reg();
})();