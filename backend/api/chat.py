import re
import os
import logging
from typing import Dict, Optional, Union
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from functools import lru_cache

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import Check
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_groq import ChatGroq
    from langchain_community.vectorstores import FAISS
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_core.documents import Document
    CHAT_AVAILABLE = True
except ImportError as e:
    CHAT_AVAILABLE = False
    logger.error(f"⚠️ LangChain or AI libraries not found: {e}")

router = APIRouter()
vector_store: Optional[FAISS] = None

# --- MODELS ---

class ChatInput(BaseModel):
    message: str = Field(..., min_length=1, description="The user's message")
    player: str = "Anonymous"

class KanjiInfo(BaseModel):
    signification: str
    romaji: Optional[str] = None
    boite: Optional[Union[int, str]] = None
    mot: Optional[str] = None
    signification_mot: Optional[str] = None

class BuildVectorStoreInput(BaseModel):
    kanji_cache: Dict[str, KanjiInfo]

# --- SINGLETONS / CACHING ---

@lru_cache(maxsize=1)
def get_embeddings():
    """Caches the embeddings model to avoid reloading on every build."""
    if not CHAT_AVAILABLE:
        return None
    logger.info("🧠 Loading Embeddings model...")
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

def get_llm():
    """Returns a configured LLM instance (Gemini or Groq)."""
    if not CHAT_AVAILABLE:
        return None
        
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    if provider == "groq":
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            logger.warning("🔑 GROQ_API_KEY not found.")
            return None
        return ChatGroq(
            model_name="qwen/qwen3-32b",
            groq_api_key=api_key,
            temperature=0.5
        )
    else:
        # Default to Gemini
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("🔑 GEMINI_API_KEY not found.")
            return None
            
        return ChatGoogleGenerativeAI(
            model="gemma-3-27b-it", 
            google_api_key=api_key,
            temperature=0.5
        )

# --- ENDPOINTS ---

@router.post("/")
async def chat_with_sensei(data: ChatInput):
    """Main chat endpoint using RAG if vector store is available."""
    if not CHAT_AVAILABLE:
        return {"response": "Désolé, le chat est désactivé pour le moment."}
    
    llm = get_llm()
    if not llm:
        return {"response": "Désolé, l'IA n'est pas configurée (Clé API manquante)."}
    
    try:
        system_rules = (
            "You are an expert trilingual language teacher fluent in Japanese, French, and English.\n"
            "Keep you reply within 100 characters except if specified otherwise.\n"
            "Your behavior rules:\n"
            "1. Code-Switching: Respond primarily in the language the user speaks, but mix in the target language.\n"
            "2. Contextual Translation: Provide translations in brackets for complex terms, e.g., 'C'est une nuance importante [It is an important nuance].'\n"
            "3. Persona: Be encouraging. Gently correct grammar before answering.\n"
            "4. Multimodal: Analyze and explain any kanji provided."
        )

        context = ""
        if vector_store:
            docs = vector_store.similarity_search(data.message, k=3)
            context = "\nContext about KanjiLock:\n" + "\n".join([d.page_content for d in docs])
        
        prompt = f"{system_rules}\n{context}\n\nUser Question: {data.message}"
        res = llm.invoke(prompt)
        
        # Extract thinking blocks (common in reasoning models like Qwen/DeepSeek)
        thought_match = re.search(r"<think>(.*?)</think>", res.content, flags=re.DOTALL)
        thought_content = thought_match.group(1).strip() if thought_match else ""
        
        # Strip thinking blocks from the main response
        clean_response = re.sub(r"<think>.*?</think>", "", res.content, flags=re.DOTALL).strip()
        
        return {
            "response": clean_response,
            "thought": thought_content
        }

    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "Désolé, une erreur technique est survenue. Veuillez réessayer plus tard."}

    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "Désolé, une erreur technique est survenue. Veuillez réessayer plus tard."}

@router.post("/build")
async def build_vector_store_api(input_data: BuildVectorStoreInput):
    """Builds the vector store from the provided kanji cache."""
    global vector_store
    if not CHAT_AVAILABLE:
        return {"status": "disabled", "message": "Libraries not installed"}
        
    try:
        embeddings = get_embeddings()
        if not embeddings:
            raise HTTPException(status_code=500, detail="Could not initialize embeddings model")

        docs = []
        for k, v in input_data.kanji_cache.items():
            content = f"Kanji {k}: {v.signification}"
            if v.mot:
                content += f". Example: {v.mot} ({v.signification_mot})"
            docs.append(Document(page_content=content, metadata={"kanji": k}))

        vector_store = FAISS.from_documents(docs, embeddings)
        logger.info(f"✅ Vector store built with {len(docs)} documents.")
        return {"status": "success", "count": len(docs)}
        
    except Exception as e:
        logger.error(f"Build error: {e}")
        return {"status": "error", "message": "Failed to build knowledge base."}

# Helper for direct call from lifespan
async def build_vector_store(kanji_cache: dict):
    """Internal helper to build the vector store without HTTP overhead."""
    # Convert dict to expected model for validation logic reuse
    validated_input = BuildVectorStoreInput(kanji_cache=kanji_cache)
    return await build_vector_store_api(validated_input)
