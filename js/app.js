/**
 * thIAguinho Arcade - App Controller V5
 */

// REGISTO DO SERVICE WORKER
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW: Arcade pronto para uso offline.'))
            .catch(err => console.error('SW: Falha no registo.', err));
    });
}

// GESTÃO DE RECORDES E UI
const ArcadeScore = {
    init: function() {
        const modes = ['dance', 'run', 'race'];
        modes.forEach(mode => {
            const val = localStorage.getItem(`th_score_${mode}`) || 0;
            const el = document.getElementById(`score-${mode}`);
            if (el) el.innerText = `Recorde: ${val}`;
        });
        console.log("Sistema de pontuação sincronizado.");
    },
    update: function(mode, newScore) {
        const best = parseInt(localStorage.getItem(`th_score_${mode}`)) || 0;
        if (newScore > best) {
            localStorage.setItem(`th_score_${mode}`, newScore);
            this.init();
        }
    }
};

// INICIALIZAÇÃO AO CARREGAR O DOM
document.addEventListener('DOMContentLoaded', () => {
    ArcadeScore.init();
    console.log("TS-Game Arcade Engine Iniciado.");
});
