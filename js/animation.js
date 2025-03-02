class DotAnimation {
    constructor() {
        this.dot = document.querySelector('.dot');
        this.audio = document.getElementById('soulAudio');
        this.isPlaying = false;
        this.hasInteracted = false;
        this.setupAnimation();
    }

    setupAnimation() {
        // Only try to play audio after user interaction
        document.addEventListener('click', () => {
            this.hasInteracted = true;
            if (!this.isPlaying) {
                this.playAudio();
            }
        }, { once: true });

        // Start playing audio when animation starts (if user has interacted)
        this.dot.addEventListener('animationstart', () => {
            if (!this.isPlaying && this.hasInteracted) {
                this.playAudio();
            }
        });

        // Ensure audio continues playing when animation iterates
        this.dot.addEventListener('animationiteration', () => {
            if (!this.isPlaying && this.hasInteracted) {
                this.playAudio();
            }
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAudio();
            } else if (this.hasInteracted) {
                this.playAudio();
            }
        });

        // Add touch/click event to toggle audio
        this.dot.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hasInteracted = true;
            this.toggleAudio();
        });
        
        this.dot.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.hasInteracted = true;
            this.toggleAudio();
        });
    }

    async playAudio() {
        try {
            if (this.audio.paused && this.hasInteracted) {
                // Set volume to a pleasant level
                this.audio.volume = 0.4;
                await this.audio.play();
                this.isPlaying = true;
            }
        } catch (error) {
            console.log('Waiting for user interaction before playing audio');
        }
    }

    pauseAudio() {
        this.audio.pause();
        this.isPlaying = false;
    }

    toggleAudio() {
        if (this.isPlaying) {
            this.pauseAudio();
        } else {
            this.playAudio();
        }
    }
}

// Initialize the animation when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DotAnimation();
});
