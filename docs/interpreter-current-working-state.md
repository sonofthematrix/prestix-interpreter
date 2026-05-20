# Interpreter Current Working State

- werkmap: `rakus/prestix interpreter` (lokale paden kunnen afwijken)
- pagina laadt
- typed input werkt
- speech input werkt
- no-speech is niet meer fatal
- output zichtbaar
- speech output werkt
- ElevenLabs TTS route aanwezig als preferred voice path; browser speechSynthesis blijft fallback
- UI heeft aparte voice overrides voor EN en ID via localStorage
- `/api/interpreter` werkt
- learning module aanwezig
- feedback route aanwezig
- provider chain aanwezig: `local-gpu` (LM Studio/CUDA) when `PRESTIX_SANDBOX_TEXT_PROVIDER=local-gpu`, otherwise OpenAI -> Gemini -> DeepSeek -> Ollama/local -> Tokenizin
- LM Studio envs voor local-gpu: `LM_STUDIO_BASE_URL` en `LM_STUDIO_MODEL` (of `PRESTIX_ASSISTANT_MODEL`)
- Tokenizin active/inactive status zoals nu bekend: inactive; Tokenizin env bestaat alleen als commented placeholders
- ElevenLabs envs verwacht: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` of taal-specifiek `ELEVENLABS_VOICE_ID_EN` en `ELEVENLABS_VOICE_ID_ID`
- huidige blockers: alleen repo-brede typecheck errors buiten deze wijziging
