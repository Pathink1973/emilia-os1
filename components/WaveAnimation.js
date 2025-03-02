export default class WaveAnimation {
    constructor(container) {
        this.container = container;
        this.init();
    }

    init() {
        // Create wave container
        const waveContainer = document.createElement('div');
        waveContainer.className = 'wave-container';

        // Create three bars
        for (let i = 0; i < 3; i++) {
            const bar = document.createElement('div');
            bar.className = 'wave-bar';
            
            // Add animation
            bar.style.animation = `waveAnimation 0.8s ease-in-out infinite`;
            bar.style.animationDelay = `${i * 0.15}s`;
            
            waveContainer.appendChild(bar);
        }

        this.container.appendChild(waveContainer);
    }
}
