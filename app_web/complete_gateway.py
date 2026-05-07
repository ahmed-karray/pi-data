from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx
import asyncio
from typing import Dict, Any

app = FastAPI(title="6G IDS API Gateway", version="1.0.0")

# CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Internal service URLs
SERVICES = {
    "auth": "http://localhost:8001",
    "detection": "http://localhost:8002",
    "mlops": "http://localhost:8003"
}

async def forward_request(service: str, path: str, method: str, headers: Dict[str, str], body: Any = None):
    """Forward HTTP request to internal service"""
    service_url = SERVICES.get(service)
    if not service_url:
        raise HTTPException(404, f"Service {service} not found")
    
    url = f"{service_url}{path}"
    
    async with httpx.AsyncClient() as client:
        kwargs = {
            "url": url,
            "method": method,
            "headers": headers,
        }
        
        if body:
            kwargs["json"] = body
        
        try:
            resp = await client.request(**kwargs)
            return resp.status_code, resp.headers, resp.content
        except httpx.ConnectError:
            raise HTTPException(503, f"Service {service} unavailable")

# Explicit routes for clean Swagger docs
@app.get("/health", operation_id="health_check")
async def health():
    return {
        "status": "healthy",
        "services": SERVICES
    }

@app.get("/status", operation_id="service_status")
async def status():
    """Check all services health"""
    results = {}
    for service_name, service_url in SERVICES.items():
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{service_url}/health", timeout=5.0)
                results[service_name] = {"status": resp.json().get("status", "unknown"), "url": service_url}
        except:
            results[service_name] = {"status": "unavailable", "url": service_url}
    return {"services": results}

# Auth routes
@app.get("/auth/health", operation_id="auth_health")
@app.get("/users", operation_id="get_users")
@app.post("/auth", operation_id="login")
@app.post("/users", operation_id="create_user")
@app.put("/users/{user_id}", operation_id="update_user")
@app.delete("/users/{user_id}", operation_id="delete_user")
async def proxy_auth(request: Request, user_id: str = None):
    path = request["path"]
    service_path = "/" + path.replace("auth/", "").replace("users/", "")
    return await proxy_to_service("auth", service_path, request)

# Detection routes
@app.get("/datasets", operation_id="list_datasets")
@app.post("/predict", operation_id="predict")
@app.post("/batch_predict", operation_id="batch_predict")
@app.post("/explain", operation_id="explain")
async def proxy_detection(request: Request):
    path = request["path"]
    service_path = "/" + path
    return await proxy_to_service("detection", service_path, request)

# MLOps routes (new)
@app.get("/mlops/health", operation_id="mlops_health")
@app.get("/mlops/datasets", operation_id="mlops_datasets")
@app.get("/mlops/models", operation_id="mlops_models")
@app.post("/mlops/predict", operation_id="mlops_predict")
@app.post("/mlops/retrain", operation_id="mlops_retrain")
@app.get("/mlops/stats", operation_id="mlops_stats")
@app.get("/mlops/dashboard/attacks", operation_id="mlops_attacks")
@app.get("/mlops/dashboard/timeline", operation_id="mlops_timeline")
async def proxy_mlops(request: Request):
    path = request["path"]
    service_path = "/" + path.replace("mlops/", "")
    return await proxy_to_service("mlops", service_path, request)

# Catch-all proxy for other paths
@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"], operation_id="catch_all_proxy")
async def proxy_catch_all(request: Request, path: str):
    """Fallback proxy for unhandled paths"""
    # Determine service based on path prefix
    if path.startswith("auth") or path.startswith("users"):
        service = "auth"
    elif path.startswith("predict") or path.startswith("datasets"):
        service = "detection"
    elif path.startswith("mlops"):
        service = "mlops"
    else:
        raise HTTPException(404, "Endpoint not found - use explicit paths above")
    
    service_path = "/" + path.lstrip("/")
    return await proxy_to_service(service, service_path, request)

async def proxy_to_service(service: str, service_path: str, request: Request):
    """Proxy to specific service"""
    status_code, headers, content = await forward_request(
        service, service_path, request.method, 
        dict(request.headers), await request.body() if request.method in ["POST", "PUT", "PATCH"] else None
    )
    
    response_headers = {k.lower(): v for k, v in headers.items() 
                       if k.lower() not in ["transfer-encoding", "content-encoding"]}
    
    return JSONResponse(
        content=content.decode('utf-8') if content else {},
        status_code=status_code,
        headers=response_headers
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

