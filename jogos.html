<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>thIAguinho Arcade Engine</title>
    <link href="https://cdn.jsdelivr.net/npm/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">
    <style>
        body { margin: 0; overflow: hidden; background-color: #000; font-family: 'Segoe UI', sans-serif; }
        #hud-container { position: absolute; top: 0; left: 0; width: 100%; padding: 20px; z-index: 10; pointer-events: none; display: flex; justify-content: space-between; }
        .hud-box { background: rgba(0,0,0,0.6); padding: 10px 20px; border-radius: 10px; border-left: 5px solid #ffcc00; color: white; backdrop-filter: blur(5px); }
        .hud-title { font-size: 24px; font-weight: bold; font-style: italic; color: #ffcc00; text-shadow: 2px 2px 0 #000; }
        .hud-score { font-size: 32px; font-weight: bold; }
        #video-container { position: absolute; bottom: 20px; right: 20px; width: 100px; height: 133px; z-index: 10; border: 2px solid #fff; border-radius: 10px; overflow: hidden; background: #000; opacity: 0.8; }
        video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        #loading { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(circle, #222, #000); display: flex; flex-direction: column; justify-content: center; align-items: center; color: #ffcc00; z-index: 100; text-align: center; }
        .spinner { border: 4px solid #333; border-top: 4px solid #ffcc00; border-radius: 50%; width: 60px; height: 60px; animation: spin 1s linear infinite; margin-bottom: 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        #debug-info { color: #888; font-size: 10px; margin-top: 15px; max-width: 80%; }
        .back-btn { position: fixed; top: 20px; right: 20px; z-index: 120; background: #cc0000; color: white; width: 45px; height: 45px; border-radius: 50%; border: none; cursor: pointer; font-size: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        canvas { display: block; width: 100vw; height: 100vh; }
    </style>

    <script src="https://cdn.jsdelivr.net/npm/three@0.146.0/build/three.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/three@0.146.0/examples/js/loaders/GLTFLoader.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/kalidokit@1.1.5/dist/kalidokit.umd.js"></script>
</head>
<body>

    <button onclick="window.location.href='index.html'" class="back-btn"><i class='bx bx-x'></i></button>

    <div id="loading">
        <div class="spinner"></div>
        <h2 id="loading-text">ARCADE thIAguinho</h2>
        <div id="loading-progress">Iniciando sistemas...</div>
        <div id="debug-info">Verificando arquivos na pasta assets...</div>
    </div>

    <div id="hud-container">
        <div class="hud-box">
            <div id="game-title" class="hud-title">MODO</div>
            <div id="instruction-text" style="font-size: 14px; color: #ccc">Prepare-se...</div>
        </div>
        <div class="hud-box">
            <div style="font-size: 12px; text-transform: uppercase;">Pontos</div>
            <div id="score-display" class="hud-score">0</div>
        </div>
    </div>
    
    <div id="video-container">
        <video id="input_video" playsinline></video>
    </div>

    <script>
        const params = new URLSearchParams(window.location.search);
        const GAME_MODE = params.get('mode') || 'dance'; 
        
        const ASSETS = {
            model: './assets/mascote.glb',
            fallback: 'https://cdn.jsdelivr.net/gh/webxr-academy/assets/models/ybot.glb',
            roadTexture: './assets/estrada.jpg',
            raceTexture: './assets/pista.jpg'
        };

        const elTitle = document.getElementById('game-title');
        const elInstr = document.getElementById('instruction-text');
        const elScore = document.getElementById('score-display');
        const elLoading = document.getElementById('loading');
        const elProgress = document.getElementById('loading-progress');
        const elDebug = document.getElementById('debug-info');

        let score = 0, gameSpeed = 0, playerX = 0, previousShoulderY = 0;
        let scene, camera, renderer, model, floorMesh, floorTexture;

        // Configuração de Títulos
        if (GAME_MODE === 'run') elTitle.innerText = "CORRIDA DE RUA";
        else if (GAME_MODE === 'race') elTitle.innerText = "GRAND PRIX";
        else elTitle.innerText = "DANCE MACHINE";

        function initThreeJS() {
            scene = new THREE.Scene();
            
            const loadingManager = new THREE.LoadingManager();
            loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
                elProgress.innerText = `Carregando: ${Math.round((itemsLoaded / itemsTotal) * 100)}%`;
                elDebug.innerText = `Lendo: ${url.split('/').pop()}`;
            };
            loadingManager.onLoad = () => {
                elLoading.style.display = 'none';
            };
            loadingManager.onError = (url) => {
                console.error("Erro ao carregar:", url);
                if (url.includes('.glb')) loadFallback();
                else elLoading.style.display = 'none';
            };

            if (GAME_MODE === 'run') {
                scene.background = new THREE.Color(0x87CEEB);
                scene.fog = new THREE.Fog(0x87CEEB, 10, 50);
                addLight(0xffffff, 1.2);
            } else if (GAME_MODE === 'race') {
                scene.background = new THREE.Color(0xff8c00);
                scene.fog = new THREE.Fog(0xff8c00, 10, 60);
                addLight(0xffaa00, 1.5);
            } else {
                scene.background = new THREE.Color(0x111111);
                addDiscoLights();
            }

            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
            camera.position.set(0, 1.6, 4.5);

            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.outputEncoding = THREE.sRGBEncoding;
            document.body.appendChild(renderer.domElement);

            createFloor(loadingManager);

            const loader = new THREE.GLTFLoader(loadingManager);
            loader.load(ASSETS.model, (gltf) => {
                model = gltf.scene;
                scene.add(model);
                model.traverse(o => { if(o.isMesh) { o.castShadow = true; } });
            });

            function loadFallback() {
                loader.load(ASSETS.fallback, (gltf) => {
                    model = gltf.scene;
                    scene.add(model);
                });
            }

            animate();
        }

        function addLight(color, intensity) {
            scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.8));
            const dir = new THREE.DirectionalLight(color, intensity);
            dir.position.set(5, 10, 7);
            scene.add(dir);
        }

        function addDiscoLights() {
            const spot1 = new THREE.SpotLight(0xff00cc, 10); spot1.position.set(-5, 8, 0);
            const spot2 = new THREE.SpotLight(0x00ffff, 10); spot2.position.set(5, 8, 0);
            scene.add(spot1, spot2);
        }

        function createFloor(manager) {
            if (GAME_MODE === 'dance') {
                scene.add(new THREE.GridHelper(20, 20, 0xff00cc, 0x222222));
                return;
            }
            const texLoader = new THREE.TextureLoader(manager);
            const texUrl = (GAME_MODE === 'race') ? ASSETS.raceTexture : ASSETS.roadTexture;
            
            floorTexture = texLoader.load(texUrl);
            floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
            floorTexture.repeat.set(1, 10);

            const geometry = new THREE.PlaneGeometry(10, 100);
            const material = new THREE.MeshPhongMaterial({ map: floorTexture, color: 0x555555 });
            floorMesh = new THREE.Mesh(geometry, material);
            floorMesh.rotation.x = -Math.PI / 2;
            scene.add(floorMesh);
        }

        function animate() {
            requestAnimationFrame(animate);
            if (floorTexture && (GAME_MODE === 'run' || GAME_MODE === 'race')) {
                let speed = (GAME_MODE === 'race') ? 0.05 : (gameSpeed * 0.05);
                floorTexture.offset.y -= speed;
                if(speed > 0.005) score += 1;
            }
            if (model && GAME_MODE === 'race') {
                model.position.x += (playerX - model.position.x) * 0.1;
                model.rotation.y = Math.PI + (model.position.x * 0.3);
            }
            if (GAME_MODE === 'run') gameSpeed *= 0.97;
            elScore.innerText = score;
            renderer.render(scene, camera);
        }

        const pose = new Pose({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`});
        pose.setOptions({modelComplexity: 1, smoothLandmarks: true, minDetectionConfidence: 0.5});
        pose.onResults(onResults);

        const videoEl = document.getElementById('input_video');
        const cameraFeed = new Camera(videoEl, {
            onFrame: async () => { await pose.send({image: videoEl}); },
            width: 480, height: 360
        });
        cameraFeed.start();

        function onResults(results) {
            if (!model || !results.poseLandmarks) return;
            const riggedPose = Kalidokit.Pose.solve(results.poseLandmarks, results.poseWorldLandmarks, {runtime: "mediapipe", video: videoEl});
            applyRig(riggedPose);

            if (GAME_MODE === 'run') {
                const shoulderY = (results.poseLandmarks[11].y + results.poseLandmarks[12].y) / 2;
                if (Math.abs(shoulderY - previousShoulderY) > 0.007) gameSpeed += 0.12;
                previousShoulderY = shoulderY;
                if(gameSpeed > 1.5) gameSpeed = 1.5;
            }
            if (GAME_MODE === 'race') {
                playerX = (results.poseLandmarks[16].y - results.poseLandmarks[15].y) * 8;
            }
        }

        function applyRig(riggedPose) {
            const rigRotation = (name, rotation) => {
                if (!rotation) return;
                let bone = model.getObjectByName(name) || 
                           model.getObjectByName("mixamorig" + name) || 
                           model.getObjectByName("mixamorig_" + name);
                if (bone) {
                    const euler = new THREE.Euler(rotation.x, rotation.y, rotation.z);
                    bone.quaternion.setFromEuler(euler);
                }
            };
            
            rigRotation("Hips", riggedPose.Hips);
            rigRotation("Spine", riggedPose.Spine);
            rigRotation("RightArm", riggedPose.RightUpperArm);
            rigRotation("LeftArm", riggedPose.LeftUpperArm);
        }

        initThreeJS();
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
    </script>
</body>
</html>
