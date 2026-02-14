/* =================================================================
   THIAGUINHO ENGINE KERNEL V4 (AAA ARCHITECTURE)
   Features: Async Init, Event Bus, Asset Synth, Input Fusion
   ================================================================= */

(function() {
    // --- AUDIO SYNTHESIZER (No external files) ---
    const AudioSys = {
        ctx: null, master: null,
        init: () => {
            if (AudioSys.ctx) return;
            const AC = window.AudioContext || window.webkitAudioContext;
            AudioSys.ctx = new AC();
            AudioSys.master = AudioSys.ctx.createGain();
            AudioSys.master.gain.value = 0.3;
            AudioSys.master.connect(AudioSys.ctx.destination);
        },
        play: (type, freq, dur, vol=0.5, slide=0) => {
            if (!AudioSys.ctx) return;
            const t = AudioSys.ctx.currentTime;
            const osc = AudioSys.ctx.createOscillator();
            const gain = AudioSys.ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t);
            if(slide) osc.frequency.linearRampToValueAtTime(freq + slide, t + dur);
            
            gain.gain.setValueAtTime(vol, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
            
            osc.connect(gain); gain.connect(AudioSys.master);
            osc.start(); osc.stop(t + dur);
        },
        // Presets
        sfx: {
            hover: () => AudioSys.play('sine', 400, 0.1, 0.1),
            select: () => AudioSys.play('square', 800, 0.1, 0.1),
            back: () => AudioSys.play('triangle', 200, 0.2, 0.2),
            crash: () => AudioSys.play('sawtooth', 100, 0.4, 0.3, -50),
            coin: () => { AudioSys.play('sine', 1200, 0.1, 0.1); setTimeout(()=>AudioSys.play('sine', 1600, 0.2, 0.1), 100); }
        }
    };

    // --- INPUT FUSION (Webcam + Touch Fallback) ---
    const InputSys = {
        video: null, detector: null, pose: null,
        mouse: { x: 0, y: 0, active: false },
        init: async () => {
            InputSys.video = document.getElementById('webcam');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { width: 640, height: 480, facingMode: 'user' } 
                });
                InputSys.video.srcObject = stream;
                await new Promise(r => InputSys.video.onloadedmetadata = r);
                InputSys.video.play();
                
                if (window.poseDetection) {
                    InputSys.detector = await poseDetection.createDetector(
                        poseDetection.SupportedModels.MoveNet,
                        { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
                    );
                    InputSys.loop();
                }
            } catch (e) {
                console.warn("Camera failed, using Mouse/Touch fallback");
            }

            // Mouse/Touch Listeners
            window.addEventListener('mousemove', e => {
                InputSys.mouse.x = e.clientX;
                InputSys.mouse.y = e.clientY;
                InputSys.mouse.active = true;
            });
            window.addEventListener('touchmove', e => {
                InputSys.mouse.x = e.touches[0].clientX;
                InputSys.mouse.y = e.touches[0].clientY;
                InputSys.mouse.active = true;
            });
        },
        loop: async () => {
            if (InputSys.detector && InputSys.video.readyState === 4) {
                try {
                    const poses = await InputSys.detector.estimatePoses(InputSys.video, {flipHorizontal: false});
                    if (poses.length > 0) InputSys.pose = poses[0];
                    else InputSys.pose = null;
                } catch(e){}
            }
            requestAnimationFrame(InputSys.loop);
        },
        // Retorna dados normalizados (0-1) independente da fonte
        getData: (w, h) => {
            // Prioridade: Pose
            if (InputSys.pose && InputSys.pose.keypoints) {
                const norm = (val, max) => val / max;
                const p = InputSys.pose.keypoints;
                // Helper para mapear keypoint
                const get = (name) => {
                    const k = p.find(kp => kp.name === name);
                    if (k && k.score > 0.3) return { x: 1 - (k.x/640), y: k.y/480, found: true }; // Espelhado horizontalmente
                    return { x: 0.5, y: 0.5, found: false };
                };
                return { type: 'pose', get, raw: InputSys.pose };
            }
            // Fallback: Mouse
            return {
                type: 'mouse',
                get: (name) => ({ x: InputSys.mouse.x / w, y: InputSys.mouse.y / h, found: true }),
                raw: null
            };
        }
    };

    // --- GAME ENGINE ---
    const Engine = {
        canvas: null, ctx: null,
        games: [], activeGame: null,
        loopId: null, lastTime: 0,
        playerId: 'P' + Math.floor(Math.random()*9000+1000),

        init: async () => {
            Engine.canvas = document.getElementById('game-canvas');
            Engine.ctx = Engine.canvas.getContext('2d', {alpha: false});
            
            const resize = () => {
                Engine.canvas.width = window.innerWidth;
                Engine.canvas.height = window.innerHeight;
            };
            window.addEventListener('resize', resize);
            resize();

            // Init Subsystems
            await InputSys.init();
            
            // UI Handling
            document.getElementById('loader').style.opacity = 0;
            setTimeout(() => {
                document.getElementById('loader').classList.add('hidden');
                document.getElementById('menu').classList.remove('fade-out');
            }, 500);

            // Unlock Audio
            document.body.addEventListener('click', () => AudioSys.init(), {once:true});
            
            // Net Status
            if (window.FB_READY) {
                const db = firebase.database();
                db.ref(".info/connected").on("value", snap => {
                    const el = document.getElementById('net-dot');
                    const txt = document.getElementById('net-text');
                    if (snap.val()) {
                        el.style.background = '#0f0'; txt.innerText = "ONLINE";
                        // Register Presence
                        const ref = db.ref(`online/${Engine.playerId}`);
                        ref.onDisconnect().remove();
                        ref.set(Date.now());
                    } else {
                        el.style.background = '#f00'; txt.innerText = "OFFLINE";
                    }
                });
            }
        },

        register: (id, name, desc, icon, logic) => {
            Engine.games.push({id, name, desc, icon, logic});
            const list = document.getElementById('games-list');
            const card = document.createElement('div');
            card.className = 'game-card';
            card.innerHTML = `
                <div class="game-icon">${icon}</div>
                <div class="game-info">
                    <h3>${name}</h3>
                    <p>${desc}</p>
                </div>
            `;
            card.onclick = () => Engine.load(id);
            card.onmouseenter = AudioSys.sfx.hover;
            list.appendChild(card);
        },

        load: (id) => {
            const g = Engine.games.find(x => x.id === id);
            if(!g) return;
            
            AudioSys.sfx.select();
            Engine.activeGame = g;
            
            // Transitions
            document.getElementById('menu').classList.add('fade-out');
            document.getElementById('hud').classList.remove('fade-out');
            document.getElementById('webcam').style.opacity = 0.2; // Show AR hint

            if (g.logic.init) g.logic.init(Engine.playerId, AudioSys);
            Engine.lastTime = performance.now();
            Engine.loop();
        },

        home: () => {
            AudioSys.sfx.back();
            if (Engine.loopId) cancelAnimationFrame(Engine.loopId);
            Engine.activeGame = null;
            
            document.getElementById('hud').classList.add('fade-out');
            document.getElementById('menu').classList.remove('fade-out');
            document.getElementById('webcam').style.opacity = 0;
            document.getElementById('overlay-container').innerHTML = '';
            
            // Clear Canvas
            Engine.ctx.fillStyle = '#000';
            Engine.ctx.fillRect(0,0,Engine.canvas.width, Engine.canvas.height);
        },

        loop: (t) => {
            if (!Engine.activeGame) return;
            const dt = Math.min((t - Engine.lastTime) / 1000, 0.1) || 0.016;
            Engine.lastTime = t;

            const w = Engine.canvas.width;
            const h = Engine.canvas.height;
            const input = InputSys.getData(w, h);

            // Update & Draw
            Engine.ctx.fillStyle = '#000';
            Engine.ctx.fillRect(0,0,w,h);
            
            const score = Engine.activeGame.logic.update(dt, input, Engine.ctx, w, h);
            
            if (score !== undefined) {
                document.getElementById('score-display').innerText = Math.floor(score);
            }

            Engine.loopId = requestAnimationFrame(Engine.loop);
        }
    };

    // Expose System
    window.System = Engine;
    window.onload = Engine.init;
})();