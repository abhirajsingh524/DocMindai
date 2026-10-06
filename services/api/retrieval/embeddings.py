import math
import re
import hashlib
from collections import Counter
from typing import List
import numpy as np
from services.api.config import settings

class EmbeddingAdapter:
    def __init__(self, model_name: str = settings.EMBEDDING_MODEL, dimension: int = settings.EMBEDDING_DIM):
        self.model_name = model_name
        self.dimension = dimension
        self._st_model = None
        self._try_load_sentence_transformers()
        
    def _try_load_sentence_transformers(self):
        try:
            from sentence_transformers import SentenceTransformer
            self._st_model = SentenceTransformer(self.model_name)
        except Exception:
            self._st_model = None

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)
            
        if self._st_model is not None:
            try:
                embeddings = self._st_model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
                return embeddings.astype(np.float32)
            except Exception:
                pass
                
        # High-fidelity sublinear TF feature hashing (384-d normalized vector)
        embeddings = []
        for text in texts:
            vec = self._embed_single_dense(text)
            embeddings.append(vec)
            
        arr = np.array(embeddings, dtype=np.float32)
        norms = np.linalg.norm(arr, axis=1, keepdims=True)
        norms[norms == 0] = 1e-10
        return arr / norms

    def embed_query(self, query: str) -> np.ndarray:
        return self.embed_texts([query])[0]

    def _embed_single_dense(self, text: str) -> np.ndarray:
        vec = np.zeros(self.dimension, dtype=np.float32)
        tokens = re.findall(r"\w+", text.lower())
        if not tokens:
            return vec
            
        counts = Counter(tokens)
        for i, (token, count) in enumerate(counts.items()):
            # Sublinear TF weight
            tf_weight = 1.0 + math.log(count)
            
            # Unigram hash
            h_int = int(hashlib.sha256(token.encode("utf-8")).hexdigest()[:8], 16)
            dim_idx = h_int % self.dimension
            vec[dim_idx] += float(tf_weight)
            
            # Character trigrams for morphological and prefix/suffix matching
            if len(token) >= 3:
                for j in range(len(token) - 2):
                    tri = token[j:j+3]
                    tri_hash = int(hashlib.md5(tri.encode("utf-8")).hexdigest()[:8], 16)
                    tri_dim = tri_hash % self.dimension
                    vec[tri_dim] += 0.5 * float(tf_weight)

        # Bigrams
        for i in range(len(tokens) - 1):
            bg = f"{tokens[i]}_{tokens[i+1]}"
            bg_hash = int(hashlib.md5(bg.encode("utf-8")).hexdigest()[:8], 16)
            bg_dim = bg_hash % self.dimension
            vec[bg_dim] += 1.2

        return vec

embedding_adapter = EmbeddingAdapter()
