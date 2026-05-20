#!/usr/bin/env python3
"""
Terminal-based training script for Prestix Personal Assistant.
Collects data and prepares for fine-tuning.
"""

import json
import os
from datetime import datetime

DATA_DIR = "/home/sonofthematrix/.THESANDBOX/rakus/prestix interpreter/data"
MODEL_PATH = "/home/sonofthematrix/models/Hermes-3-Llama-3.2-3B.Q4_K_M.gguf"

def load_learning_data():
    """Load existing learning entries from Prestix"""
    learning_file = os.path.join(DATA_DIR, "interpreter-learning.json")
    if os.path.exists(learning_file):
        with open(learning_file) as f:
            return json.load(f)
    return {"items": []}

def create_training_example(system_prompt, user_msg, assistant_msg):
    """Create a training example in ChatML format"""
    return {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_msg},
            {"role": "assistant", "content": assistant_msg}
        ]
    }

def export_training_data(examples, output_file):
    """Export to JSONL format for fine-tuning"""
    with open(output_file, 'w') as f:
        for ex in examples:
            f.write(json.dumps(ex) + '\n')
    print(f"Exported {len(examples)} examples to {output_file}")

def interactive_training_session():
    """Interactive terminal session to collect training data"""
    from llama_cpp import Llama
    
    print("=== Prestix Personal Assistant Training ===\n")
    print("Loading model...")
    
    llm = Llama(
        model_path=MODEL_PATH,
        n_gpu_layers=35,
        n_ctx=4096,
        verbose=False
    )
    
    print("Model loaded! Let's collect training data.\n")
    print("Type 'quit' to exit, 'save' to export data.\n")
    
    system_prompt = "You are a personal AI assistant. Be direct, warm, practical."
    examples = []
    
    while True:
        user_input = input("You: ").strip()
        
        if user_input.lower() == 'quit':
            break
        
        if user_input.lower() == 'save':
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = os.path.join(DATA_DIR, f"training_data_{timestamp}.jsonl")
            export_training_data(examples, output_file)
            continue
        
        if not user_input:
            continue
        
        # Generate response
        prompt = f"<|im_start|>system\n{system_prompt}<|im_end|>\n<|im_start|>user\n{user_input}<|im_end|>\n<|im_start|>assistant\n"
        
        output = llm(prompt, max_tokens=200, temperature=0.7, stop=["<|im_end|>"])
        response = output['choices'][0]['text'].strip()
        
        print(f"Assistant: {response}\n")
        
        # Ask if this is good training data
        feedback = input("Good example? (y/n/skip): ").strip().lower()
        
        if feedback == 'y':
            examples.append(create_training_example(system_prompt, user_input, response))
            print(f"Saved! Total examples: {len(examples)}\n")
        elif feedback == 'n':
            # Ask for correction
            correction = input("What should the response be? ").strip()
            if correction:
                examples.append(create_training_example(system_prompt, user_input, correction))
                print(f"Saved with correction! Total examples: {len(examples)}\n")
    
    if examples:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(DATA_DIR, f"training_data_{timestamp}.jsonl")
        export_training_data(examples, output_file)
    
    print("Training session complete!")

def quick_test():
    """Quick test of the assistant"""
    from llama_cpp import Llama
    
    print("=== Quick Test ===\n")
    
    llm = Llama(
        model_path=MODEL_PATH,
        n_gpu_layers=35,
        n_ctx=4096,
        verbose=False
    )
    
    test_prompts = [
        "Hoe gaat het?",
        "Wat is de hoofdstad van Indonesië?",
        "Kun je me helpen met coderen?",
        "Terjemahkan: 'I want to book a room'",
    ]
    
    for prompt in test_prompts:
        full_prompt = f"<|im_start|>system\nYou are a personal AI assistant. Be direct, warm, practical.\nYou can speak Dutch, English, and Indonesian.\nIf asked to translate, provide natural spoken translation.\nOtherwise, reply in the same language as the user.\n<|im_end|>\n<|im_start|>user\n{prompt}<|im_end|>\n<|im_start|>assistant\n"
        
        output = llm(full_prompt, max_tokens=100, temperature=0.7, stop=["<|im_end|>"])
        response = output['choices'][0]['text'].strip()
        
        print(f"User: {prompt}")
        print(f"Assistant: {response}\n")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "--train":
        interactive_training_session()
    elif len(sys.argv) > 1 and sys.argv[1] == "--test":
        quick_test()
    else:
        print("Usage:")
        print("  python train_assistant.py --test    # Quick test")
        print("  python train_assistant.py --train   # Interactive training")
