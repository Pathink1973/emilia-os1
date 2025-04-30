import config from './config.js';
import WaveAnimation from './components/WaveAnimation.js';

// Initialize wave animation
const waveContainer = document.getElementById('waveAnimation');
if (waveContainer) {
    new WaveAnimation(waveContainer);
}

// --- Audio unlock for mobile browsers ---
let audioUnlocked = false;
let audioContext = null;

function unlockAudio() {
    if (audioUnlocked) return;
    try {
        // Create audio context
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create oscillator
        const oscillator = audioContext.createOscillator();
        oscillator.connect(audioContext.destination);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);
        
        audioUnlocked = true;
        console.log('[Audio] Unlocked audio context');
    } catch (e) {
        console.warn('[Audio] Unlock failed:', e);
    }
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
        this.lastStatusMessage = null;

        this.initializeEventListeners();
        this.checkMicrophonePermissions();
    }

    initializeEventListeners() {
        // Unlock audio on first user interaction (tap/click)
        // Only unlock on first touch/click, do not repeat
        const unlockOnce = () => {
            unlockAudio();
            window.removeEventListener('touchend', unlockOnce);
            window.removeEventListener('click', unlockOnce);
        };
        window.addEventListener('touchend', unlockOnce);
        window.addEventListener('click', unlockOnce);

        this.micButton.addEventListener('click', () => {
            unlockAudio();
            console.log('[Mic] Mic button clicked. isRecording:', this.isRecording);
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
            this.updateStatus('Click the microphone to start');
        } catch (error) {
            console.error('Microphone permission error:', error);
            this.updateStatus('Error: Microphone permission denied');
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
                this.updateStatus('Requesting microphone access...');
                console.log('[Mic] Requesting microphone access...');
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
                        console.log('[Mic] Audio chunk received, size:', event.data.size);
                    }
                };

                this.mediaRecorder.onstart = () => {
                    this.isRecording = true;
                    this.micButton.classList.add('active');
                    this.updateStatus('Listening...');
                    console.log('[Mic] Recording started.');

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
                    console.log('[Mic] Recording stopped. Chunks:', this.audioChunks.length);
                    
                    if (this.silenceTimer) {
                        clearTimeout(this.silenceTimer);
                    }

                    if (this.audioChunks.length > 0) {
                        this.updateStatus('Processing audio...');
                        await this.processAudio(new Blob(this.audioChunks, { type: mimeType }));
                    } else {
                        this.updateStatus('No audio detected. Try again.');
                        console.warn('[Mic] No audio chunks were recorded.');
                    }
                };

                this.mediaRecorder.start(100);
            }
        } catch (error) {
            console.error('Recording error:', error);
            this.updateStatus('Error: Could not start recording');
        }
    }

    async stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.micButton.classList.remove('active');
            this.updateStatus('Processing...');
        }
    }

    async processAudio(audioBlob) {
        try {
            this.updateStatus('Converting speech to text...');
            console.log('[Whisper] Sending audio to Whisper for transcription.');
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
                this.updateStatus(`Error: ${errorMessage}`);
                console.error('[Whisper] API error:', errorMessage);
                throw new Error(`Whisper API error: ${response.status} - ${errorMessage}`);
            }

            const data = await response.json();
            
            if (!data.text) {
                this.updateStatus('Error: No speech detected');
                console.warn('[Whisper] No speech detected in audio.');
                throw new Error('No speech detected');
            }

            const userMessage = data.text.trim();
            console.log('[Whisper] Transcription result:', userMessage);
            this.addMessage(userMessage, 'user');
            
            this.updateStatus('Emilia is thinking...');
            const aiMessage = await this.getAIResponse(userMessage);
            this.updateStatus('');  // Clear status when response is received
            await this.textToSpeech(aiMessage);

        } catch (error) {
            console.error('Audio processing error:', error);
            if (!this.status.textContent.startsWith('Error:')) {
                this.updateStatus('Error: Failed to process audio. Please try again.');
            }
        }
    }

    addMessage(text, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.textContent = text;
        this.messagesContainer.appendChild(messageDiv);
        // Scroll to the new message with smooth animation
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    updateStatus(text) {
        this.status.textContent = text;
        // Also show status in messages container
        if (this.lastStatusMessage) {
            this.lastStatusMessage.remove();
        }
        const statusDiv = document.createElement('div');
        statusDiv.className = 'message status';
        statusDiv.textContent = text;
        this.messagesContainer.appendChild(statusDiv);
        this.lastStatusMessage = statusDiv;
        // Scroll to the status message
        statusDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    async getAIResponse(userMessage) {
        try {
            if (!config.OPENAI_API_KEY) {
                this.updateStatus('Error: OpenAI API Key is not configured');
                throw new Error('OpenAI API Key is not configured');
            }

            this.conversationHistory.push({
                role: 'user',
                content: userMessage
            });

            console.log('[GPT] Sending user message to GPT:', userMessage);
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
                this.updateStatus(`Error: ${errorMessage}`);
                console.error('[GPT] API error:', errorMessage);
                throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`);
            }

            const data = await response.json();
            
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                this.updateStatus('Error: Invalid response from AI');
                console.error('[GPT] Invalid response from OpenAI:', data);
                throw new Error('Invalid response from OpenAI');
            }

            const aiMessage = data.choices[0].message.content;
            this.conversationHistory.push({
                role: 'assistant',
                content: aiMessage
            });

            console.log('[GPT] AI response:', aiMessage);
            this.addMessage(aiMessage, 'assistant');
            this.updateStatus('Converting response to speech...');
            return aiMessage;
        } catch (error) {
            console.error('AI Response error:', error);
            if (!this.status.textContent.startsWith('Error:')) {
                this.updateStatus('Error: Failed to get AI response. Please try again.');
            }
            throw error;
        }
    }

    async textToSpeech(text) {
        try {
            // Only unlock audio if it hasn't already been unlocked
            if (!audioUnlocked) {
                unlockAudio();
            }
            console.log('[TTS] Sending text to ElevenLabs:', text);
            const audioUrl = await this.callElevenLabsAPI(text);
            if (audioUrl) {
                let played = false;
                
                // Always use Web Audio API for mobile devices
                if (typeof window.ontouchstart !== 'undefined') {
                    try {
                        const response = await fetch(audioUrl);
                        const arrayBuffer = await response.arrayBuffer();
                        const buffer = await audioContext.decodeAudioData(arrayBuffer);
                        const source = audioContext.createBufferSource();
                        source.buffer = buffer;
                        source.connect(audioContext.destination);
                        source.start(0);
                        source.onended = () => {};
                        played = true;
                        console.log('[Audio] Playback started (Web Audio API)');
                    } catch (err) {
                        console.error('[Audio] Web Audio API playback failed:', err);
                        this.updateStatus('Tap anywhere to enable sound.');
                    }
                } else {
                    // Try direct Audio playback for desktop
                    const audio = new Audio(audioUrl);
                    audio.onended = () => {};
                    try {
                        await audio.play();
                        console.log('[Audio] Playback started (Audio element)');
                        played = true;
                    } catch (err) {
                        console.warn('[Audio] play() failed, trying Web Audio API:', err);
                        
                        // Fallback to Web Audio API
                        try {
                            const response = await fetch(audioUrl);
                            const arrayBuffer = await response.arrayBuffer();
                            const buffer = await audioContext.decodeAudioData(arrayBuffer);
                            const source = audioContext.createBufferSource();
                            source.buffer = buffer;
                            source.connect(audioContext.destination);
                            source.start(0);
                            source.onended = () => {};
                            played = true;
                            console.log('[Audio] Playback started (Web Audio API)');
                        } catch (err2) {
                            console.error('[Audio] Web Audio API playback failed:', err2);
                            this.updateStatus('Tap anywhere to enable sound.');
                        }
                    }
                }
                
                if (!played) {
                    this.updateStatus('Error: Could not play assistant voice. Tap to retry.');
                }
                return audioUrl;
            } else {
                this.updateStatus('Error: No audio URL received from ElevenLabs.');
                console.error('[TTS] No audio URL received.');
            }
        } catch (error) {
            console.error('Text to speech error:', error);
            this.updateStatus('Error: Text-to-speech failed.');
            throw error;
        }
    }

    async callElevenLabsAPI(text) {
        if (!config.ELEVEN_LABS_API_KEY || !config.ELEVEN_LABS_VOICE_ID) {
            this.updateStatus('Error: Eleven Labs credentials are not configured');
            console.error('[TTS] Eleven Labs credentials missing.');
            throw new Error('Eleven Labs credentials are not configured');
        }

        try {
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${config.ELEVEN_LABS_VOICE_ID}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': config.ELEVEN_LABS_API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5
                    }
                })
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                this.updateStatus(`Error: ${errorMessage}`);
                console.error('[TTS] ElevenLabs API error:', errorMessage);
                throw new Error(`Eleven Labs API error: ${response.status} - ${errorMessage}`);
            }

            const audioBlob = await response.blob();
            if (!audioBlob || audioBlob.size === 0) {
                this.updateStatus('Error: No audio received');
                console.error('[TTS] No audio received from ElevenLabs.');
                throw new Error('No audio received from Eleven Labs');
            }

            console.log('[TTS] Received audio from ElevenLabs, size:', audioBlob.size);
            return URL.createObjectURL(audioBlob);
        } catch (err) {
            this.updateStatus('Error: Failed to fetch audio from ElevenLabs.');
            console.error('[TTS] Fetch failed:', err);
            throw err;
        }
    }
}

// Initialize the app
const emilia = new EmiliaAI();
