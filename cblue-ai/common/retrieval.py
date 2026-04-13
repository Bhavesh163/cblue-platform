import faiss
import numpy as np
from typing import List, Dict
from dataclasses import dataclass

@dataclass
class RetrievalResult:
    text: str
    score: float
    source: str
    chunk_id: str

class HybridRetriever:
    def __init__(self, index_path: str, embedding_dim: int = 768):
        self.index = faiss.read_index(index_path) if index_path else faiss.IndexFlatL2(embedding_dim)
        self.docs = []
        self.bm25_scores = {}
    
    def add_documents(self, docs: List[Dict]):
        self.docs.extend(docs)
    
    def search(self, query_embedding: np.ndarray, query_text: str, top_k: int = 5, threshold: float = 0.7) -> List[RetrievalResult]:
        # Vector search
        distances, indices = self.index.search(query_embedding.reshape(1, -1), top_k * 2)
        
        # BM25 lexical search (simplified)
        bm25_results = self._bm25_search(query_text, top_k)
        
        # Hybrid scoring
        results = []
        for idx, dist in zip(indices[0], distances[0]):
            if idx < len(self.docs):
                doc = self.docs[idx]
                vector_score = 1 / (1 + dist)
                bm25_score = bm25_results.get(idx, 0)
                hybrid_score = 0.6 * vector_score + 0.4 * bm25_score
                
                if hybrid_score >= threshold:
                    results.append(RetrievalResult(
                        text=doc['text'],
                        score=hybrid_score,
                        source=doc.get('source', 'unknown'),
                        chunk_id=doc.get('id', str(idx))
                    ))
        
        return sorted(results, key=lambda x: x.score, reverse=True)[:top_k]
    
    def _bm25_search(self, query: str, top_k: int) -> Dict[int, float]:
        # Simplified BM25 - replace with proper implementation
        tokens = set(query.lower().split())
        scores = {}
        for idx, doc in enumerate(self.docs):
            doc_tokens = set(doc['text'].lower().split())
            overlap = len(tokens & doc_tokens)
            if overlap > 0:
                scores[idx] = overlap / len(tokens)
        return dict(sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top_k])
    
    def save(self, path: str):
        faiss.write_index(self.index, path)
