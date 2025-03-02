import config from './config.js';

class EmiliaAI {
    constructor() {
        this.micButton = document.getElementById('micButton');
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
        this.requestMicrophoneAccess();
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
            this.micButton.disabled = false;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.micButton.disabled = true;
        }
    }

    initializeEventListeners() {
        ['mousedown', 'touchstart'].forEach(eventType => {
            this.micButton.addEventListener(eventType, async (e) => {
                e.preventDefault();
                if (!this.isRecording) {
                    await this.startRecording();
                }
            });
        });

        ['mouseup', 'touchend'].forEach(eventType => {
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

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            this.audioChunks = [];
            this.mediaRecorder = new MediaRecorder(stream);
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                await this.processAudio();
            };
            
            this.mediaRecorder.start();
            this.isRecording = true;
            this.micButton.classList.add('active');
            this.startSilenceDetection(stream);
            
            this.addMessage('Listening...', 'assistant');
        } catch (error) {
            console.error('Error starting recording:', error);
            this.isRecording = false;
            this.micButton.classList.remove('active');
        }
    }

    startSilenceDetection(stream) {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const processor = audioContext.createScriptProcessor(2048, 1, 1);
        const analyser = audioContext.createAnalyser();
        
        source.connect(analyser);
        analyser.connect(processor);
        processor.connect(audioContext.destination);
        
        let silenceStart = null;
        
        processor.onaudioprocess = () => {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            const average = array.reduce((a, b) => a + b) / array.length;
            
            if (average < 10) { // Silence threshold
                if (!silenceStart) {
                    silenceStart = Date.now();
                } else if (Date.now() - silenceStart > this.SILENCE_THRESHOLD) {
                    this.stopRecording();
                }
            } else {
                silenceStart = null;
            }
        };
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.micButton.classList.remove('active');
        }
    }

    async processAudio() {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const transcription = await this.getTranscription(audioBlob);
        
        if (transcription) {
            this.addMessage(transcription, 'user');
            const aiResponse = await this.getAIResponse(transcription);
            
            if (aiResponse) {
                this.addMessage(aiResponse, 'assistant');
                await this.textToSpeech(aiResponse);
            }
        }
    }

    async getTranscription(audioBlob) {
        try {
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            formData.append('model', 'whisper-1');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.OPENAI_API_KEY}`
                },
                body: formData
            });

            if (!response.ok) throw new Error('Transcription failed');
            const data = await response.json();
            return data.text;
        } catch (error) {
            console.error('Transcription error:', error);
            this.addMessage('Sorry, I couldn\'t understand that. Please try again.', 'assistant');
            return null;
        }
    }

    async getAIResponse(message) {
        try {
            this.conversationHistory.push({
                role: 'user',
                content: message
            });

            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'gpt-4',
                    messages: this.conversationHistory,
                    max_tokens: 150
                })
            });

            if (!response.ok) throw new Error('AI response failed');
            const data = await response.json();
            const aiMessage = data.choices[0].message.content;
            
            this.conversationHistory.push({
                role: 'assistant',
                content: aiMessage
            });

            return aiMessage;
        } catch (error) {
            console.error('AI response error:', error);
            return 'I apologize, but I\'m having trouble processing your request right now.';
        }
    }

    async textToSpeech(text) {
        try {
            const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': config.ELEVEN_LABS_API_KEY
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

            if (!response.ok) throw new Error('Text-to-speech failed');
            const audioBlob = await response.blob();
            await this.playAudioResponse(audioBlob);
        } catch (error) {
            console.error('Text-to-speech error:', error);
        }
    }

    async playAudioResponse(audioBlob) {
        const url = URL.createObjectURL(audioBlob);
        const audio = new Audio(url);
        await audio.play();
        URL.revokeObjectURL(url);
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.textContent = text;
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new EmiliaAI();
});
