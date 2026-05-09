#!/usr/bin/env python3
import argparse
import json
import os
import sys

from faster_whisper import WhisperModel


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio_path")
    parser.add_argument("--language", default="")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    model_name = os.environ.get("FASTER_WHISPER_MODEL", "base")
    device = os.environ.get("FASTER_WHISPER_DEVICE", "cpu")
    compute_type = os.environ.get("FASTER_WHISPER_COMPUTE_TYPE", "int8")
    beam_size = int(os.environ.get("FASTER_WHISPER_BEAM_SIZE", "8"))
    best_of = int(os.environ.get("FASTER_WHISPER_BEST_OF", "8"))
    patience = float(os.environ.get("FASTER_WHISPER_PATIENCE", "1.2"))
    temperature = float(os.environ.get("FASTER_WHISPER_TEMPERATURE", "0"))
    initial_prompt = os.environ.get("FASTER_WHISPER_INITIAL_PROMPT", "").strip()
    download_root = os.environ.get(
        "FASTER_WHISPER_DOWNLOAD_ROOT",
        os.path.join(os.path.expanduser("~"), ".cache", "faster-whisper"),
    )

    model = WhisperModel(
        model_name,
        device=device,
        compute_type=compute_type,
        download_root=download_root,
    )

    segments, info = model.transcribe(
        args.audio_path,
        language=args.language or None,
        vad_filter=True,
        beam_size=beam_size,
        best_of=best_of,
        patience=patience,
        temperature=temperature,
        condition_on_previous_text=False,
        initial_prompt=initial_prompt or None,
    )

    text_parts = []
    for segment in segments:
        chunk = (segment.text or "").strip()
        if chunk:
            text_parts.append(chunk)

    payload = {
        "text": " ".join(text_parts).strip(),
        "language": getattr(info, "language", "unknown") or "unknown",
    }
    sys.stdout.write(json.dumps(payload, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
