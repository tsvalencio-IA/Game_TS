(function() {
    const Game = {
        state: 'FIGHT',
        player: { hp: 100 }, enemy: { hp: 100, state: 'IDLE', timer: 0 },
        shake: 0,
        
        init: function(sys) {
            this.sys = sys;
            this.player.hp = 100; this.enemy.hp = 100; this.state = 'FIGHT';
            const ui = document.getElementById('game-overlay-container');
            if(ui) ui.innerHTML = `
                <div style="position:absolute; top:20px; left:20px; width:40%; height:30px; background:#500; border:2px solid #fff; transform: skewX(20deg);"><div id="p-hp" style="width:100%; height:100%; background:#0f0;"></div></div>
                <div style="position:absolute; top:20px; right:20px; width:40%; height:30px; background:#500; border:2px solid #fff; transform: skewX(-20deg);"><div id="e-hp" style="width:100%; height:100%; background:#fa0; float:right;"></div></div>
                <div id="ko-msg" style="position:absolute; top:40%; width:100%; text-align:center; font-family:'Russo One'; font-size:5rem; color:#f00; display:none;">K.O.!</div>`;
        },

        update: function(dt, input) {
            if(isNaN(dt)) dt = 0.016;
            if (this.state === 'KO') return;

            let punch = false;
            if (input.pose) {
                const lw = input.pose.find(k => k.name === 'left_wrist');
                const rw = input.pose.find(k => k.name === 'right_wrist');
                const nose = input.pose.find(k => k.name === 'nose');
                if ((lw && nose && lw.y < nose.y) || (rw && nose && rw.y < nose.y)) punch = true;
            }

            if (punch && this.enemy.state === 'IDLE') {
                this.enemy.hp -= 5; this.shake = 15; this.enemy.state = 'HIT';
                setTimeout(() => this.enemy.state = 'IDLE', 400);
            }

            this.enemy.timer += dt;
            if (this.enemy.timer > 2.0 && this.enemy.state === 'IDLE') {
                this.enemy.state = 'ATTACK';
                setTimeout(() => { this.player.hp -= 10; this.shake = 30; this.enemy.state = 'IDLE'; this.enemy.timer = 0; }, 500);
            }

            if (this.enemy.hp <= 0 || this.player.hp <= 0) {
                this.state = 'KO';
                const ko = document.getElementById('ko-msg');
                if(ko) ko.style.display = 'block';
            }

            const p = document.getElementById('p-hp'); if(p) p.style.width = this.player.hp + '%';
            const e = document.getElementById('e-hp'); if(e) e.style.width = this.enemy.hp + '%';
            if (this.shake > 0) this.shake *= 0.9;
        },

        draw: function(ctx, w, h) {
            ctx.save();
            if (this.shake > 0.5) ctx.translate((Math.random()-0.5)*this.shake, (Math.random()-0.5)*this.shake);
            const grad = ctx.createRadialGradient(w/2, h/2, 50, w/2, h/2, w);
            grad.addColorStop(0, '#222'); grad.addColorStop(1, '#000');
            ctx.fillStyle = grad; ctx.fillRect(0,0,w,h);
            
            const ex = w/2; const ey = h/2 + 100;
            ctx.fillStyle = this.enemy.state === 'HIT' ? '#fff' : '#f1c40f';
            ctx.beginPath(); ctx.arc(ex, ey, 75, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#e67e22'; ctx.fillRect(ex - 75, ey + 75, 150, 100);
            ctx.fillStyle = this.enemy.state === 'ATTACK' ? '#f00' : '#a00';
            ctx.beginPath(); ctx.arc(ex - 100, ey + 150, 60, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(ex + 100, ey + 150, 60, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        },
        cleanup: function() { const ui = document.getElementById('game-overlay-container'); if(ui) ui.innerHTML = ''; }
    };
    const register = () => { if(window.System?.registerGame) window.System.registerGame('box_ar', 'SUPER BOX', '🥊', Game, { camOpacity: 0.3 }); else setTimeout(register, 100); };
    register();
})();
