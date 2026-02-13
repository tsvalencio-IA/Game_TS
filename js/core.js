/* =================================================================
   THIAGUINHO OS ENGINE KERNEL V3.2 (LOOP FIX)
   Correção Crítica: Timestamp NaN Fix & Resource Loader
   ================================================================= */

window.System = (function() {
    // 1. Configurações
    const CONFIG = {
        FPS: 60,
        ASPECT_RATIO: 16/9,
        DEBUG: false,
        CAM_WIDTH: 640,
        CAM_HEIGHT: 480
    };

    // 2. Variáveis de Estado
    let canvas, ctx;
    let games = [];
    let activeGame = null;
    let loopId = null;
    let lastTime = 0;

    // 3. Audio System (WebAudio)
    const AudioSys = {
        ctx: null, masterGain: null,
        init: () => {
            if (AudioSys.ctx) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            AudioSys.ctx = new AudioContext();
            AudioSys.masterGain = AudioSys.ctx.createGain();
            AudioSys.masterGain.gain.value = 0.3;
            AudioSys.masterGain.connect(AudioSys.ctx.destination);
        },
        playTone: (freq, type, duration, vol = 0.5) => {
            if (!AudioSys.ctx) return;
            try {
                const osc = AudioSys.ctx.createOscillator();
                const gain = AudioSys.ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, AudioSys.ctx.currentTime);
                gain.gain.setValueAtTime(vol, AudioSys.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, AudioSys.ctx.currentTime + duration);
                osc.connect(gain);
                gain.connect(AudioSys.masterGain);
                osc.start();
                osc.stop(AudioSys.ctx.currentTime + duration);
            } catch(e){}
        },
        sfx: {
            hover: () => AudioSys.playTone(400, 'sine', 0.05, 0.05),
            select: () => AudioSys.playTone(800, 'square', 0.1, 0.1),
            back: () => AudioSys.playTone(200, 'triangle', 0.15, 0.1),
            error: () => AudioSys.playTone(150, 'sawtooth', 0.3, 0.2),
            success: () => { AudioSys.playTone(600, 'sine', 0.1, 0.2); setTimeout(() => AudioSys.playTone(900, 'sine', 0.2, 0.2), 100); }
        }
    };

    // 4. Input System (Camera)
    const InputSys = {
        video: null, detector: null, pose: null, isReady: false,
        init: async () => {
            try {
                InputSys.video = document.getElementById('webcam');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: CONFIG.CAM_WIDTH, height: CONFIG.CAM_HEIGHT, facingMode: 'user' }, audio: false
                });
                InputSys.video.srcObject = stream;
                await new Promise(r => InputSys.video.onloadedmetadata = r);
                if (window.poseDetection) {
                    InputSys.detector = await poseDetection.createDetector(
                        poseDetection.SupportedModels.MoveNet,
                        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
                    );
                    InputSys.isReady = true;
                    InputSys.detectLoop();
                }
            } catch (e) { console.log("Cam offline (Mouse mode)"); }
        },
        detectLoop: async () => {
            if (!InputSys.isReady) return;
            try {
                const poses = await InputSys.detector.estimatePoses(InputSys.video, { flipHorizontal: false });
                if (poses.length > 0) InputSys.pose = poses[0];
            } catch(e) {}
            setTimeout(InputSys.detectLoop, 33); // ~30 FPS tracking
        },
        getNormalizedPose: () => {
            if (!InputSys.pose) return null;
            const p = InputSys.pose.keypoints;
            const norm = (val, max) => val / max;
            return p.map(k => ({ name: k.name, x: norm(k.x, CONFIG.CAM_WIDTH), y: norm(k.y, CONFIG.CAM_HEIGHT), score: k.score }));
        }
    };

    // 5. Network System
    const NetSys = {
        id: 'Player_' + Math.floor(Math.random()*9999),
        init: () => {
            const elId = document.getElementById('console-id');
            if(elId) elId.innerText = NetSys.id;
            const statusEl = document.getElementById('net-status');
            
            if (window.FIREBASE_READY && window.DB) {
                window.DB.ref(".info/connected").on("value", (snap) => {
                    const online = snap.val() === true;
                    if(statusEl) {
                        statusEl.innerHTML = online ? "● ONLINE" : "● OFFLINE";
                        statusEl.style.color = online ? "#00ff88" : "#ff3333";
                    }
                    if(online) {
                        window.DB.ref(`online/${NetSys.id}`).onDisconnect().remove();
                        window.DB.ref(`online/${NetSys.id}`).set({ state: 'IDLE', lastSeen: Date.now() });
                    }
                });
            }
        }
    };

    // 6. Engine Core Functions
    const stopGame = () => {
        if (loopId) cancelAnimationFrame(loopId);
        loopId = null;
        if (activeGame && activeGame.logic.cleanup) activeGame.logic.cleanup();
        activeGame = null;
        if (ctx) ctx.clearRect(0,0, canvas.width, canvas.height);
    };

    const loop = (timestamp) => {
        if (!activeGame) return;
        
        // Correção de NaN: Se timestamp for undefined ou inválido, usa lastTime + 16ms
        if (!timestamp) timestamp = lastTime + 16.6;
        
        const rawDt = (timestamp - lastTime) / 1000;
        const dt = Math.min(Math.max(rawDt, 0.001), 0.1); // Clamp entre 1ms e 100ms
        lastTime = timestamp;

        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (activeGame.logic.update) {
            const inputData = { pose: InputSys.getNormalizedPose(), rawPose: InputSys.pose };
            activeGame.logic.update(dt, inputData);
            if(activeGame.logic.draw) activeGame.logic.draw(ctx, canvas.width, canvas.height);
        }
        loopId = requestAnimationFrame(loop);
    };

    const loadGame = (id) => {
        const game = games.find(g => g.id === id);
        if (!game) return;

        AudioSys.sfx.select();
        document.getElementById('menu-screen').classList.add('hidden');
        document.getElementById('game-ui').classList.remove('hidden');
        
        const cam = document.getElementById('webcam');
        if(cam) cam.style.opacity = game.opts.camOpacity !== undefined ? game.opts.camOpacity : 0.2;

        activeGame = game;
        if (activeGame.logic.init) {
            activeGame.logic.init({
                ctx: ctx,
                width: canvas.width,
                height: canvas.height,
                playerId: NetSys.id,
                audio: AudioSys,
                net: window.DB
            });
        }

        // CORREÇÃO: Não chamar loop() diretamente, usar requestAnimationFrame
        lastTime = performance.now();
        loopId = requestAnimationFrame(loop);
    };

    const menu = () => {
        stopGame();
        document.getElementById('menu-screen').classList.remove('hidden');
        document.getElementById('game-ui').classList.add('hidden');
        const cam = document.getElementById('webcam');
        if(cam) cam.style.opacity = 0;
        AudioSys.sfx.back();
    };

    const registerGame = (id, title, icon, logicClass, options) => {
        if (games.find(g => g.id === id)) return;
        games.push({ id, title, icon, logic: logicClass, opts: options || {} });
        
        const grid = document.getElementById('channel-grid');
        if (grid) {
            const card = document.createElement('div');
            card.className = 'channel-card';
            card.innerHTML = `<div class="channel-icon">${icon}</div><div class="channel-title">${title}</div>`;
            card.onclick = () => loadGame(id);
            card.onmouseenter = () => AudioSys.sfx.hover();
            grid.appendChild(card);
        }
    };

    const init = async () => {
        canvas = document.getElementById('game-canvas');
        if(!canvas) return;
        
        ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        NetSys.init();
        await InputSys.init();
        
        const loader = document.getElementById('loader');
        if(loader) {
            loader.style.opacity = 0;
            setTimeout(() => loader.style.display = 'none', 500);
        }

        // Unlock Audio Context
        document.body.addEventListener('click', () => {
            AudioSys.init();
            if(InputSys.video) InputSys.video.play().catch(()=>{});
        }, { once: true });
    };

    return {
        init, registerGame, loadGame, home: menu, stopGame,
        playerId: NetSys.id,
        Math: {
            lerp: (a, b, t) => a + (b - a) * t,
            clamp: (num, min, max) => Math.min(Math.max(num, min), max),
            dist: (x1, y1, x2, y2) => Math.hypot(x2-x1, y2-y1)
        }
    };
})();

window.addEventListener('load', window.System.init);
