#!/usr/bin/env python3
"""
Test script for the fine-tuned 911 model
"""

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import argparse

def load_model(model_path):
    """Load the fine-tuned model and tokenizer"""
    print(f"Loading model from {model_path}...")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForCausalLM.from_pretrained(model_path)
    
    if torch.cuda.is_available():
        model = model.cuda()
        print("Using GPU")
    else:
        print("Using CPU")
    
    return model, tokenizer

def generate_response(model, tokenizer, prompt, max_length=200, temperature=0.7):
    """Generate a response from the model"""
    # Format the prompt
    formatted_prompt = f"Caller: {prompt}\n911 Operator:"
    
    # Tokenize input
    inputs = tokenizer.encode(formatted_prompt, return_tensors="pt")
    
    if torch.cuda.is_available():
        inputs = inputs.cuda()
    
    # Generate response
    with torch.no_grad():
        outputs = model.generate(
            inputs,
            max_length=inputs.shape[1] + max_length,
            temperature=temperature,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id,
            no_repeat_ngram_size=2
        )
    
    # Decode response
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    # Extract just the 911 operator's response
    if "911 Operator:" in response:
        operator_response = response.split("911 Operator:")[-1].strip()
        return operator_response
    else:
        return response

def main():
    parser = argparse.ArgumentParser(description="Test the fine-tuned 911 model")
    parser.add_argument("--model_path", default="./911-fine-tuned-model", help="Path to fine-tuned model")
    parser.add_argument("--interactive", action="store_true", help="Run in interactive mode")
    
    args = parser.parse_args()
    
    # Load model
    model, tokenizer = load_model(args.model_path)
    
    if args.interactive:
        print("\n=== 911 Call Simulator ===")
        print("Type your emergency message and press Enter.")
        print("Type 'quit' to exit.\n")
        
        while True:
            user_input = input("Caller: ").strip()
            
            if user_input.lower() in ['quit', 'exit', 'q']:
                break
            
            if user_input:
                response = generate_response(model, tokenizer, user_input)
                print(f"911 Operator: {response}\n")
    else:
        # Test with some sample inputs
        test_cases = [
            "There's a fire in my house!",
            "Someone broke into my car",
            "I need an ambulance, I'm having chest pain",
            "There's a suspicious person outside my window",
            "I heard gunshots in my neighborhood"
        ]
        
        print("\n=== Testing Fine-tuned Model ===\n")
        
        for test_input in test_cases:
            print(f"Caller: {test_input}")
            response = generate_response(model, tokenizer, test_input)
            print(f"911 Operator: {response}\n")
            print("-" * 50)

if __name__ == "__main__":
    main()
