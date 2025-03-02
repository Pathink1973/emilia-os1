(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))t(e);new MutationObserver(e=>{for(const o of e)if(o.type==="childList")for(const a of o.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&t(a)}).observe(document,{childList:!0,subtree:!0});function s(e){const o={};return e.integrity&&(o.integrity=e.integrity),e.referrerPolicy&&(o.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?o.credentials="include":e.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function t(e){if(e.ep)return;e.ep=!0;const o=s(e);fetch(e.href,o)}})();const l=()=>{const c=[];if(c.push("VITE_OPENAI_API_KEY"),console.error("OpenAI API Key is missing. Please check your Netlify environment variables and ensure VITE_OPENAI_API_KEY is set."),c.push("VITE_ELEVEN_LABS_API_KEY"),console.error("Eleven Labs API Key is missing. Please check your Netlify environment variables and ensure VITE_ELEVEN_LABS_API_KEY is set."),c.push("VITE_ELEVEN_LABS_VOICE_ID"),console.error("Eleven Labs Voice ID is missing. Please check your Netlify environment variables and ensure VITE_ELEVEN_LABS_VOICE_ID is set."),c.length>0){const r=`Missing environment variables: ${c.join(", ")}. Please check your .env file or Netlify environment variables.`;document.querySelector(".status").textContent=r}};l();const n={OPENAI_API_KEY:"",ELEVEN_LABS_API_KEY:"",ELEVEN_LABS_VOICE_ID:"",SYSTEM_PROMPT:`You are Emilia, an empathetic and thoughtful AI assistant. Your responses should be warm, 
                    engaging, and natural. Focus on building a genuine connection with the user while maintaining 
                    a calm and supportive tone. Be concise but meaningful in your responses.`};class p{constructor(){this.micButton=document.getElementById("micButton"),this.status=document.getElementById("status"),this.messagesContainer=document.getElementById("messages"),this.isRecording=!1,this.mediaRecorder=null,this.audioChunks=[],this.silenceTimer=null,this.SILENCE_THRESHOLD=3e3,this.conversationHistory=[{role:"system",content:n.SYSTEM_PROMPT}],this.initializeEventListeners(),this.checkMicrophonePermissions()}initializeEventListeners(){this.micButton.addEventListener("click",()=>this.toggleRecording())}async checkMicrophonePermissions(){try{if(!window.isSecureContext){this.status.textContent="Microphone access requires HTTPS",this.micButton.disabled=!0;return}if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){this.status.textContent="Your browser does not support microphone access",this.micButton.disabled=!0;return}(await navigator.permissions.query({name:"microphone"})).state==="denied"?(this.status.textContent="Microphone access was denied. Please enable it in your browser settings.",this.micButton.disabled=!0):(this.status.textContent="Click the microphone to start",this.micButton.disabled=!1)}catch(r){console.error("Error checking microphone permissions:",r),this.status.textContent="Error checking microphone permissions",this.micButton.disabled=!0}}async toggleRecording(){this.isRecording?await this.stopRecording():await this.startRecording()}async startRecording(){try{const r=await navigator.mediaDevices.getUserMedia({audio:!0});this.mediaRecorder=new MediaRecorder(r),this.audioChunks=[],this.mediaRecorder.ondataavailable=s=>{this.audioChunks.push(s.data)},this.mediaRecorder.onstop=async()=>{const s=new Blob(this.audioChunks,{type:"audio/wav"});await this.processAudio(s)},this.mediaRecorder.start(),this.isRecording=!0,this.micButton.classList.add("active"),this.status.textContent="Listening...",this.startSilenceDetection(r)}catch(r){console.error("Error accessing microphone:",r),r.name==="NotAllowedError"?this.status.textContent="Microphone access denied. Please allow access in your browser settings.":this.status.textContent="Error accessing microphone",this.micButton.disabled=!0,await this.checkMicrophonePermissions()}}async stopRecording(){this.mediaRecorder&&this.isRecording&&(this.mediaRecorder.stop(),this.isRecording=!1,this.micButton.classList.remove("active"),this.status.textContent="Processing...",this.mediaRecorder.stream.getTracks().forEach(r=>r.stop()))}startSilenceDetection(r){const s=new AudioContext,t=s.createMediaStreamSource(r),e=s.createAnalyser();e.fftSize=2048,t.connect(e);const o=e.frequencyBinCount,a=new Uint8Array(o);let i=null;const h=()=>{if(!this.isRecording)return;if(e.getByteFrequencyData(a),a.reduce((u,d)=>u+d)/o<10){if(!i)i=Date.now();else if(Date.now()-i>this.SILENCE_THRESHOLD){this.stopRecording();return}}else i=null;requestAnimationFrame(h)};h()}async processAudio(r){try{const s=await this.getTranscription(r);this.addMessage(s,"user");const t=await this.getAIResponse(s),e=await this.textToSpeech(t);await this.playAudioResponse(e),this.status.textContent="Click the microphone to start"}catch(s){console.error("Error processing audio:",s),this.status.textContent="Error processing audio"}}async getTranscription(r){var s;try{if(!n.OPENAI_API_KEY)throw this.status.textContent="Error: OpenAI API Key is not configured",new Error("OpenAI API Key is not configured");const t=new FormData;t.append("file",r,"audio.wav"),t.append("model","whisper-1");const e=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${n.OPENAI_API_KEY}`},body:t});if(!e.ok){const i=((s=(await e.json().catch(()=>({}))).error)==null?void 0:s.message)||e.statusText;throw this.status.textContent=`Error: ${i}`,new Error(`OpenAI API error: ${e.status} - ${i}`)}const o=await e.json();if(!o||!o.text)throw this.status.textContent="Error: No transcription received",new Error("No transcription received from OpenAI");return this.status.textContent="Transcription received, generating response...",o.text}catch(t){throw console.error("Transcription error:",t),this.status.textContent.startsWith("Error:")||(this.status.textContent="Error: Failed to transcribe audio. Please try again."),t}}async getAIResponse(r){var s;try{if(!n.OPENAI_API_KEY)throw this.status.textContent="Error: OpenAI API Key is not configured",new Error("OpenAI API Key is not configured");this.conversationHistory.push({role:"user",content:r});const t=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${n.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4",messages:this.conversationHistory,temperature:.7,max_tokens:150})});if(!t.ok){const i=((s=(await t.json().catch(()=>({}))).error)==null?void 0:s.message)||t.statusText;throw this.status.textContent=`Error: ${i}`,new Error(`OpenAI API error: ${t.status} - ${i}`)}const e=await t.json();if(!e.choices||!e.choices[0]||!e.choices[0].message)throw this.status.textContent="Error: Invalid response from AI",new Error("Invalid response from OpenAI");const o=e.choices[0].message.content;return this.conversationHistory.push({role:"assistant",content:o}),this.addMessage(o,"assistant"),this.status.textContent="Converting response to speech...",o}catch(t){throw console.error("AI Response error:",t),this.status.textContent.startsWith("Error:")||(this.status.textContent="Error: Failed to get AI response. Please try again."),t}}async textToSpeech(r){try{if(!n.ELEVEN_LABS_API_KEY||!n.ELEVEN_LABS_VOICE_ID)throw this.status.textContent="Error: Eleven Labs credentials are not configured",new Error("Eleven Labs credentials are not configured");const s=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${n.ELEVEN_LABS_VOICE_ID}`,{method:"POST",headers:{Accept:"audio/mpeg","xi-api-key":n.ELEVEN_LABS_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({text:r,model_id:"eleven_monolingual_v1",voice_settings:{stability:.5,similarity_boost:.5}})});if(!s.ok){const e=await s.text();throw this.status.textContent=`Error: ${e}`,new Error(`Eleven Labs API error: ${s.status} - ${e}`)}const t=await s.blob();if(!t||t.size===0)throw this.status.textContent="Error: No audio received",new Error("No audio received from Eleven Labs");return this.status.textContent="Playing audio response...",URL.createObjectURL(t)}catch(s){throw console.error("Text-to-speech error:",s),this.status.textContent.startsWith("Error:")||(this.status.textContent="Error: Failed to convert text to speech. Please try again."),s}}async playAudioResponse(r){return new Promise((s,t)=>{const e=new Audio(r);e.onended=s,e.onerror=t,e.play()})}addMessage(r,s){const t=document.createElement("div");t.classList.add("message",s),t.textContent=r,this.messagesContainer.appendChild(t),this.messagesContainer.scrollTop=this.messagesContainer.scrollHeight}}document.addEventListener("DOMContentLoaded",()=>{new p});
