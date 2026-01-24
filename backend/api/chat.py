import os
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
try:
    from langchain_groq import ChatGroq
    from langchain_community.vectorstores import FAISS
    from langchain_huggingface import HuggingFaceEmbeddings
    from langchain_core.documents import Document
    CHAT_AVAILABLE = True
except ImportError:
    CHAT_AVAILABLE = False
    print("⚠️ LangChain not installed. Chat functionality is disabled.")

router = APIRouter()

@router.post("/api/chat")
async def chat_endpoint(data: dict):
    if not CHAT_AVAILABLE:
        return {"response": "現在、チャット機能はメンテナンス中です（メモリ節約のため）。"}
    else:
        # Initialize Embeddings (Free, runs locally on Render)
        embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        vector_store = None

def build_vector_store(kanji_cache: dict):
    """
    Transforms the Kanji database and App rules into a searchable Vector Store.
    """
    global vector_store
    documents = []

    # 1. Add App Rules (Manual)
    app_rules = [
        "KanjiLock levels: Level 1 (Done once), Level 2 (100% success), "
        "Level 3 (100% success < 14s), Level 4 (100% success < 14s after 5 days).",
        "Sessions consist of 14 kanji per box.",
        "Quiz modes: qa (Kanji to Meaning), qb (Meaning to Kanji), qc (Vocabulary), qe (Romaji)."
    ]
    for rule in app_rules:
        documents.append(Document(page_content=rule, metadata={"type": "rule"}))

    # 2. Add Kanji Data from Cache
    for char, info in kanji_cache.items():
        content = (
            f"Kanji: {char}. Meaning: {info.get('signification')}. "
            f"Romaji: {info.get('romaji')}. Box: {info.get('boite')}. "
            f"Example Word: {info.get('mot')} ({info.get('signification_mot')})."
        )
        documents.append(Document(page_content=content, metadata={"kanji": char}))

    vector_store = FAISS.from_documents(documents, embeddings)
    print(f"🧠 RAG: Vector store built with {len(documents)} documents.")

class ChatInput(BaseModel):
    message: str
    player: str = "Anonymous"

@router.post("/chat")
async def chat_with_sensei(data: ChatInput):
    if not vector_store:
        raise HTTPException(status_code=503, detail="AI Brain is still loading...")

    try:
        # A. Retrieval: Find the 3 most relevant pieces of info
        docs = vector_store.similarity_search(data.message, k=3)
        context = "\n".join([d.page_content for d in docs])

        # B. AI Call
        llm = ChatGroq(
            temperature=0.3,
            groq_api_key=os.getenv("GROQ_API_KEY"),
            model_name="llama-3.1-8b-instant"
        )

        prompt = f"""
        You are 'SenseiLock', a helpful Japanese teacher.
        Use the context to answer. Be concise.
        
        CONTEXT:
        {context}
        
        USER: {data.message}
        SENSEI:"""

        response = llm.invoke(prompt)
        return {"reply": response.content}
    except Exception as e:
        return {"reply": f"Désolé, j'ai un petit souci technique : {str(e)}"}