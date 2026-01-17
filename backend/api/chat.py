import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.docstore.document import Document

router = APIRouter()

# 1. Setup Embeddings (Local & Free)
# This model converts text into numbers the AI can "compare"
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# 2. Mock Knowledge Base (In production, load this from your JSON/Supabase)
def initialize_vector_store():
    # Example: App Rules + Kanji Data
    knowledge_data = [
        "KanjiLock uses a 4-level system. Level 1: Done once. Level 2: No misses.",
        "Level 3: No misses under 14 seconds. Level 4: Mastered after 5 days wait.",
        "Kanji: 水 (Sui/mizu) means Water. It is level 1.",
        "To filter by box, use the dropdown menu in the Quiz section."
    ]
    docs = [Document(page_content=t) for t in knowledge_data]
    return FAISS.from_documents(docs, embeddings)

vector_store = initialize_vector_store()

# 3. Setup Groq
llm = ChatGroq(
    temperature=0, 
    groq_api_key=os.getenv("GROQ_API_KEY"), 
    model_name="llama3-8b-8192"
)

class ChatInput(BaseModel):
    message: str

@router.post("/chat")
async def ask_sensei(data: ChatInput):
    try:
        # A. Retrieval: Find the most relevant info
        search_results = vector_store.similarity_search(data.message, k=2)
        context = "\n".join([doc.page_content for doc in search_results])

        # B. Augmentation: Create the prompt
        prompt = f"""
        You are 'SenseiLock', the AI tutor for the KanjiLock App.
        Use the context below to answer the user. 
        If you don't know, say you don't know based on the app data but try to help generally.
        
        CONTEXT:
        {context}
        
        USER QUESTION: 
        {data.message}
        """

        # C. Generation: Ask Groq
        response = llm.invoke(prompt)
        return {"reply": response.content}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))