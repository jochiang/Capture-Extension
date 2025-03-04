from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
import json
import chromadb
from chromadb.utils import embedding_functions
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

app = FastAPI(title="Content Capture API")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class ContentItem(BaseModel):
    url: str
    title: str
    content: str
    date: str

class SearchQuery(BaseModel):
    query: str

class SearchResult(BaseModel):
    url: str
    title: str
    content: str
    date: str
    score: float

class SearchResponse(BaseModel):
    results: List[SearchResult]

class DeleteRequest(BaseModel):
    doc_id: str

class BulkDeleteRequest(BaseModel):
    doc_ids: List[str]

# Vector database setup
DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

# Set up the embedding function using Chroma's built-in support
sentence_transformer_ef = embedding_functions.SentenceTransformerEmbeddingFunction(
    model_name="all-MiniLM-L6-v2"
)

# Initialize Chroma client
chroma_client = chromadb.PersistentClient(path=os.path.join(DATA_DIR, "chroma_db"))

# Get or create a collection with the embedding function
collection_name = "captured_content"
try:
    collection = chroma_client.get_collection(
        name=collection_name,
        embedding_function=sentence_transformer_ef
    )
    print(f"Collection '{collection_name}' loaded with {collection.count()} items")
except:
    collection = chroma_client.create_collection(
        name=collection_name,
        embedding_function=sentence_transformer_ef,
        metadata={"description": "Web content captured from whitelisted domains"}
    )
    print(f"Created new collection '{collection_name}'")

# Function to check if content already exists
def content_exists(url):
    # Generate document ID
    doc_id = f"{url.replace('://', '_').replace('/', '_')}"

    # Check if document with this ID exists by performing a get
    try:
        result = collection.get(ids=[doc_id], include=["metadatas"])
        return len(result['ids']) > 0
    except:
        return False

@app.post("/store", response_model=dict)
async def store_content(item: ContentItem):
    # Create a unique ID for the document
    doc_id = f"{item.url.replace('://', '_').replace('/', '_')}_{item.date}"

    # Check if content with this URL already exists
    if content_exists(item.url):
        return {"status": "duplicate", "message": "Content with this URL already exists"}

    # Store the document in Chroma (embedding is generated automatically)
    collection.add(
        ids=[doc_id],
        metadatas=[{
            "url": item.url,
            "title": item.title,
            "date": item.date
        }],
        documents=[item.content]
    )

    return {"status": "success", "message": "Content stored successfully"}

@app.post("/delete", response_model=dict)
async def delete_content(request: DeleteRequest):
    try:
        # Delete the document from Chroma
        collection.delete(ids=[request.doc_id])
        return {"status": "success", "message": "Content deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting content: {str(e)}")

@app.post("/bulk-delete", response_model=dict)
async def bulk_delete_content(request: BulkDeleteRequest):
    try:
        # Delete multiple documents from Chroma
        collection.delete(ids=request.doc_ids)
        return {"status": "success", "message": f"Successfully deleted {len(request.doc_ids)} items"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error deleting content: {str(e)}")

@app.get("/list-content", response_model=dict)
async def list_content():
    # Get all content from collection
    count = collection.count()
    if count == 0:
        return {"items": []}

    try:
        results = collection.get(include=["metadatas", "documents"])

        items = []
        for i in range(len(results["ids"])):
            items.append({
                "id": results["ids"][i],
                "url": results["metadatas"][i]["url"],
                "title": results["metadatas"][i]["title"],
                "date": results["metadatas"][i]["date"],
                "content_preview": results["documents"][i][:100] + "..." if len(results["documents"][i]) > 100 else results["documents"][i]
            })

        return {"items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing content: {str(e)}")

@app.post("/search", response_model=SearchResponse)
async def search_content(query: SearchQuery):
    # Get collection count
    count = collection.count()
    if count == 0:
        return {"results": []}

    # Search the collection (embedding is generated automatically)
    k = min(10, count)  # Get top 10 results or all if less than 10
    results = collection.query(
        query_texts=[query.query],
        n_results=k,
        include=["metadatas", "documents", "distances"]
    )

    # Prepare results
    search_results = []
    if results["ids"] and len(results["ids"][0]) > 0:
        for i in range(len(results["ids"][0])):
            metadata = results["metadatas"][0][i]
            content = results["documents"][0][i]
            # Convert distance to similarity score (Chroma returns distances, not similarities)
            distance = results["distances"][0][i]
            # Convert to a similarity score between 0 and 1
            similarity_score = 1.0 / (1.0 + distance)

            search_results.append(SearchResult(
                url=metadata["url"],
                title=metadata["title"],
                content=content,
                date=metadata["date"],
                score=similarity_score
            ))

    # Sort by score
    search_results.sort(key=lambda x: x.score, reverse=True)

    return {"results": search_results}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "items_indexed": collection.count(),
        "collection": collection_name
    }

# Mount static files directory
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve index.html
@app.get("/", include_in_schema=False)
async def serve_index():
    return FileResponse("index.html")

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=5000, reload=True)