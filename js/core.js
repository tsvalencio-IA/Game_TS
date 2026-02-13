/* =================================================================
   THIAGUINHO OS ENGINE KERNEL V3.0 (AAA ARCHITECTURE)
   Features: State Machine, Input Smoothing, Audio Bus, Net Code
   ================================================================= */

window.System = (function() {
    // Configurações Internas
    const CONFIG = {
        FPS: 60,
        ASPECT_RATIO: 16/9,
        DEBUG: false,
        CAM_WIDTH: 640,
        CAM_HEIGHT: 480
    };

    // --- SUB-SISTEMA DE ÁUDIO (WebAudio API) ---
    const AudioSys = {
        ctx: null,
        masterGain: null,
        init: () => {
            if (AudioSys.ctx) return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            AudioSys.ctx = new AudioContext();
            AudioSys.masterGain = AudioSys.ctx.createGain();
            AudioSys.masterGain.gain.value = 0.4; // Volume geral seguro
            AudioSys.masterGain.connect(AudioSys.ctx.destination);
        },
        playTone: (freq, type, duration, vol = 0.5) => {
            if (!AudioSys.ctx) return;
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
        },
        // SFX Presets
        sfx: {
            hover: () => AudioSys.playTone(400, 'sine', 0.1, 0.1),
            select: () => AudioSys.playTone(800, 'square', 0.1, 0.1),
            back: () => AudioSys.playTone(200, 'triangle', 0.15, 0.2),
            error: () => AudioSys.playTone(150, 'sawtooth', 0.3, 0.3),
            success: () => {
                AudioSys.playTone(600, 'sine', 0.1, 0.2);
                setTimeout(() => AudioSys.playTone(900, 'sine', 0.2, 0.2), 100);
            }
        }
    };

    // --- SUB-SISTEMA DE INPUT (Motion Capture) ---
    const InputSys = {
        video: null,
        detector: null,
        pose: null,
        isReady: false,
        
        init: async () => {
            try {
                InputSys.video = document.getElementById('webcam');
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        width: CONFIG.CAM_WIDTH, 
                        height: CONFIG.CAM_HEIGHT,
                        facingMode: 'user',
                        frameRate: { ideal: 30 }
                    },
                    audio: false
                });
                InputSys.video.srcObject = stream;
                await new Promise(r => InputSys.video.onloadedmetadata = r);
                
                if (window.poseDetection) {
                    InputSys.detector = await poseDetection.createDetector(
                        poseDetection.SupportedModels.MoveNet,
                        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
                    );
                    InputSys.isReady = true;
                    // Inicia loop de detecção separado do render loop para performance
                    InputSys.detectLoop();
                }
            } catch (e) {
                console.warn("InputSys Error (No Webcam?):", e);
            }
        },

        detectLoop: async () => {
            if (!InputSys.isReady) return;
            try {
                const poses = await InputSys.detector.estimatePoses(InputSys.video, {
                    flipHorizontal: false // CSS já faz o flip
                });
                if (poses.length > 0) InputSys.pose = poses[0];
            } catch(e) {}
            // Throttle para ~30fps
            setTimeout(InputSys.detectLoop, 33);
        },

        // Normaliza coordenadas (0.0 a 1.0) independente da resolução
        getNormalizedPose: () => {
            if (!InputSys.pose) return null;
            const p = InputSys.pose.keypoints;
            const norm = (val, max) => val / max;
            return p.map(k => ({
                name: k.name,
                x: norm(k.x, CONFIG.CAM_WIDTH),
                y: norm(k.y, CONFIG.CAM_HEIGHT),
                score: k.score
            }));
        }
    };

    // --- SUB-SISTEMA DE REDE (Firebase Wrapper) ---
    const NetSys = {
        id: 'Player_' + Math.random().toString(36).substr(2, 5).toUpperCase(),
        statusEl: null,
        
        init: () => {
            NetSys.statusEl = document.getElementById('net-status');
            document.getElementById('console-id').innerText = NetSys.id;
            
            if (window.FIREBASE_READY) {
                // Monitoramento de conexão
                const connectedRef = window.DB.ref(".info/connected");
                connectedRef.on("value", (snap) => {
                    if (snap.val() === true) {
                        NetSys.setStatus(true);
                        // Remove jogador ao desconectar
                        window.DB.ref(`online/${NetSys.id}`).onDisconnect().remove();
                        window.DB.ref(`online/${NetSys.id}`).set({ state: 'IDLE', lastSeen: Date.now() });
                    } else {
                        NetSys.setStatus(false);
                    }
                });
            }
        },
        
        setStatus: (online) => {
            if(NetSys.statusEl) {
                NetSys.statusEl.innerHTML = online ? "● ONLINE" : "● OFFLINE";
                NetSys.statusEl.style.color = online ? "#00ff88" : "#ff3333";
            }
        }
    };

    // --- GAME LOOP & STATE MACHINE ---
    let canvas, ctx;
    let games = [];
    let activeGame = null;
    let loopId = null;
    let lastTime = 0;

    const resize = () => {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };

    const registerGame = (id, title, icon, logicClass, options) => {
        games.push({ id, title, icon, logic: logicClass, opts: options || {} });
        
        // Renderiza no menu
        const grid = document.getElementById('channel-grid');
        const card = document.createElement('div');
        card.className = 'channel-card';
        card.innerHTML = `
            <div class="channel-icon">${icon}</div>
            <div class="channel-title">${title}</div>
        `;
        card.onclick = () => Engine.loadGame(id);
        card.onmouseenter = () => AudioSys.sfx.hover();
        grid.appendChild(card);
    };

    const Engine = {
        init: async () => {
            canvas = document.getElementById('game-canvas');
            ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
            
            window.addEventListener('resize', resize);
            resize();

            // Inicializa subsistemas
            NetSys.init();
            await InputSys.init();
            
            // Remove Loader
            document.getElementById('loader').style.opacity = 0;
            setTimeout(() => document.getElementById('loader').style.display = 'none', 500);

            // Interação do usuário para desbloquear Áudio
            document.body.addEventListener('click', () => {
                AudioSys.init();
                InputSys.video.play().catch(()=>{});
            }, { once: true });
        },

        menu: () => {
            Engine.stopGame();
            document.getElementById('menu-screen').classList.remove('hidden');
            document.getElementById('game-ui').classList.add('hidden');
            document.getElementById('webcam').style.opacity = 0;
            AudioSys.sfx.back();
        },

        loadGame: (id) => {
            const game = games.find(g => g.id === id);
            if (!game) return;

            // Transição UI
            AudioSys.sfx.select();
            document.getElementById('menu-screen').classList.add('hidden');
            document.getElementById('game-ui').classList.remove('hidden');
            
            // Configuração da Câmera
            const cam = document.getElementById('webcam');
            cam.style.opacity = game.opts.camOpacity !== undefined ? game.opts.camOpacity : 0.2;

            // Inicializa Lógica do Jogo
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

            lastTime = performance.now();
            Engine.loop();
        },

        loop: (timestamp) => {
            if (!activeGame) return;

            const dt = Math.min((timestamp - lastTime) / 1000, 0.1); // Cap delta time
            lastTime = timestamp;

            // Limpa tela
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Update & Draw do Jogo Ativo
            if (activeGame.logic.update) {
                // Passa dados normalizados para facilitar a vida dos devs dos jogos
                const inputData = {
                    pose: InputSys.getNormalizedPose(),
                    rawPose: InputSys.pose // Legacy support
                };
                
                activeGame.logic.update(dt, inputData);
                activeGame.logic.draw(ctx, canvas.width, canvas.height);
            }

            loopId = requestAnimationFrame(Engine.loop);
        },

        stopGame: () => {
            if (loopId) cancelAnimationFrame(loopId);
            if (activeGame && activeGame.logic.cleanup) activeGame.logic.cleanup();
            activeGame = null;
            // Limpa Canvas
            if (ctx) ctx.clearRect(0,0, canvas.width, canvas.height);
        },

        // API Pública
        registerGame,
        home: Engine.menu,
        msg: (txt) => console.log(`[SYS] ${txt}`),
        playerId: NetSys.id,
        
        // Utilitários Matemáticos para Jogos
        Math: {
            lerp: (a, b, t) => a + (b - a) * t,
            clamp: (num, min, max) => Math.min(Math.max(num, min), max),
            dist: (x1, y1, x2, y2) => Math.hypot(x2-x1, y2-y1)
        }
    };

    // Auto-Init
    window.onload = Engine.init;
    return Engine;
})();