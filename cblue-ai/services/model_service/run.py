import torch
import socket
import json
import os
from transformers import AutoModelForCausalLM, AutoTokenizer
from pathlib import Path

class ModelService:
    def __init__(self, model_path: str, socket_path: str):
        self.socket_path = socket_path
        print(f"Loading OpenThaiGPT 14B from {model_path}...")
        
        torch.cuda.set_per_process_memory_fraction(0.95)
        self.device = torch.device("cuda:0")
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_path)
        self.model = AutoModelForCausalLM.from_pretrained(
            model_path,
            torch_dtype=torch.float32,
            device_map="auto",
            low_cpu_mem_usage=True
        )
        self.model.eval()
        print("Model loaded successfully")
    
    def generate(self, prompt: str, max_tokens: int = 512) -> str:
        with torch.no_grad():
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=0.7,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
            return self.tokenizer.decode(outputs[0], skip_special_tokens=True)
    
    def stream_generate(self, prompt: str, max_tokens: int = 512):
        with torch.no_grad():
            inputs = self.tokenizer(prompt, return_tensors="pt").to(self.device)
            for token_id in self.model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                temperature=0.7,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
                return_dict_in_generate=True,
                output_scores=True
            ).sequences[0]:
                yield self.tokenizer.decode([token_id], skip_special_tokens=True)
    
    def serve(self):
        if os.path.exists(self.socket_path):
            os.remove(self.socket_path)
        
        server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        server.bind(self.socket_path)
        server.listen(1)
        os.chmod(self.socket_path, 0o666)
        
        print(f"Model service listening on {self.socket_path}")
        
        while True:
            conn, _ = server.accept()
            try:
                data = conn.recv(4096).decode()
                request = json.loads(data)
                
                response = self.generate(
                    request['prompt'],
                    request.get('max_tokens', 512)
                )
                
                conn.sendall(json.dumps({'response': response}).encode())
            except Exception as e:
                conn.sendall(json.dumps({'error': str(e)}).encode())
            finally:
                conn.close()

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--model-path', default='/home/ballhog/Litigation_ai/models/14b')
    parser.add_argument('--socket', default='/var/run/openthaigpt.sock')
    args = parser.parse_args()
    
    service = ModelService(args.model_path, args.socket)
    service.serve()
