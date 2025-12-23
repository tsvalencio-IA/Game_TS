/**
 * thIAguinho Arcade - Logic Controller
 */

// Registro do PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW: Ativo'))
            .catch(err => console.error('SW: Erro', err));
    });
}

// Inicialização de interface
document.addEventListener('DOMContentLoaded', () => {
    ['dance', 'run', 'race'].forEach(mode => {
        const val = localStorage.getItem(`th_score_${mode}`) || 0;
        const el = document.getElementById(`score-${mode}`);
        if (el) el.innerText = `Recorde: ${val}`;
    });
});