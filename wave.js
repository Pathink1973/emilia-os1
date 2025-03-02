export class WaveAnimation {
    constructor(container) {
        this.container = container;
        this.bars = [];
        this.isAnimating = false;
        this.createBars();
    }

    createBars() {
        // Create container for bars
        const barsContainer = document.createElement('div');
        barsContainer.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            gap: 4px;
            height: 40px;
            align-items: center;
        `;

        // Create 3 bars
        for (let i = 0; i < 3; i++) {
            const bar = document.createElement('div');
            bar.style.cssText = `
                width: 4px;
                height: 24px;
                background-color: white;
                border-radius: 2px;
                transition: transform 0.6s ease-in-out;
            `;
            barsContainer.appendChild(bar);
            this.bars.push(bar);
        }

        this.container.appendChild(barsContainer);
    }

    start() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        
        const animate = () => {
            if (!this.isAnimating) return;
            
            this.bars.forEach((bar, i) => {
                setTimeout(() => {
                    bar.style.transform = 'scaleY(0.4)';
                    setTimeout(() => {
                        bar.style.transform = 'scaleY(1)';
                    }, 300);
                }, i * 200);
            });
            
            setTimeout(animate, 600);
        };
        
        animate();
    }

    stop() {
        this.isAnimating = false;
        this.bars.forEach(bar => {
            bar.style.transform = 'scaleY(1)';
        });
    }
}
