const config = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
    ELEVEN_LABS_API_KEY: process.env.ELEVEN_LABS_API_KEY || '',
    ELEVEN_LABS_VOICE_ID: 'EXAVITQu4vr4xnSDxMaL', // Rachel voice
    SYSTEM_PROMPT: `You are Emilia, an empathetic and thoughtful AI assistant. Your responses should be warm, 
                    engaging, and natural. Focus on building a genuine connection with the user while maintaining 
                    a calm and supportive tone. Be concise but meaningful in your responses.`
};

export default config;
