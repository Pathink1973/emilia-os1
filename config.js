const getEnvVar = (key) => {
    // Check for Vite's import.meta.env
    if (import.meta.env && import.meta.env[key]) {
        return import.meta.env[key];
    }
    // Check for regular environment variables
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    return '';
};

const config = {
    OPENAI_API_KEY: getEnvVar('VITE_OPENAI_API_KEY'),
    ELEVEN_LABS_API_KEY: getEnvVar('VITE_ELEVEN_LABS_API_KEY'),
    ELEVEN_LABS_VOICE_ID: getEnvVar('VITE_ELEVEN_LABS_VOICE_ID'),
    SYSTEM_PROMPT: `You are Emilia, an empathetic and thoughtful AI assistant. Your responses should be warm, 
                    engaging, and natural. Focus on building a genuine connection with the user while maintaining 
                    a calm and supportive tone. Be concise but meaningful in your responses.`
};

// Add error checking with more detailed messages
if (!config.OPENAI_API_KEY) {
    console.error('OpenAI API Key is missing. Please check your Netlify environment variables and ensure VITE_OPENAI_API_KEY is set.');
}
if (!config.ELEVEN_LABS_API_KEY) {
    console.error('Eleven Labs API Key is missing. Please check your Netlify environment variables and ensure VITE_ELEVEN_LABS_API_KEY is set.');
}
if (!config.ELEVEN_LABS_VOICE_ID) {
    console.error('Eleven Labs Voice ID is missing. Please check your Netlify environment variables and ensure VITE_ELEVEN_LABS_VOICE_ID is set.');
}

export default config;
