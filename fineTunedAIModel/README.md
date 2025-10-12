# 911 Call Transcript Fine-tuning

This project fine-tunes a language model on 911 call transcripts to create a custom LLM for use with ElevenLabs or other applications.

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run fine-tuning (THIS IS DONE):**
   ```bash
   python fine_tune_911.py
   ```

3. **Test the model:**
   ```bash
   python test_model.py --interactive
   ```

## Files

- `fine_tune_911.py` - Main fine-tuning script
- `test_model.py` - Test script for the fine-tuned model
- `calls.jsonl` - Your 911 call transcript data
- `config.yaml` - Configuration file with training parameters
- `requirements.txt` - Python dependencies

## Usage

### Basic Fine-tuning
```bash
python fine_tune_911.py --data_file calls.jsonl --epochs 3 --batch_size 4
```

### Custom Model
```bash
python fine_tune_911.py --model_name gpt2-medium --output_dir ./my-911-model
```

### Test the Model
```bash
# Interactive mode
python test_model.py --interactive

# Batch test
python test_model.py
```

## Configuration

Edit `config.yaml` to adjust:
- Model architecture
- Training parameters (epochs, batch size, learning rate)
- Hardware settings
- Output directory

## Model Options

The script supports several base models:
- `microsoft/DialoGPT-medium` (recommended for conversations)
- `microsoft/DialoGPT-small` (faster, smaller)
- `microsoft/DialoGPT-large` (slower, better quality)
- `gpt2` or `gpt2-medium` (original GPT-2)

## Using with ElevenLabs

After fine-tuning, you can:
1. Export the model to ONNX format
2. Use it as a custom voice model
3. Integrate with ElevenLabs API

## Requirements

- Python 3.8+
- 5GB+ free disk space
