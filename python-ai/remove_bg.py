#!/usr/bin/env python3
"""
Server-side AI Background Removal CLI & optional warm HTTP microservice for Png101.

Usage:
  1) Health check:
     python remove_bg.py --check [--models-dir ./models]

  2) Single-image CLI cutout:
     python remove_bg.py --input in.png --output out.png --model isnet-general-use [--alpha-matting] [--models-dir ./models]

  3) Persistent warm HTTP microservice:
     python remove_bg.py --serve --host 127.0.0.1 --port 8001 [--models-dir ./models]
"""

import argparse
import hmac
import io
import json
import os
import sys
import threading

SUPPORTED_MODELS = [
    "u2netp",
    "u2net",
    "isnet-general-use",
    "birefnet-general-lite",
    "birefnet-general",
    "u2net_human_seg",
]

_SESSION_CACHE = {}
_SESSION_LOCK = threading.Lock()


def configure_models_dir(models_dir: str | None) -> str:
    if models_dir:
        abs_dir = os.path.abspath(models_dir)
        os.makedirs(abs_dir, exist_ok=True)
        os.environ["U2NET_HOME"] = abs_dir
        return abs_dir
    return os.environ.get("U2NET_HOME", os.path.expanduser(os.path.join("~", ".u2net")))


def get_cached_session(model_name: str):
    from rembg import new_session

    safe_model = model_name if model_name in SUPPORTED_MODELS else "isnet-general-use"
    with _SESSION_LOCK:
        if safe_model not in _SESSION_CACHE:
            _SESSION_CACHE[safe_model] = new_session(safe_model, providers=["CPUExecutionProvider"])
        return _SESSION_CACHE[safe_model]


def run_cutout_bytes(image_bytes: bytes, model_name: str = "isnet-general-use", alpha_matting: bool = False) -> bytes:
    from PIL import Image, ImageOps
    from rembg import remove

    with Image.open(io.BytesIO(image_bytes)) as img:
        oriented = ImageOps.exif_transpose(img).convert("RGBA")
        session = get_cached_session(model_name)
        kwargs = {
            "session": session,
        }
        if alpha_matting:
            kwargs.update({
                "alpha_matting": True,
                "alpha_matting_foreground_threshold": 240,
                "alpha_matting_background_threshold": 15,
                "alpha_matting_erode_size": 10,
            })

        result = remove(oriented, **kwargs)
        out_buf = io.BytesIO()
        result.save(out_buf, format="PNG")
        return out_buf.getvalue()


def cmd_check(models_dir: str | None) -> int:
    resolved_dir = configure_models_dir(models_dir)
    info = {
        "ok": False,
        "python": sys.version.split()[0],
        "modelsDir": resolved_dir,
        "cachedModels": [],
        "packages": {},
        "supportedModels": SUPPORTED_MODELS,
    }

    try:
        import onnxruntime as ort
        info["packages"]["onnxruntime"] = getattr(ort, "__version__", "unknown")
        info["providers"] = ort.get_available_providers()
    except Exception as exc:
        info["error"] = f"onnxruntime import failed: {exc}"
        print(json.dumps(info))
        return 1

    try:
        import PIL
        info["packages"]["pillow"] = getattr(PIL, "__version__", "unknown")
    except Exception as exc:
        info["error"] = f"pillow import failed: {exc}"
        print(json.dumps(info))
        return 1

    try:
        import rembg
        info["packages"]["rembg"] = getattr(rembg, "__version__", "installed")
    except Exception as exc:
        info["error"] = f"rembg import failed: {exc}"
        print(json.dumps(info))
        return 1

    if os.path.isdir(resolved_dir):
        found = []
        for root, _, files in os.walk(resolved_dir):
            for fname in files:
                if fname.endswith(".onnx"):
                    found.append(fname)
        info["cachedModels"] = sorted(set(found))

    info["ok"] = True
    print(json.dumps(info))
    return 0


def cmd_cli(input_path: str, output_path: str, model_name: str, alpha_matting: bool, models_dir: str | None) -> int:
    configure_models_dir(models_dir)
    if not os.path.isfile(input_path):
        print(json.dumps({"ok": False, "error": f"Input file not found: {input_path}"}), file=sys.stderr)
        return 2

    try:
        with open(input_path, "rb") as f:
            raw = f.read()
        out_bytes = run_cutout_bytes(raw, model_name=model_name, alpha_matting=alpha_matting)
        with open(output_path, "wb") as f:
            f.write(out_bytes)
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}), file=sys.stderr)
        return 1


def _extract_request_token(req) -> str:
    header_key = (req.headers.get("X-API-Key") or "").strip()
    if header_key:
        return header_key
    auth_header = (req.headers.get("Authorization") or "").strip()
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return ""


def _list_cached_models(models_dir: str | None) -> list[str]:
    if not models_dir or not os.path.isdir(models_dir):
        return []
    found = []
    for _, _, files in os.walk(models_dir):
        for fname in files:
            if fname.endswith(".onnx"):
                found.append(fname)
    return sorted(set(found))


def create_app(
    default_model: str | None = None,
    models_dir: str | None = None,
    api_key: str | None = None,
):
    try:
        from flask import Flask, Response, jsonify, request
    except ImportError as exc:
        raise RuntimeError("Flask is required for HTTP/WSGI mode. Install via: pip install flask") from exc

    resolved_dir = configure_models_dir(models_dir or os.environ.get("REMBG_MODELS_DIR") or os.environ.get("U2NET_HOME"))
    active_default = (default_model or os.environ.get("REMBG_DEFAULT_MODEL") or "isnet-general-use").strip()
    expected_key = (api_key if api_key is not None else os.environ.get("REMBG_API_KEY", "")).strip()

    preload_raw = os.environ.get("REMBG_PRELOAD_MODELS", "").strip()
    if preload_raw:
        for model_item in [m.strip() for m in preload_raw.split(",") if m.strip()]:
            if model_item in SUPPORTED_MODELS:
                get_cached_session(model_item)

    app = Flask(__name__)

    def require_auth():
        if not expected_key:
            return None
        provided = _extract_request_token(request)
        if not provided or not hmac.compare_digest(provided, expected_key):
            return jsonify({"ok": False, "error": "Unauthorized: invalid or missing API key."}), 401
        return None

    @app.get("/health")
    def health():
        auth_err = require_auth()
        if auth_err is not None:
            return auth_err
        return jsonify({
            "ok": True,
            "authEnabled": bool(expected_key),
            "defaultModel": active_default,
            "modelsDir": resolved_dir,
            "cachedModels": _list_cached_models(resolved_dir),
            "supportedModels": SUPPORTED_MODELS,
        })

    @app.post("/remove-background")
    def remove_background_route():
        auth_err = require_auth()
        if auth_err is not None:
            return auth_err

        upload = request.files.get("image")
        if upload is None:
            return jsonify({"error": "Missing 'image' file field"}), 400
        model_name = request.form.get("model", active_default)
        alpha_matting = request.form.get("alpha_matting", "0") in ("1", "true", "yes")
        try:
            out_bytes = run_cutout_bytes(upload.read(), model_name=model_name, alpha_matting=alpha_matting)
            return Response(out_bytes, mimetype="image/png")
        except Exception as exc:
            return jsonify({"error": str(exc)}), 500

    return app


def cmd_serve(host: str, port: int, default_model: str, models_dir: str | None, api_key: str | None = None) -> int:
    app = create_app(default_model=default_model, models_dir=models_dir, api_key=api_key)
    app.run(host=host, port=port, threaded=True)
    return 0


def cmd_download_models(models: list[str], models_dir: str | None) -> int:
    resolved_dir = configure_models_dir(models_dir)
    downloaded = []
    for m in models:
        if m not in SUPPORTED_MODELS:
            print(json.dumps({"ok": False, "error": f"Unsupported model: {m}"}), file=sys.stderr)
            return 2
        get_cached_session(m)
        downloaded.append(m)
    print(json.dumps({
        "ok": True,
        "modelsDir": resolved_dir,
        "preloaded": downloaded,
        "cachedModels": _list_cached_models(resolved_dir),
    }))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Png101 Server AI Background Remover")
    parser.add_argument("--check", action="store_true", help="Verify Python & rembg dependencies and print JSON")
    parser.add_argument("--serve", action="store_true", help="Run persistent HTTP server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--api-key", default=None, help="Shared secret expected in X-API-Key / Bearer header (or REMBG_API_KEY env)")
    parser.add_argument("--download-models", nargs="+", metavar="MODEL", help="Pre-download and verify one or more rembg ONNX models")
    parser.add_argument("--input", "-i", help="Input image path")
    parser.add_argument("--output", "-o", help="Output transparent PNG path")
    parser.add_argument("--model", "-m", default="isnet-general-use", help="rembg model name")
    parser.add_argument("--alpha-matting", action="store_true", help="Enable PyMatting edge refinement")
    parser.add_argument("--models-dir", default=None, help="Directory for cached ONNX model weights")
    args = parser.parse_args()

    if args.check:
        return cmd_check(args.models_dir)
    if args.download_models:
        return cmd_download_models(args.download_models, args.models_dir)
    if args.serve:
        return cmd_serve(args.host, args.port, args.model, args.models_dir, args.api_key)
    if args.input and args.output:
        return cmd_cli(args.input, args.output, args.model, args.alpha_matting, args.models_dir)

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
