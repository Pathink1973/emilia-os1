import config from './config.js';

class EmiliaAI {
    constructor() {
        this.micButton = document.getElementById('micButton');
        this.status = document.getElementById('status');
        this.messagesContainer = document.getElementById('messages');
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.silenceTimer = null;
        this.SILENCE_THRESHOLD = 3000; // 3 seconds of silence
        this.conversationHistory = [{
            role: 'system',
            content: config.SYSTEM_PROMPT
        }];

        // Check for HTTPS
        this.checkHttps();
        this.initializeEventListeners();
        this.checkMobilePermissions();
    }

    checkHttps() {
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            this.status.textContent = 'Please use HTTPS for microphone access';
            this.micButton.disabled = true;
            // Redirect to HTTPS if on Netlify
            if (window.location.hostname.includes('netlify.app')) {
                window.location.href = 'https://' + window.location.hostname + window.location.pathname;
            }
        }
    }

    async checkMobilePermissions() {
        try {
            // Check if we're on iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            
            if (isIOS) {
                // On iOS, we need to request permission when the user interacts with the page
                document.addEventListener('touchstart', async () => {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                        stream.getTracks().forEach(track => track.stop());
                    } catch (err) {
                        console.log('Audio permission not granted');
                        this.status.textContent = 'Please allow microphone access';
                    }
                }, { once: true });
            }

            // Check if microphone is available
            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(track => track.stop());
                } catch (err) {
                    this.handlePermissionError(err);
                }
            } else {
                this.status.textContent = 'Microphone access not supported in this browser';
                this.micButton.disabled = true;
            }
        } catch (error) {
            this.handlePermissionError(error);
        }
    }

    handlePermissionError(error) {
        console.error('Permission error:', error);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            this.status.textContent = 'Please allow microphone access in your browser settings';
        } else if (error.name === 'NotFoundError') {
            this.status.textContent = 'No microphone found';
        } else {
            this.status.textContent = 'Error accessing microphone';
        }
        this.micButton.disabled = true;
    }

    initializeEventListeners() {
        // Handle both click and touch events
        const startEvents = ['click', 'touchstart'];
        const endEvents = ['click', 'touchend'];

        startEvents.forEach(eventType => {
            this.micButton.addEventListener(eventType, async (e) => {
                e.preventDefault();
                if (!this.isRecording) {
                    try {
                        await this.requestMicrophoneAccess();
                        await this.startRecording();
                    } catch (error) {
                        this.handlePermissionError(error);
                    }
                }
            });
        });

        endEvents.forEach(eventType => {
            this.micButton.addEventListener(eventType, (e) => {
                e.preventDefault();
                if (this.isRecording) {
                    this.stopRecording();
                }
            });
        });

        // Prevent scrolling when touching the mic button
        this.micButton.addEventListener('touchmove', (e) => {
            e.preventDefault();
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRecording) {
                this.stopRecording();
            }
        });
    }

    async requestMicrophoneAccess() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            stream.getTracks().forEach(track => track.stop());
            return true;
        } catch (error) {
            throw error;
        }
    }

    async startRecording() {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
                await this.processAudio(audioBlob);
            };

            this.mediaRecorder.start(100); // Collect data every 100ms
            this.isRecording = true;
            this.micButton.classList.add('active');
            this.status.textContent = 'Listening...';
            
            this.startSilenceDetection(stream);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.status.textContent = 'Error accessing microphone';
            
            if (error.name === 'NotAllowedError') {
                this.status.textContent = 'Please allow microphone access';
            } else if (error.name === 'NotFoundError') {
                this.status.textContent = 'No microphone found';
            }
        }
    }

    async stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.micButton.classList.remove('active');
            this.status.textContent = 'Processing...';
            
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
    }

    startSilenceDetection(stream) {
        // Only start silence detection on desktop
        if (/Android|webOS|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            return;
        }

        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 2048;
        source.connect(analyzer);

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        let silenceStart = null;

        const checkSilence = () => {
            if (!this.isRecording) return;

            analyzer.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / bufferLength;

            if (average < 10) {
                if (!silenceStart) silenceStart = Date.now();
                else if (Date.now() - silenceStart > this.SILENCE_THRESHOLD) {
                    this.stopRecording();
                    return;
                }
            } else {
                silenceStart = null;
            }

            requestAnimationFrame(checkSilence);
        };

        checkSilence();
    }

    async processAudio(audioBlob) {
        try {
            // 1. Convert audio to text using Whisper API
            const transcription = await this.getTranscription(audioBlob);
            this.addMessage(transcription, 'user');
            
            // 2. Get AI response using GPT-4
            const aiResponse = await this.getAIResponse(transcription);
            
            // 3. Convert AI response to speech using Eleven Labs
            const audioUrl = await this.textToSpeech(aiResponse);
            
            // 4. Play the audio response
            await this.playAudioResponse(audioUrl);
            
            this.status.textContent = 'Click the microphone to start';
        } catch (error) {
            console.error('Error processing audio:', error);
            this.status.textContent = 'Error processing audio';
        }
    }

    async getTranscription(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.wav');
        formData.append('model', 'whisper-1');

        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.OPENAI_API_KEY}`
            },
            body: formData
        });

        const data = await response.json();
        return data.text;
    }

    async getAIResponse(userMessage) {
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: this.conversationHistory,
                temperature: 0.7,
                max_tokens: 150
            })
        });

        const data = await response.json();
        const aiMessage = data.choices[0].message.content;
        
        this.conversationHistory.push({
            role: 'assistant',
            content: aiMessage
        });

        this.addMessage(aiMessage, 'assistant');
        return aiMessage;
    }

    async textToSpeech(text) {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.ELEVEN_LABS_VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': config.ELEVEN_LABS_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });

        const audioBlob = await response.blob();
        return URL.createObjectURL(audioBlob);
    }

    async playAudioResponse(audioUrl) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(audioUrl);
            audio.onended = resolve;
            audio.onerror = reject;
            audio.play();
        });
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', sender);
        messageDiv.textContent = text;
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new EmiliaAI();
});
