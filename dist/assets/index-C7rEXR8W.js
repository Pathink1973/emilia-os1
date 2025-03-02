(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))t(e);new MutationObserver(e=>{for(const o of e)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&t(i)}).observe(document,{childList:!0,subtree:!0});function s(e){const o={};return e.integrity&&(o.integrity=e.integrity),e.referrerPolicy&&(o.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?o.credentials="include":e.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function t(e){if(e.ep)return;e.ep=!0;const o=s(e);fetch(e.href,o)}})();const g=()=>{const u=[];if(u.push("VITE_OPENAI_API_KEY"),console.error("OpenAI API Key is missing. Please check your Netlify environment variables and ensure VITE_OPENAI_API_KEY is set."),u.push("VITE_ELEVEN_LABS_API_KEY"),console.error("Eleven Labs API Key is missing. Please check your Netlify environment variables and ensure VITE_ELEVEN_LABS_API_KEY is set."),u.push("VITE_ELEVEN_LABS_VOICE_ID"),console.error("Eleven Labs Voice ID is missing. Please check your Netlify environment variables and ensure VITE_ELEVEN_LABS_VOICE_ID is set."),u.length>0){const r=`Missing environment variables: ${u.join(", ")}. Please check your .env file or Netlify environment variables.`;document.querySelector(".status").textContent=r}};g();const c={OPENAI_API_KEY:"",ELEVEN_LABS_API_KEY:"",ELEVEN_LABS_VOICE_ID:"",SYSTEM_PROMPT:`You are Emilia, an empathetic and thoughtful AI assistant. Your responses should be warm, 
                    engaging, and natural. Focus on building a genuine connection with the user while maintaining 
                    a calm and supportive tone. Be concise but meaningful in your responses.`};class E{constructor(){this.micButton=document.getElementById("micButton"),this.status=document.getElementById("status"),this.messagesContainer=document.getElementById("messages"),this.isRecording=!1,this.mediaRecorder=null,this.audioChunks=[],this.silenceTimer=null,this.SILENCE_THRESHOLD=3e3,this.conversationHistory=[{role:"system",content:c.SYSTEM_PROMPT}],this.initializeEventListeners(),this.checkMicrophonePermissions()}initializeEventListeners(){this.micButton.addEventListener("click",()=>this.toggleRecording())}async checkMicrophonePermissions(){try{if(!window.isSecureContext){this.status.textContent="Microphone access requires HTTPS",this.micButton.disabled=!0;return}if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia){this.status.textContent="Your browser does not support microphone access",this.micButton.disabled=!0;return}(await navigator.permissions.query({name:"microphone"})).state==="denied"?(this.status.textContent="Microphone access was denied. Please enable it in your browser settings.",this.micButton.disabled=!0):(this.status.textContent="Click the microphone to start",this.micButton.disabled=!1)}catch(r){console.error("Error checking microphone permissions:",r),this.status.textContent="Error checking microphone permissions",this.micButton.disabled=!0}}async toggleRecording(){this.isRecording?await this.stopRecording():await this.startRecording()}async startRecording(){try{const r=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!0,noiseSuppression:!0,channelCount:1,sampleRate:44100}});this.mediaRecorder=new MediaRecorder(r,{mimeType:"audio/webm;codecs=opus"}),this.audioChunks=[],this.mediaRecorder.addEventListener("dataavailable",s=>{s.data.size>0&&this.audioChunks.push(s.data)}),this.mediaRecorder.addEventListener("stop",async()=>{const s=new Blob(this.audioChunks,{type:"audio/webm;codecs=opus"});await this.processAudio(s),r.getTracks().forEach(t=>t.stop())}),this.mediaRecorder.start(),this.isRecording=!0,this.micButton.classList.add("active"),this.status.textContent="Listening...",this.startSilenceDetection(r)}catch(r){console.error("Error accessing microphone:",r),r.name==="NotAllowedError"?this.status.textContent="Microphone access denied. Please allow access in your browser settings.":this.status.textContent="Error accessing microphone",this.micButton.disabled=!0,await this.checkMicrophonePermissions()}}async stopRecording(){this.mediaRecorder&&this.isRecording&&(this.mediaRecorder.stop(),this.isRecording=!1,this.micButton.classList.remove("active"),this.status.textContent="Processing...")}startSilenceDetection(r){const s=new AudioContext,t=s.createMediaStreamSource(r),e=s.createAnalyser();e.fftSize=2048,t.connect(e);const o=e.frequencyBinCount,i=new Uint8Array(o);let n=null;const h=()=>{if(!this.isRecording)return;if(e.getByteFrequencyData(i),i.reduce((d,l)=>d+l)/o<10){if(!n)n=Date.now();else if(Date.now()-n>this.SILENCE_THRESHOLD){this.stopRecording();return}}else n=null;requestAnimationFrame(h)};h()}async processAudio(r){try{const s=await this.convertToWAV(r),t=await this.getTranscription(s);if(t){this.addMessage(t,"user");const e=await this.getAIResponse(t);if(e){const o=await this.textToSpeech(e);o&&await new Audio(o).play()}}this.status.textContent="Click the microphone to start"}catch(s){console.error("Error processing audio:",s),this.status.textContent="Error processing audio. Please try again."}}async convertToWAV(r){const s=await r.arrayBuffer(),e=await new(window.AudioContext||window.webkitAudioContext)().decodeAudioData(s),o=this.audioBufferToWAV(e);return new Blob([o],{type:"audio/wav"})}audioBufferToWAV(r){const s=r.numberOfChannels,t=r.sampleRate,e=1,o=16,i=o/8,n=s*i,h=this.interleave(r),p=h.length*i,d=44,l=d+p,m=new ArrayBuffer(l),a=new DataView(m);return this.writeString(a,0,"RIFF"),a.setUint32(4,l-8,!0),this.writeString(a,8,"WAVE"),this.writeString(a,12,"fmt "),a.setUint32(16,16,!0),a.setUint16(20,e,!0),a.setUint16(22,s,!0),a.setUint32(24,t,!0),a.setUint32(28,t*n,!0),a.setUint16(32,n,!0),a.setUint16(34,o,!0),this.writeString(a,36,"data"),a.setUint32(40,p,!0),this.floatTo16BitPCM(a,d,h),m}writeString(r,s,t){for(let e=0;e<t.length;e++)r.setUint8(s+e,t.charCodeAt(e))}interleave(r){const s=r.numberOfChannels,t=r.length*s,e=new Float32Array(t);for(let o=0;o<s;o++){const i=r.getChannelData(o);for(let n=0;n<r.length;n++)e[n*s+o]=i[n]}return e}floatTo16BitPCM(r,s,t){for(let e=0;e<t.length;e++,s+=2){const o=Math.max(-1,Math.min(1,t[e]));r.setInt16(s,o<0?o*32768:o*32767,!0)}}async getTranscription(r){var s;try{if(!c.OPENAI_API_KEY)throw this.status.textContent="Error: OpenAI API Key is not configured",new Error("OpenAI API Key is not configured");const t=new FormData;t.append("file",r,"audio.wav"),t.append("model","whisper-1"),t.append("language","en");const e=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${c.OPENAI_API_KEY}`},body:t});if(!e.ok){const n=((s=(await e.json().catch(()=>({}))).error)==null?void 0:s.message)||e.statusText;throw this.status.textContent=`Error: ${n}`,new Error(`OpenAI API error: ${e.status} - ${n}`)}const o=await e.json();if(!o||!o.text)throw this.status.textContent="Error: No transcription received",new Error("No transcription received from OpenAI");return this.status.textContent="Transcription received, generating response...",o.text}catch(t){throw console.error("Transcription error:",t),this.status.textContent.startsWith("Error:")||(this.status.textContent="Error: Failed to transcribe audio. Please try again."),t}}addMessage(r,s){const t=document.createElement("div");t.classList.add("message",s),t.textContent=r,this.messagesContainer.appendChild(t),this.messagesContainer.scrollTop=this.messagesContainer.scrollHeight}async getAIResponse(r){var s;try{if(!c.OPENAI_API_KEY)throw this.status.textContent="Error: OpenAI API Key is not configured",new Error("OpenAI API Key is not configured");this.conversationHistory.push({role:"user",content:r});const t=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${c.OPENAI_API_KEY}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-4",messages:this.conversationHistory,temperature:.7,max_tokens:150})});if(!t.ok){const n=((s=(await t.json().catch(()=>({}))).error)==null?void 0:s.message)||t.statusText;throw this.status.textContent=`Error: ${n}`,new Error(`OpenAI API error: ${t.status} - ${n}`)}const e=await t.json();if(!e.choices||!e.choices[0]||!e.choices[0].message)throw this.status.textContent="Error: Invalid response from AI",new Error("Invalid response from OpenAI");const o=e.choices[0].message.content;return this.conversationHistory.push({role:"assistant",content:o}),this.addMessage(o,"assistant"),this.status.textContent="Converting response to speech...",o}catch(t){throw console.error("AI Response error:",t),this.status.textContent.startsWith("Error:")||(this.status.textContent="Error: Failed to get AI response. Please try again."),t}}async textToSpeech(r){try{if(!c.ELEVEN_LABS_API_KEY||!c.ELEVEN_LABS_VOICE_ID)throw this.status.textContent="Error: Eleven Labs credentials are not configured",new Error("Eleven Labs credentials are not configured");const s=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${c.ELEVEN_LABS_VOICE_ID}`,{method:"POST",headers:{Accept:"audio/mpeg","xi-api-key":c.ELEVEN_LABS_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({text:r,model_id:"eleven_monolingual_v1",voice_settings:{stability:.5,similarity_boost:.5}})});if(!s.ok){const e=await s.text();throw this.status.textContent=`Error: ${e}`,new Error(`Eleven Labs API error: ${s.status} - ${e}`)}const t=await s.blob();if(!t||t.size===0)throw this.status.textContent="Error: No audio received",new Error("No audio received from Eleven Labs");return this.status.textContent="Playing audio response...",URL.createObjectURL(t)}catch(s){throw console.error("Text-to-speech error:",s),this.status.textContent.startsWith("Error:")||(this.status.textContent="Error: Failed to convert text to speech. Please try again."),s}}}document.addEventListener("DOMContentLoaded",()=>{new E});
