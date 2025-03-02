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

        this.initializeEventListeners();
        this.checkMicrophonePermissions();
    }

    initializeEventListeners() {
        this.micButton.addEventListener('click', () => this.toggleRecording());
    }

    async checkMicrophonePermissions() {
        try {
            // Check if we're in a secure context (HTTPS or localhost)
            if (!window.isSecureContext) {
                this.status.textContent = 'Microphone access requires HTTPS';
                this.micButton.disabled = true;
                return;
            }

            // Check if the browser supports getUserMedia
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                this.status.textContent = 'Your browser does not support microphone access';
                this.micButton.disabled = true;
                return;
            }

            // Check if we already have microphone permission
            const permissionResult = await navigator.permissions.query({ name: 'microphone' });
            if (permissionResult.state === 'denied') {
                this.status.textContent = 'Microphone access was denied. Please enable it in your browser settings.';
                this.micButton.disabled = true;
            } else {
                this.status.textContent = 'Click the microphone to start';
                this.micButton.disabled = false;
            }
        } catch (error) {
            console.error('Error checking microphone permissions:', error);
            this.status.textContent = 'Error checking microphone permissions';
            this.micButton.disabled = true;
        }
    }

    async toggleRecording() {
        if (!this.isRecording) {
            await this.startRecording();
        } else {
            await this.stopRecording();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                this.audioChunks.push(event.data);
            };

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                await this.processAudio(audioBlob);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.micButton.classList.add('active');
            this.status.textContent = 'Listening...';
            
            this.startSilenceDetection(stream);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            if (error.name === 'NotAllowedError') {
                this.status.textContent = 'Microphone access denied. Please allow access in your browser settings.';
            } else {
                this.status.textContent = 'Error accessing microphone';
            }
            this.micButton.disabled = true;
            // Re-enable the button after checking permissions again
            await this.checkMicrophonePermissions();
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
