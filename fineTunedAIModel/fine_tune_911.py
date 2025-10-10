#!/usr/bin/env python3
"""
911 Call Transcript Fine-tuning Script
Fine-tunes a language model on 911 call transcripts for use with ElevenLabs
"""

import json
import torch
from transformers import (
    AutoTokenizer, 
    AutoModelForCausalLM, 
    TrainingArguments, 
    Trainer,
    DataCollatorForLanguageModeling
)
from datasets import Dataset
import argparse
from pathlib import Path

def load_jsonl_data(file_path):
    """Load and parse JSONL data"""
    data = []
    with open(file_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))
    return data

def format_conversation(messages):
    """Format conversation messages into training text"""
    formatted_text = ""
    for message in messages:
        role = message["role"]
        content = message["content"]
        
        if role == "assistant":
            formatted_text += f"911 Operator: {content}\n"
        elif role == "user":
            formatted_text += f"Caller: {content}\n"
    
    return formatted_text.strip()

def prepare_dataset(jsonl_data, tokenizer, max_length=512):
    """Prepare dataset for training"""
    texts = []
    
    for item in jsonl_data:
        if "messages" in item:
            formatted_text = format_conversation(item["messages"])
            texts.append(formatted_text)
    
    # Tokenize the texts
    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            padding=True,
            max_length=max_length,
            return_tensors="pt"
        )
    
    # Create dataset
    dataset = Dataset.from_dict({"text": texts})
    tokenized_dataset = dataset.map(
        tokenize_function,
        batched=True,
        remove_columns=dataset.column_names
    )
    
    return tokenized_dataset

def main():
    parser = argparse.ArgumentParser(description="Fine-tune LLM on 911 call transcripts")
    parser.add_argument("--data_file", default="calls.jsonl", help="Path to JSONL data file")
    parser.add_argument("--model_name", default="microsoft/DialoGPT-medium", help="Base model to fine-tune")
    parser.add_argument("--output_dir", default="./911-fine-tuned-model", help="Output directory for fine-tuned model")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=4, help="Training batch size")
    parser.add_argument("--learning_rate", type=float, default=5e-5, help="Learning rate")
    parser.add_argument("--max_length", type=int, default=512, help="Maximum sequence length")
    
    args = parser.parse_args()
    
    print("Loading data...")
    data = load_jsonl_data(args.data_file)
    print(f"Loaded {len(data)} conversations")
    
    print("Loading tokenizer and model...")
    tokenizer = AutoTokenizer.from_pretrained(args.model_name)
    model = AutoModelForCausalLM.from_pretrained(args.model_name)
    
    # Add padding token if it doesn't exist
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    
    print("Preparing dataset...")
    dataset = prepare_dataset(data, tokenizer, args.max_length)
    
    # Split dataset
    train_size = int(0.8 * len(dataset))
    train_dataset = dataset.select(range(train_size))
    eval_dataset = dataset.select(range(train_size, len(dataset)))
    
    print(f"Training samples: {len(train_dataset)}")
    print(f"Evaluation samples: {len(eval_dataset)}")
    
    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False,  # We're doing causal language modeling, not masked
    )
    
    # Training arguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        overwrite_output_dir=True,
        num_train_epochs=args.epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        warmup_steps=100,
        weight_decay=0.01,
        logging_dir=f"{args.output_dir}/logs",
        logging_steps=10,
        eval_strategy="steps",
        eval_steps=100,
        save_steps=500,
        save_total_limit=2,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        learning_rate=args.learning_rate,
        fp16=torch.cuda.is_available(),  # Use fp16 if GPU available
        dataloader_num_workers=0,
    )
    
    # Initialize trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        data_collator=data_collator,
        tokenizer=tokenizer,
    )
    
    print("Starting training...")
    trainer.train()
    
    print("Saving model...")
    trainer.save_model()
    tokenizer.save_pretrained(args.output_dir)
    
    print(f"Fine-tuned model saved to {args.output_dir}")
    print("You can now use this model with ElevenLabs or other applications!")

if __name__ == "__main__":
    main()
