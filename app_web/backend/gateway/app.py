from __future__ import annotations

from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import (
    JSONResponse,
    RedirectResponse,
    Response,
    StreamingResponse,
)

from app_web.backend.shared.config import ALLOWED_ORIGINS, SERVICE_URLS

SERVICE_BY_PREFIX = {
    "auth": "auth",
    "detect": "detection",
    "train": "training",
    "monitor": "monitoring",
    "dashboard": "dashboard",
    "admin": "admin",
}

app = FastAPI(title="IOTinel Gateway", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def _proxy(service_name: str, path: str, request: Request) -> Response:
    upstream = SERVICE_URLS[service_name]
    url = f"{upstream}/{path}"
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.request(
                request.method,
                url,
                params=request.query_params,
                headers={
                    key: value
                    for key, value in request.headers.items()
                    if key.lower() != "host"
                },
                content=await request.body(),
            )
    except httpx.TimeoutException:
        return JSONResponse(
            content={
                "detail": f"Upstream service '{service_name}' timed out while handling '{path}'"
            },
            status_code=504,
        )
    body: Any
    content_type = response.headers.get("content-type", "")
    if "application/json" in content_type:
        body = response.json()
        proxy_response = JSONResponse(content=body, status_code=response.status_code)
    else:
        proxy_response = Response(
            content=response.content,
            status_code=response.status_code,
            media_type=content_type,
        )
    for key, value in response.headers.items():
        if key.lower() in {"content-length", "transfer-encoding", "connection"}:
            continue
        if key.lower() == "set-cookie":
            proxy_response.headers.append("set-cookie", value)
        else:
            proxy_response.headers[key] = value
    return proxy_response


async def _proxy_stream(service_name: str, path: str, request: Request) -> Response:
    upstream = SERVICE_URLS[service_name]
    url = f"{upstream}/{path}"
    timeout = httpx.Timeout(connect=10.0, read=None, write=60.0, pool=60.0)
    client = httpx.AsyncClient(timeout=timeout)
    upstream_request = client.build_request(
        request.method,
        url,
        params=request.query_params,
        headers={
            key: value
            for key, value in request.headers.items()
            if key.lower() != "host"
        },
        content=await request.body(),
    )
    stream = await client.send(upstream_request, stream=True)

    async def iter_body():
        try:
            async for chunk in stream.aiter_bytes():
                yield chunk
        finally:
            await stream.aclose()
            await client.aclose()

    response = StreamingResponse(
        iter_body(),
        status_code=stream.status_code,
        media_type=stream.headers.get("content-type", "text/plain"),
    )
    for key, value in stream.headers.items():
        if key.lower() in {"content-length", "transfer-encoding", "connection"}:
            continue
        response.headers[key] = value
    return response


async def _proxy_with_fallback(
    service_names: list[str], path: str, request: Request
) -> Response:
    last_response: Response | None = None
    for service_name in service_names:
        response = await _proxy(service_name, path, request)
        last_response = response
        if response.status_code != 404:
            return response
    return last_response if last_response is not None else Response(status_code=404)


@app.get("/health")
def health():
    return {
        "status": "UP",
        "service": "gateway",
        "port": 8000,
        "routes": list(SERVICE_BY_PREFIX),
    }


@app.api_route("/", methods=["GET"])
async def root(request: Request):
    return await _proxy("analyst_ui", "", request)


@app.api_route("/login", methods=["GET"])
async def login(request: Request):
    return await _proxy("analyst_ui", "login", request)


@app.api_route("/scientist/login", methods=["GET"])
async def scientist_login_redirect():
    return RedirectResponse(url="http://localhost:8010/login", status_code=307)


@app.api_route("/administrator/login", methods=["GET"])
async def admin_login_redirect():
    return RedirectResponse(url="http://localhost:8010/login", status_code=307)


@app.api_route("/assets/{path:path}", methods=["GET"])
async def analyst_assets(path: str, request: Request):
    referer = (request.headers.get("referer") or "").lower()
    if "/scientist/" in referer:
        order = ["scientist_ui", "analyst_ui", "admin_ui"]
    elif "/administrator/" in referer:
        order = ["admin_ui", "analyst_ui", "scientist_ui"]
    else:
        order = ["analyst_ui", "scientist_ui", "admin_ui"]
    return await _proxy_with_fallback(order, f"assets/{path}", request)


@app.api_route("/favicon.ico", methods=["GET"])
async def analyst_favicon(request: Request):
    return await _proxy("analyst_ui", "favicon.ico", request)


@app.api_route("/analyst/{path:path}", methods=["GET"])
async def analyst_ui(path: str, request: Request):
    return await _proxy("analyst_ui", path, request)


@app.api_route("/scientist/{path:path}", methods=["GET"])
async def scientist_ui(path: str, request: Request):
    return await _proxy("scientist_ui", path, request)


@app.api_route("/administrator/{path:path}", methods=["GET"])
async def admin_ui(path: str, request: Request):
    return await _proxy("admin_ui", path, request)


@app.api_route(
    "/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
)
async def route_all(path: str, request: Request):
    prefix = path.split("/", 1)[0]
    service_name = SERVICE_BY_PREFIX.get(prefix)
    if not service_name:
        raise HTTPException(status_code=404, detail="Unknown gateway route")
    if path.startswith("train/logs/"):
        return await _proxy_stream(service_name, path, request)
    return await _proxy(service_name, path, request)
