#!/usr/bin/env python3
"""
Auto-learning script for Prestix Personal Assistant.
Run this in the background to automatically collect conversations
from the web interface and save them for fine-tuning.
"""

import json
import os
import time
from datetime import datetime
from pathlib import Path

DATA_DIR = "/home/sonofthematrix/.THESANDBOX/rakus/prestix interpreter/data"
CONVERSATION_LOG = os.path.join(DATA_DIR, "conversation-log.jsonl")
TRAINING_DATA = os.path.join(DATA_DIR, "training-data.jsonl")

def ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)

def load_conversations():
    """Load all conversations from the log"""
    if not os.path.exists(CONVERSATION_LOG):
        return []
    
    conversations = []
    with open(CONVERSATION_LOG, 'r') as f:
        for line in f:
            if line.strip():
                conversations.append(json.loads(line))
    return conversations

def save_training_example(system, user, assistant):
    """Save a single training example"""
    ensure_dirs()
    
    example = {
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant}
        ],
        "timestamp": datetime.now().isoformat()
    }
    
    with open(TRAINING_DATA, 'a') as f:
        f.write(json.dumps(example) + '\n')
    
    return example

def export_for_finetuning(output_file=None):
    """Export collected data to a file for fine-tuning"""
    if not os.path.exists(TRAINING_DATA):
        print("No training data found yet.")
        return
    
    if output_file is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_file = os.path.join(DATA_DIR, f"training-export-{timestamp}.jsonl")
    
    # Read all examples
    examples = []
    with open(TRAINING_DATA, 'r') as f:
        for line in f:
            if line.strip():
                examples.append(json.loads(line))
    
    # Write to export file
    with open(output_file, 'w') as f:
        for ex in examples:
            f.write(json.dumps(ex) + '\n')
    
    print(f"Exported {len(examples)} training examples to {output_file}")
    return output_file

def show_stats():
    """Show training data statistics"""
    ensure_dirs()
    
    conversations = load_conversations()
    
    training_count = 0
    if os.path.exists(TRAINING_DATA):
        with open(TRAINING_DATA, 'r') as f:
            training_count = sum(1 for line in f if line.strip())
    
    print(f"=== Prestix Assistant Stats ===")
    print(f"Conversations logged: {len(conversations)}")
    print(f"Training examples: {training_count}")
    print(f"Data directory: {DATA_DIR}")
    
    if training_count >= 100:
        print(f"\n✅ Ready for fine-tuning! Run: python scripts/auto_learn.py --export")
    elif training_count >= 50:
        print(f"\n📈 Getting close! {100 - training_count} more examples needed for fine-tuning.")
    else:
        print(f"\n📊 Keep talking! {100 - training_count} more examples needed for fine-tuning.")

def watch_and_learn():
    """Watch conversation log and auto-save training examples"""
    ensure_dirs()
    
    print("=== Prestix Auto-Learn ===")
    print("Watching for conversations...")
    print("Use the web interface to chat with the assistant.")
    print("Good conversations will be saved automatically.\n")
    
    last_size = 0
    system_prompt = "You are a personal AI assistant. Be direct, warm, practical."
    
    while True:
        if os.path.exists(CONVERSATION_LOG):
            current_size = os.path.getsize(CONVERSATION_LOG)
            
            if current_size > last_size:
                # New conversations added
                conversations = load_conversations()
                
                if len(conversations) > 0:
                    # Get the last conversation
                    last = conversations[-1]
                    
                    # Save as training example if it looks good
                    if 'input' in last and 'output' in last:
                        save_training_example(
                            system_prompt,
                            last['input'],
                            last['output']
                        )
                        print(f"💾 Saved: {last['input'][:50]}...")
                
                last_size = current_size
        
        time.sleep(5)  # Check every 5 seconds

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == "--export":
            export_for_finetuning()
        elif sys.argv[1] == "--stats":
            show_stats()
        elif sys.argv[1] == "--watch":
            watch_and_learn()
        else:
            print("Usage:")
            print("  python auto_learn.py --watch   # Watch and auto-save")
            print("  python auto_learn.py --stats   # Show statistics")
            print("  python auto_learn.py --export  # Export for fine-tuning")
    else:
        show_stats()
