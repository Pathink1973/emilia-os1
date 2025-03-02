const config = {
    OPENAI_API_KEY: import.meta.env?.VITE_OPENAI_API_KEY || '',
    ELEVEN_LABS_API_KEY: import.meta.env?.VITE_ELEVEN_LABS_API_KEY || '',
    ELEVEN_LABS_VOICE_ID: import.meta.env?.VITE_ELEVEN_LABS_VOICE_ID || '',
    SYSTEM_PROMPT: `You are Emilia, an empathetic and thoughtful AI assistant. Your responses should be warm, 
                    engaging, and natural. Focus on building a genuine connection with the user while maintaining 
                    a calm and supportive tone. Be concise but meaningful in your responses.`
};

// Add error checking
if (!config.OPENAI_API_KEY) {
    console.error('OpenAI API Key is not set. Please check your environment variables.');
}
if (!config.ELEVEN_LABS_API_KEY) {
    console.error('Eleven Labs API Key is not set. Please check your environment variables.');
}
if (!config.ELEVEN_LABS_VOICE_ID) {
    console.error('Eleven Labs Voice ID is not set. Please check your environment variables.');
}

export default config;
