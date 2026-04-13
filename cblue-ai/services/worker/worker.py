import redis
import json
import socket
import sys
import re
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent.parent))
from common.retrieval import HybridRetriever
from common.prompts import build_rag_prompt, build_fallback_response
from common.pii_redaction import PIIRedactor
from common.knowledge_base import find_relevant_content

class Worker:
    def __init__(self, redis_url: str, model_socket: str):
        self.redis = redis.from_url(redis_url)
        self.model_socket = model_socket
        self.retriever = HybridRetriever(index_path=None)
        self.pii_redactor = PIIRedactor()
        print("Worker initialized")
    
    def detect_language(self, text: str) -> str:
        """Detect language: th, zh, or en"""
        thai_chars = len(re.findall(r'[\u0E00-\u0E7F]', text))
        chinese_chars = len(re.findall(r'[\u4E00-\u9FFF]', text))
        total_chars = len(text.strip())
        
        if total_chars == 0:
            return 'en'
        
        if thai_chars / total_chars > 0.3:
            return 'th'
        elif chinese_chars / total_chars > 0.3:
            return 'zh'
        return 'en'
    
    def call_model(self, prompt: str, max_tokens: int = 512) -> str:
        try:
            sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            sock.settimeout(30)
            sock.connect(self.model_socket)
            
            request = json.dumps({'prompt': prompt, 'max_tokens': max_tokens})
            sock.sendall(request.encode())
            
            response = sock.recv(8192).decode()
            sock.close()
            
            result = json.loads(response)
            return result.get('response', build_fallback_response())
        except FileNotFoundError:
            print(f"Model socket not found: {self.model_socket}")
            return "ขออภัย ระบบไม่สามารถตอบคำถามได้ในขณะนี้ กรุณาติดต่อ: cblue.thailand@gmail.com"
        except Exception as e:
            print(f"Model call failed: {e}")
            return "ขออภัย ระบบไม่สามารถตอบคำถามได้ในขณะนี้ กรุณาติดต่อ: cblue.thailand@gmail.com"
    
    def process_job(self, job_data: dict):
        user_msg = job_data['message']
        conv_id = job_data['conversation_id']
        
        print(f"Processing job for conversation: {conv_id}")
        
        # Detect language
        lang = self.detect_language(user_msg)
        
        # PII redaction
        if self.pii_redactor.detect(user_msg):
            user_msg = self.pii_redactor.redact(user_msg)
        
        # Get relevant context
        context = find_relevant_content(user_msg)
        
        # Build prompt with language instruction
        lang_instruction = {
            'th': 'ตอบเป็นภาษาไทย',
            'zh': '用中文回答',
            'en': 'Respond in English'
        }.get(lang, 'Respond in English')
        
        prompt = f"{lang_instruction}. {build_rag_prompt(user_msg, context)}"
        
        # Call model
        response = self.call_model(prompt)
        
        # Extract answer
        if "คำตอบ:" in response:
            response = response.split("คำตอบ:")[-1].strip()
        
        print(f"Publishing response to chat:{conv_id}")
        
        # Publish result
        self.redis.publish(f'chat:{conv_id}', json.dumps({
            'type': 'message',
            'content': response
        }))
        
        print(f"Response published successfully")
    
    def run(self):
        print("Worker started, listening for jobs on 'job_queue'...")
        pubsub = self.redis.pubsub()
        pubsub.subscribe('job_queue')
        
        for message in pubsub.listen():
            if message['type'] == 'message':
                try:
                    job = json.loads(message['data'])
                    print(f"Received job: {job}")
                    self.process_job(job)
                except Exception as e:
                    print(f"Job processing error: {e}")
                    import traceback
                    traceback.print_exc()

if __name__ == '__main__':
    worker = Worker(
        redis_url='redis://localhost:6379/0',
        model_socket='/var/run/openthaigpt.sock'
    )
    worker.run()
