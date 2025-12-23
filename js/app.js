/**
 * thIAguinho Arcade - Controller V6
 */
console.log("Sistema Arcade thIAguinho Ativo.");

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW: Registrado com sucesso.'))
            .catch(err => console.error('SW: Falha no registro.', err));
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

document.addEventListener('DOMContentLoaded', ArcadeScore.init);