/**
 * thIAguinho Arcade - App Logic
 */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Arcade SW Ativo'))
            .catch(err => console.error('Erro no registro do SW'));
    });
}

const ArcadeScore = {
    init: function() {
        ['dance', 'run', 'race'].forEach(mode => {
            const val = localStorage.getItem(`th_score_${mode}`) || 0;
            const el = document.getElementById(`score-${mode}`);
            if (el) el.innerText = `Recorde: ${val}`;
        });
    }
};

document.addEventListener('DOMContentLoaded', () => ArcadeScore.init());
