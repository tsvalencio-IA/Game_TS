/**
 * thIAguinho Arcade - App Logic
 */

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registrado!', reg))
            .catch(err => console.error('Erro SW:', err));
    });
}

// Gestão de Recordes Locais
const ArcadeScore = {
    init: function() {
        const modes = ['dance', 'run', 'race'];
        modes.forEach(mode => {
            const val = localStorage.getItem(`th_score_${mode}`) || 0;
            const el = document.getElementById(`score-${mode}`);
            if (el) el.innerText = `Recorde: ${val}`;
        });
    },
    save: function(mode, score) {
        const best = localStorage.getItem(`th_score_${mode}`) || 0;
        if (score > best) {
            localStorage.setItem(`th_score_${mode}`, score);
            this.init();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => ArcadeScore.init());