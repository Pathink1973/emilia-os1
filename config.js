const config = {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY,
    ELEVEN_LABS_API_KEY: import.meta.env.VITE_ELEVEN_LABS_API_KEY || process.env.VITE_ELEVEN_LABS_API_KEY,
    ELEVEN_LABS_VOICE_ID: import.meta.env.VITE_ELEVEN_LABS_VOICE_ID || process.env.VITE_ELEVEN_LABS_VOICE_ID,
    SYSTEM_PROMPT: `You are Emilia, an empathetic and thoughtful AI assistant. Your responses should be warm, 
                    engaging, and natural. Focus on building a genuine connection with the user while maintaining 
                    a calm and supportive tone. Be concise but meaningful in your responses.`
};

export default config;
