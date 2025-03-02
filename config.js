const checkEnvironmentVariables = () => {
    const missingVars = [];
    
    if (!import.meta.env.VITE_OPENAI_API_KEY) {
        missingVars.push('VITE_OPENAI_API_KEY');
        console.error('OpenAI API Key is missing. Please check your Netlify environment variables and ensure VITE_OPENAI_API_KEY is set.');
    }
    
    if (!import.meta.env.VITE_ELEVEN_LABS_API_KEY) {
        missingVars.push('VITE_ELEVEN_LABS_API_KEY');
        console.error('Eleven Labs API Key is missing. Please check your Netlify environment variables and ensure VITE_ELEVEN_LABS_API_KEY is set.');
    }
    
    if (!import.meta.env.VITE_ELEVEN_LABS_VOICE_ID) {
        missingVars.push('VITE_ELEVEN_LABS_VOICE_ID');
        console.error('Eleven Labs Voice ID is missing. Please check your Netlify environment variables and ensure VITE_ELEVEN_LABS_VOICE_ID is set.');
    }
    
    if (missingVars.length > 0) {
        const message = `Missing environment variables: ${missingVars.join(', ')}. Please check your .env file or Netlify environment variables.`;
        document.querySelector('.status').textContent = message;
    }
};

// Run check when the module loads
checkEnvironmentVariables();

const config = {
    OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY || '',
    ELEVEN_LABS_API_KEY: import.meta.env.VITE_ELEVEN_LABS_API_KEY || '',
    ELEVEN_LABS_VOICE_ID: import.meta.env.VITE_ELEVEN_LABS_VOICE_ID || '',
    SYSTEM_PROMPT: `You are Emilia, an empathetic and thoughtful AI assistant. Your responses should be warm, 
                    engaging, and natural. Focus on building a genuine connection with the user while maintaining 
                    a calm and supportive tone. Be concise but meaningful in your responses.`
};

export default config;
