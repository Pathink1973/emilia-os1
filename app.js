import config from './config.js';

class ChatApp {
    constructor() {
        this.recordButton = document.getElementById('recordButton');
        this.userInput = document.getElementById('userInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chat-messages');
        this.status = document.getElementById('status');
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.conversationHistory = [{
            role: 'system',
            content: config.SYSTEM_PROMPT
        }];

        this.setupEventListeners();
    }

    async setupEventListeners() {
        // Record button click handler
        this.recordButton.addEventListener('click', () => this.toggleRecording());

        // Send button click handler
        this.sendButton.addEventListener('click', () => this.handleUserInput());

        // Enter key handler
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleUserInput();
            }
        });
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    channelCount: 1,
                    sampleRate: 44100
                }
            });

            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            this.audioChunks = [];
            this.mediaRecorder.addEventListener('dataavailable', (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            });

            this.mediaRecorder.addEventListener('stop', async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm;codecs=opus' });
                await this.processAudio(audioBlob);
                
                // Stop all tracks to release the microphone
                stream.getTracks().forEach(track => track.stop());
            });

            this.mediaRecorder.start();
            this.isRecording = true;
            this.recordButton.classList.add('recording');
            this.status.textContent = 'Recording...';
        } catch (error) {
            console.error('Error accessing microphone:', error);
            this.status.textContent = 'Error: Could not access microphone. Please check permissions.';
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.recordButton.classList.remove('recording');
            this.status.textContent = 'Processing audio...';
        }
    }

    toggleRecording() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    async processAudio(audioBlob) {
        try {
            // Convert audio to WAV format for Whisper API
            const wavBlob = await this.convertToWAV(audioBlob);
            const transcription = await this.getTranscription(wavBlob);
            if (transcription) {
                this.userInput.value = transcription;
                await this.handleUserInput();
            }
        } catch (error) {
            console.error('Error processing audio:', error);
            this.status.textContent = 'Error processing audio. Please try typing instead.';
        }
    }

    async convertToWAV(audioBlob) {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Create WAV file
        const wavBuffer = this.audioBufferToWAV(audioBuffer);
        return new Blob([wavBuffer], { type: 'audio/wav' });
    }

    audioBufferToWAV(buffer) {
        const numChannels = buffer.numberOfChannels;
        const sampleRate = buffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const bytesPerSample = bitDepth / 8;
        const blockAlign = numChannels * bytesPerSample;
        
        const data = this.interleave(buffer);
        const dataSize = data.length * bytesPerSample;
        const headerSize = 44;
        const totalSize = headerSize + dataSize;
        
        const arrayBuffer = new ArrayBuffer(totalSize);
        const view = new DataView(arrayBuffer);
        
        // WAV header
        this.writeString(view, 0, 'RIFF');
        view.setUint32(4, totalSize - 8, true);
        this.writeString(view, 8, 'WAVE');
        this.writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, format, true);
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * blockAlign, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitDepth, true);
        this.writeString(view, 36, 'data');
        view.setUint32(40, dataSize, true);
        
        this.floatTo16BitPCM(view, headerSize, data);
        
        return arrayBuffer;
    }
    
    writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    
    interleave(buffer) {
        const numChannels = buffer.numberOfChannels;
        const length = buffer.length * numChannels;
        const result = new Float32Array(length);
        
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < buffer.length; i++) {
                result[i * numChannels + channel] = channelData[i];
            }
        }
        
        return result;
    }
    
    floatTo16BitPCM(view, offset, input) {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
    }

    async getTranscription(audioBlob) {
        try {
            if (!config.OPENAI_API_KEY) {
                this.status.textContent = 'Error: OpenAI API Key is not configured';
                throw new Error('OpenAI API Key is not configured');
            }

            const formData = new FormData();
            formData.append('file', audioBlob, 'audio.wav');
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
                throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`);
            }

            const data = await response.json();
            
            if (!data || !data.text) {
                this.status.textContent = 'Error: No transcription received';
                throw new Error('No transcription received from OpenAI');
            }

            this.status.textContent = 'Transcription received, generating response...';
            return data.text;
        } catch (error) {
            console.error('Transcription error:', error);
            if (!this.status.textContent.startsWith('Error:')) {
                this.status.textContent = 'Error: Failed to transcribe audio. Please try again.';
            }
            throw error;
        }
    }

    async handleUserInput() {
        const userMessage = this.userInput.value.trim();
        if (!userMessage) return;

        this.userInput.value = '';
        this.addMessage(userMessage, 'user');

        try {
            const aiResponse = await this.getAIResponse(userMessage);
            if (aiResponse) {
                const audioUrl = await this.textToSpeech(aiResponse);
                if (audioUrl) {
                    const audio = new Audio(audioUrl);
                    audio.play();
                }
            }
        } catch (error) {
            console.error('Error in conversation:', error);
        }
    }

    addMessage(message, role) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}`;
        messageDiv.textContent = message;
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
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

            this.status.textContent = 'Playing audio response...';
            return URL.createObjectURL(audioBlob);
        } catch (error) {
            console.error('Text-to-speech error:', error);
            if (!this.status.textContent.startsWith('Error:')) {
                this.status.textContent = 'Error: Failed to convert text to speech. Please try again.';
            }
            throw error;
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new ChatApp();
});
