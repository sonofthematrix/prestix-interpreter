#!/usr/bin/env python3
"""
Fine-tuning template for Hermes-3-Llama-3.2-3B using Unsloth.
Run this in Google Colab or locally with sufficient VRAM.
"""

# Install dependencies (run once)
# !pip install unsloth transformers datasets trl

from unsloth import FastLanguageModel
import torch
from datasets import load_dataset
from trl import SFTTrainer
from transformers import TrainingArguments

# Configuration
MODEL_NAME = "NousResearch/Hermes-3-Llama-3.2-3B"
MAX_SEQ_LENGTH = 4096
LORA_RANK = 16
BATCH_SIZE = 2
GRADIENT_ACCUMULATION_STEPS = 4
NUM_EPOCHS = 3
LEARNING_RATE = 2e-4

# Load model with Unsloth (4-bit quantization for memory efficiency)
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL_NAME,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=torch.float16,
    load_in_4bit=True,
)

# Add LoRA adapters
model = FastLanguageModel.get_peft_model(
    model,
    r=LORA_RANK,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                   "gate_proj", "up_proj", "down_proj"],
    lora_alpha=LORA_RANK * 2,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=3407,
)

# Load your training data
# Format: JSONL with {"messages": [{"role": "system|user|assistant", "content": "..."}]}
# dataset = load_dataset("json", data_files="prestix_conversations.jsonl", split="train")

# For now, use a placeholder dataset
dataset = load_dataset("yahma/alpaca-cleaned", split="train")

def format_prompt(examples):
    """Convert to ChatML format for Hermes-3"""
    texts = []
    for instruction, input_text, output in zip(
        examples["instruction"],
        examples["input"],
        examples["output"]
    ):
        if input_text:
            prompt = f"<|im_start|>user\n{instruction}\n{input_text}<|im_end|>\n<|im_start|>assistant\n{output}<|im_end|>"
        else:
            prompt = f"<|im_start|>user\n{instruction}<|im_end|>\n<|im_start|>assistant\n{output}<|im_end|>"
        texts.append(prompt)
    return {"text": texts}

dataset = dataset.map(format_prompt, batched=True)

# Training arguments
training_args = TrainingArguments(
    per_device_train_batch_size=BATCH_SIZE,
    gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
    warmup_steps=10,
    max_steps=100,  # Adjust based on dataset size
    learning_rate=LEARNING_RATE,
    fp16=not torch.cuda.is_bf16_supported(),
    bf16=torch.cuda.is_bf16_supported(),
    logging_steps=10,
    optim="adamw_8bit",
    weight_decay=0.01,
    lr_scheduler_type="linear",
    seed=3407,
    output_dir="prestix-assistant-lora",
    report_to="none",  # Disable wandb/tensorboard
)

# Initialize trainer
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    dataset_num_proc=2,
    packing=False,  # Can enable for shorter sequences
    args=training_args,
)

# Train!
trainer.train()

# Save LoRA adapters
trainer.save_model("prestix-assistant-lora-final")

# Merge and save full model (optional)
# model.save_pretrained_merged("prestix-assistant-merged", tokenizer, save_method="merged_16bit")

print("Training complete! LoRA adapters saved to prestix-assistant-lora-final/")
