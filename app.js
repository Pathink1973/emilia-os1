import config from './config.js';
import WaveAnimation from './components/WaveAnimation.js';

// Initialize wave animation
const waveContainer = document.getElementById('waveAnimation');
if (waveContainer) {
    new WaveAnimation(waveContainer);
}

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
        this.micButton.addEventListener('click', () => {
            if (!this.isRecording) {
                this.startRecording();
            } else {
                this.stopRecording();
            }
        });
    }

    async checkMicrophonePermissions() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(track => track.stop());
            this.status.textContent = 'Click the microphone to start';
        } catch (error) {
            console.error('Microphone permission error:', error);
            this.status.textContent = 'Error: Microphone permission denied';
        }
    }

    async startRecording() {
        try {
            const constraints = {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    channelCount: 1,
                    sampleRate: { ideal: 44100 }
                }
            };

            if (navigator.mediaDevices.getUserMedia) {
                this.status.textContent = 'Requesting microphone access...';
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = audioContext.createMediaStreamSource(stream);
                
                let mimeType = 'audio/webm;codecs=opus';
                if (!MediaRecorder.isTypeSupported(mimeType)) {
                    mimeType = 'audio/mp4';
                }

                this.mediaRecorder = new MediaRecorder(stream, {
                    mimeType: mimeType
                });

                this.audioChunks = [];
                this.mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        this.audioChunks.push(event.data);
                    }
                };

                this.mediaRecorder.onstart = () => {
                    this.isRecording = true;
                    this.micButton.classList.add('active');
                    this.status.textContent = 'Listening...';

                    // Reset and start silence detection
                    if (this.silenceTimer) {
                        clearTimeout(this.silenceTimer);
                    }
                    this.silenceTimer = setTimeout(() => {
                        if (this.isRecording) {
                            this.stopRecording();
                        }
                    }, this.SILENCE_THRESHOLD);
                };

                this.mediaRecorder.onstop = async () => {
                    const tracks = stream.getTracks();
                    tracks.forEach(track => track.stop());
                    
                    if (this.silenceTimer) {
                        clearTimeout(this.silenceTimer);
                    }

                    if (this.audioChunks.length > 0) {
                        await this.processAudio(new Blob(this.audioChunks, { type: mimeType }));
                    }
                };

                this.mediaRecorder.start(100);
            }
        } catch (error) {
            console.error('Recording error:', error);
            this.status.textContent = 'Error: Could not start recording';
        }
    }

    async stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.micButton.classList.remove('active');
            this.status.textContent = 'Processing...';
        }
    }

    async processAudio(audioBlob) {
        try {
            // Convert audio to WAV format for Whisper API
            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.webm');
            formData.append('model', 'whisper-1');
            formData.append('language', 'en');

            const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.OPENAI_API_KEY}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || response.statusText;
                this.status.textContent = `Error: ${errorMessage}`;
                throw new Error(`Whisper API error: ${response.status} - ${errorMessage}`);
            }

            const data = await response.json();
            
            if (!data.text) {
                this.status.textContent = 'Error: No speech detected';
                throw new Error('No speech detected');
            }

            const userMessage = data.text.trim();
            this.addMessage(userMessage, 'user');
            
            const aiMessage = await this.getAIResponse(userMessage);
            await this.textToSpeech(aiMessage);

        } catch (error) {
            console.error('Audio processing error:', error);
            if (!this.status.textContent.startsWith('Error:')) {
                this.status.textContent = 'Error: Failed to process audio. Please try again.';
            }
        }
    }

    addMessage(text, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.textContent = text;
        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    async getAIResponse(userMessage) {
        try {
            if (!config.OPENAI_API_KEY) {
                this.status.textContent = 'Error: OpenAI API Key is not configured';
                throw new Error('OpenAI API Key is not configured');
            }

            this.conversationHistory.push({
                role: 'user',
                content: userMessage
            });

            this.status.textContent = 'Emilia is thinking...';

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

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || response.statusText;
                this.status.textContent = `Error: ${errorMessage}`;
                throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                this.status.textContent = 'Error: Invalid response from AI';
                throw new Error('Invalid response from OpenAI');
            }

            const aiMessage = data.choices[0].message.content;
            this.conversationHistory.push({
                role: 'assistant',
                content: aiMessage
            });

            this.addMessage(aiMessage, 'assistant');
            this.status.textContent = 'Converting response to speech...';
            return aiMessage;
        } catch (error) {
            console.error('AI Response error:', error);
            if (!this.status.textContent.startsWith('Error:')) {
                this.status.textContent = 'Error: Failed to get AI response. Please try again.';
            }
            throw error;
        }
    }

    async textToSpeech(text) {
        try {
            const audioUrl = await this.callElevenLabsAPI(text);
            if (audioUrl) {
                const audio = new Audio(audioUrl);
                audio.onended = () => {
                    this.status.textContent = 'Click the microphone to start';
                };
                await audio.play();
                return audioUrl;
            }
            return null;
        } catch (error) {
            throw error;
        }
    }

    async callElevenLabsAPI(text) {
        if (!config.ELEVEN_LABS_API_KEY || !config.ELEVEN_LABS_VOICE_ID) {
            this.status.textContent = 'Error: Eleven Labs credentials are not configured';
            throw new Error('Eleven Labs credentials are not configured');
        }

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

        if (!response.ok) {
            const errorMessage = await response.text();
            this.status.textContent = `Error: ${errorMessage}`;
            throw new Error(`Eleven Labs API error: ${response.status} - ${errorMessage}`);
        }

        const audioBlob = await response.blob();
        if (!audioBlob || audioBlob.size === 0) {
            this.status.textContent = 'Error: No audio received';
            throw new Error('No audio received from Eleven Labs');
        }

        return URL.createObjectURL(audioBlob);
    }
}

// Initialize the app
const emilia = new EmiliaAI();
