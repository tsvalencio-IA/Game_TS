// =================================================================
// CORE SYSTEM (CÉREBRO) - VERSÃO HÍBRIDA (OTIMIZADA)
// =================================================================

// 1. SISTEMA GRÁFICO E AUXILIAR
window.Gfx = {
    shake: 0,
    updateShake: (ctx) => {
        if(window.Gfx.shake > 0) {
            ctx.translate((Math.random()-0.5)*window.Gfx.shake, (Math.random()-0.5)*window.Gfx.shake);
            window.Gfx.shake *= 0.9;
            if(window.Gfx.shake < 0.5) window.Gfx.shake = 0;
        }
    },
    shakeScreen: (i) => { window.Gfx.shake = i; },
    
    // CORREÇÃO CRÍTICA: Usando a matemática do TS-Game para mapear a câmera
    // Isso garante que o volante apareça na posição correta
    map: (pt, w, h) => ({ x: (1 - (pt.x / 640)) * w, y: (pt.y / 480) * h }),
    
    drawSkeleton: (ctx, pose, w, h) => { /* Opcional para debug */ }
};

// 2. SISTEMA DE ÁUDIO
window.Sfx = {
    ctx: null,
    init: () => { 
        window.AudioContext = window.AudioContext || window.webkitAudioContext; 
        if (!window.Sfx.ctx) window.Sfx.ctx = new AudioContext(); 
        if (window.Sfx.ctx.state === 'suspended') window.Sfx.ctx.resume();
    },
    play: (f, t, d, v=0.1) => {
        if(!window.Sfx.ctx) return;
        try {
            const o = window.Sfx.ctx.createOscillator(); const g = window.Sfx.ctx.createGain();
            o.type=t; o.frequency.value=f; 
            g.gain.setValueAtTime(v, window.Sfx.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, window.Sfx.ctx.currentTime+d);
            o.connect(g); g.connect(window.Sfx.ctx.destination); 
            o.start(); o.stop(window.Sfx.ctx.currentTime+d);
        } catch(e){}
    },
    click: () => window.Sfx.play(800, 'square', 0.1),
    crash: () => window.Sfx.play(100, 'sawtooth', 0.4),
    hover: () => window.Sfx.play(400, 'sine', 0.05, 0.05)
};

// 3. SISTEMA PRINCIPAL
window.System = {
    video: null, canvas: null, detector: null, games: [], activeGame: null, loopId: null, playerId: null,
    
    init: async () => {
        console.log("Iniciando System Wii Otimizado...");
        
        // ID Persistente
        let savedId = localStorage.getItem('wii_pid');
        if(!savedId) { savedId = 'P' + Math.floor(Math.random()*9999); localStorage.setItem('wii_pid', savedId); }
        window.System.playerId = savedId;

        window.System.canvas = document.getElementById('game-canvas');
        window.System.resize();
        window.addEventListener('resize', window.System.resize);

        try {
            document.getElementById('loading-text').innerText = "LIGANDO CÂMERA...";
            window.System.video = document.getElementById('webcam');
            // Força resolução 640x480 para bater com a IA
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: { ideal: 30 } } });
            window.System.video.srcObject = stream;
            await new Promise(r => window.System.video.onloadedmetadata = r);
            window.System.video.play();

            if(typeof poseDetection !== 'undefined') {
                 document.getElementById('loading-text').innerText = "CARREGANDO IA...";
                 window.System.detector = await poseDetection.createDetector(
                     poseDetection.SupportedModels.MoveNet, 
                     { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
                 );
            }
        } catch(e) { console.error("Erro Camera/IA:", e); }

        document.getElementById('loading').classList.add('hidden');
        window.System.menu();
        
        // Desbloqueio de Audio
        const unlock = () => { window.Sfx.init(); document.body.removeEventListener('click', unlock); document.body.removeEventListener('touchstart', unlock); };
        document.body.addEventListener('click', unlock);
        document.body.addEventListener('touchstart', unlock);
    },

    registerGame: (id, title, icon, logic, opts) => {
        if(window.System.games.find(g=>g.id===id)) return;
        window.System.games.push({id, title, icon, logic, opts});
        
        // Adiciona ao Menu (Estilo Wii)
        const grid = document.getElementById('channel-grid');
        if(grid) {
            const div = document.createElement('div');
            div.className = 'channel';
            div.innerHTML = `<div class="channel-icon">${icon}</div><div class="channel-title">${title}</div>`;
            div.onclick = () => window.System.loadGame(id);
            div.onmouseenter = () => window.Sfx.hover();
            grid.appendChild(div);
        }
    },

    menu: () => {
        window.System.stopGame();
        document.getElementById('menu-screen').classList.remove('hidden');
        document.getElementById('game-ui').classList.add('hidden');
        document.getElementById('screen-over').classList.add('hidden');
        if(window.System.canvas) {
            const ctx = window.System.canvas.getContext('2d');
            ctx.fillStyle = "#ececec"; ctx.fillRect(0,0,window.System.canvas.width, window.System.canvas.height);
        }
    },

    loadGame: (id) => {
        const g = window.System.games.find(x=>x.id===id);
        if(!g) return;
        window.System.activeGame = g;
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
        if(window.System.video) document.getElementById('webcam').style.opacity = g.opts.camOpacity || 0.3;
        if(g.logic.init) g.logic.init();
        window.System.loop();
    },

    loop: async () => {
        if(!window.System.activeGame) return;
        const ctx = window.System.canvas.getContext('2d');
        const w = window.System.canvas.width;
        const h = window.System.canvas.height;

        let pose = null;
        if(window.System.detector && window.System.video && window.System.video.readyState === 4) {
            try {
                const p = await window.System.detector.estimatePoses(window.System.video, {flipHorizontal: false});
                if(p.length > 0) pose = p[0];
            } catch(e){}
        }

        ctx.save();
        window.Gfx.updateShake(ctx);
        const s = window.System.activeGame.logic.update(ctx, w, h, pose);
        ctx.restore();
        
        // Atualiza Score na UI se necessário
        const scoreEl = document.getElementById('hud-score');
        if(typeof s === 'number' && scoreEl) scoreEl.innerText = Math.floor(s);

        window.System.loopId = requestAnimationFrame(window.System.loop);
    },

    stopGame: () => {
        if(window.System.activeGame && window.System.activeGame.logic.cleanup) window.System.activeGame.logic.cleanup();
        window.System.activeGame = null;
        if(window.System.loopId) cancelAnimationFrame(window.System.loopId);
    },

    home: () => { window.Sfx.click(); window.System.menu(); },
    
    gameOver: (rank) => {
        window.System.stopGame(); window.Sfx.crash();
        // Verifica se é rank ou score
        const txt = (rank < 10) ? rank + "º LUGAR" : rank;
        document.getElementById('final-score').innerText = txt;
        document.getElementById('game-ui').classList.add('hidden');
        document.getElementById('screen-over').classList.remove('hidden');
    },

    resize: () => {
        if(window.System.canvas) {
            window.System.canvas.width = window.innerWidth;
            window.System.canvas.height = window.innerHeight;
        }
    },
    
    msg: (t) => {
        const el = document.getElementById('game-msg');
        if(el) { el.innerText = t; el.style.opacity = 1; setTimeout(()=>el.style.opacity=0, 2000); }
    }
};

window.onload = window.System.init;
