import os
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from app.db.models import KnowledgeBase, User
from app.db.session import SessionLocal
from app.core.config import settings
import pickle

class RAGEngine:
    def __init__(self):
        print("RAG: Initializing RAG Engine (Lazy Loading enabled)...")
        self._model = None
        self.index = None
        self.metadata = []
        self.load_index()

    @property   #decorator
    def model(self):
        if self._model is None:
            print("RAG: Loading Embedding Model (this may take a few seconds)...")
            self._model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        return self._model

    def load_index(self):
        if os.path.exists(settings.INDEX_PATH) and os.path.exists(settings.METADATA_PATH):
            print(f"RAG: Loading existing index from {settings.INDEX_PATH}...")
            try:
                self.index = faiss.read_index(settings.INDEX_PATH)
                with open(settings.METADATA_PATH, "rb") as f:
                    self.metadata = pickle.load(f)
                print(f"RAG: Index loaded with {len(self.metadata)} chunks.")
            except Exception as e:
                print(f"RAG: Failed to load index: {e}. Rebuilding...")
                self.rebuild_index()
        else:
            print("RAG: No existing index found. Building fresh...")
            self.rebuild_index()

    def rebuild_index(self):
        """Build FAISS index from all available database tables dynamically."""
        print("RAG: Starting Index Rebuild...")
        db = SessionLocal()
        from sqlalchemy import inspect
        try:
            inspector = inspect(db.bind)
            tables = inspector.get_table_names()
            print(f"RAG: Found tables in databases: {tables}")
            
            documents = []
            
            kb_items = db.query(KnowledgeBase).all()
            print(f"RAG: Found {len(kb_items)} KnowledgeBase items.")
            for item in kb_items:
                text_content = f"Title: {item.title}\nCategory: {item.category}\nContent: {item.content}"
                documents.append({"text": text_content, "source": "knowledge_base"})

            if not documents:
                print("RAG: ERROR! No documents found to index. Bot will be 'empty'.")
                documents.append({"text": "No domain-specific knowledge found in the database yet.", "source": "placeholder"})

            print(f"RAG: Generating embeddings for {len(documents)} chunks...")
            texts = [doc["text"] for doc in documents]
            embeddings = self.model.encode(texts)
            
            dimension = embeddings.shape[1]
            self.index = faiss.IndexFlatL2(dimension)
            self.index.add(np.array(embeddings).astype("float32"))
            self.metadata = documents

            faiss.write_index(self.index, settings.INDEX_PATH)
            with open(settings.METADATA_PATH, "wb") as f:
                pickle.dump(self.metadata, f)
                
            print(f"RAG: Index successfully rebuilt with {len(documents)} chunks.")

        except Exception as e:
            print(f"RAG: Error rebuilding index: {e}")
            import traceback
            traceback.print_exc()
        finally:
            db.close()

    def search(self, query: str, top_k: int = 3):
        """Retrieve top K chunks for a given query."""
        if self.index is None or not self.metadata:
            print("RAG: Search failed - Index/Metadata is empty.")
            return []

        print(f"RAG: Searching for: '{query}'...")
        query_vector = self.model.encode([query])
        distances, indices = self.index.search(np.array(query_vector).astype("float32"), top_k)
        
        results = []
        for i in range(len(indices[0])):
            idx = indices[0][i]
            if idx != -1 and idx < len(self.metadata):
                if self.metadata[idx].get("source") != "placeholder":
                    results.append(self.metadata[idx])
        
        print(f"RAG: Found {len(results)} relevant chunks.")
        return results

rag_engine = RAGEngine()
