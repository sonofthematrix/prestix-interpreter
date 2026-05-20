# Prestix Personal Assistant Setup

## Overzicht
Hermes 3B draait via LM Studio op je RTX 3060 als personal assistant.
CUDA wordt door LM Studio afgehandeld; Prestix praat er alleen via HTTP mee.

## Status
- [x] Model: Hermes 3B in LM Studio
- [x] GPU: RTX 3060 Laptop (6GB VRAM)
- [x] Speed: ~10 tok/sec
- [x] Guardrails: minimaal, non-blocking
- [x] Training data pipeline: klaar
- [ ] Fine-tuning: template klaar, wacht op meer data

## Configuratie

### .env.local
```env
PRESTIX_SANDBOX_TEXT_PROVIDER=local-gpu
LM_STUDIO_BASE_URL=http://127.0.0.1:1234/v1
PRESTIX_ASSISTANT_MODEL=Hermes 3B
```

Als je model in LM Studio anders heet, zet `LM_STUDIO_MODEL` of `PRESTIX_ASSISTANT_MODEL` op exact die alias.
Als je niets invult, probeert Prestix eerst de expliciete env en daarna `GET /v1/models` van LM Studio.

### Provider fallback chain
1. **local-gpu** (LM Studio / CUDA Hermes 3B) - Primary
2. **openai** (gpt-4.1) - Fallback
3. **gemini** (flash-2.0) - Fallback
4. **deepseek** - Fallback
5. **ollama/local** - Fallback als geselecteerd

## Guardrails
- `no-credentials` - Geen API keys in output (block)
- `no-live-execution` - Geen live trading advies (block)
- `verify-before-claim` - Flag onzekere claims (warn)
- `prefer-action` - Doe iets nuttigs (info)
- `concise-unless-asked` - Kort en bondig (info)

## Fine-tuning

### Stap 1: Data verzamelen
Conversaties worden automatisch opgeslagen in:
- `data/interpreter-learning.json` (learning entries)
- `data/conversation-log.jsonl` (conversation history)

### Stap 2: Exporteren
```typescript
import { saveTrainingData } from "@/lib/interpreter/trainingDataCollector";

const chatml = saveTrainingData(examples, "chatml");
const jsonl = saveTrainingData(examples, "jsonl");
```

### Stap 3: Fine-tunen
Gebruik `scripts/finetune_template.py` in Google Colab of lokaal.

```bash
# In Colab:
!pip install unsloth transformers datasets trl
!python finetune_template.py
```

### Stap 4: Model converteren en laden
Na training:
```bash
# Merge LoRA adapters naar GGUF
python scripts/convert_to_gguf.py --input prestix-assistant-lora-final --output prestix-assistant-Q4_K_M.gguf
```

Laad daarna de GGUF in LM Studio en geef hem een naam zoals `Hermes 3B` of `Prestix Assistant`.

### Stap 5: Updaten
```env
PRESTIX_ASSISTANT_MODEL=Hermes 3B
# of
LM_STUDIO_MODEL=Hermes 3B
```

## Bestanden
- `src/lib/interpreter/localGpuProvider.ts` - GPU inference via LM Studio
- `src/lib/interpreter/guardrails.ts` - Safety rules
- `src/lib/interpreter/trainingDataCollector.ts` - Data pipeline
- `scripts/finetune_template.py` - Unsloth training

## Volgende stappen
1. Gebruik de assistant en laat learning entries groeien
2. Exporteer training data na ~100 conversaties
3. Fine-tune in Colab (gratis T4 GPU)
4. Test het getrainde model
5. Herhaal met meer data
