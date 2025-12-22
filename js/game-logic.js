/**
 * GameLogic - Gerenciador de Estados do TS-Game
 * Controla as animações do modelo GLB vindas do Mixamo.
 */
const GameLogic = (function() {
    
    // Referências do DOM
    const elements = {
        avatar: null,
        statusText: null,
        marker: null
    };

    // Inicialização da lógica
    const init = () => {
        elements.avatar = document.querySelector('#thiaguinho-avatar');
        elements.statusText = document.querySelector('#player-status');
        elements.marker = document.querySelector('#main-marker');

        // Listener para detecção do marcador
        if (elements.marker) {
            elements.marker.addEventListener('markerFound', () => {
                updateStatus("THIAGUINHO IDENTIFICADO!");
            });

            elements.marker.addEventListener('markerLost', () => {
                updateStatus("BUSCANDO MARCADOR...");
            });
        }
    };

    // Troca de animações baseada nos clips do arquivo GLB
    const playAnimation = (clipName) => {
        if (!elements.avatar) return;

        console.log(`Solicitando animação: ${clipName}`);
        
        // Atualiza o componente animation-mixer do A-Frame Extras
        elements.avatar.setAttribute('animation-mixer', {
            clip: clipName,
            loop: 'repeat',
            crossFadeDuration: 0.4
        });

        updateStatus(`ESTADO: ${clipName.toUpperCase()}`);
    };

    // Atualiza o texto da UI
    const updateStatus = (text) => {
        if (elements.statusText) {
            elements.statusText.innerText = text;
        }
    };

    // Aguarda o DOM carregar para iniciar
    window.addEventListener('DOMContentLoaded', init);

    // Expõe apenas o necessário
    return {
        playAnimation: playAnimation
    };

})();
