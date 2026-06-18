#!/usr/bin/env python3
"""HTTP inference server for the ingestor. Loads the sklearn model once at startup."""

from __future__ import annotations

import json
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from inference import get_artifact, predict_from_game_state

HOST = os.environ.get("ML_ENGINE_HOST", "127.0.0.1")
PORT = int(os.environ.get("ML_ENGINE_PORT", "8765"))


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _send_json(self, status: int, body: dict) -> None:
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:
        if self.path == "/health":
            try:
                artifact = get_artifact()
                self._send_json(200, {
                    "status": "ok",
                    "feature_cols": artifact["feature_cols"],
                    "outcome_keys": artifact["outcome_keys"],
                })
            except Exception as exc:
                self._send_json(503, {"status": "error", "error": str(exc)})
            return
        self._send_json(404, {"error": "not found"})

    def do_POST(self) -> None:
        if self.path != "/predict":
            self._send_json(404, {"error": "not found"})
            return

        length = int(self.headers.get("Content-Length", "0"))
        try:
            raw = self.rfile.read(length)
            state = json.loads(raw.decode("utf-8"))
            probs = predict_from_game_state(state)
            self._send_json(200, {"probabilities": probs})
        except json.JSONDecodeError:
            self._send_json(400, {"error": "invalid JSON body"})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})


def main() -> None:
    print("Loading model...", flush=True)
    get_artifact()

    try:
        server = ThreadingHTTPServer((HOST, PORT), Handler)
    except OSError as exc:
        if exc.errno == 48 or "Address already in use" in str(exc):
            print(
                f"Port {PORT} is already in use (another ml-engine instance?).\n"
                f"  Stop it:  lsof -ti :{PORT} | xargs kill\n"
                f"  Or use:   ML_ENGINE_PORT=8766 python serve.py",
                file=sys.stderr,
            )
        raise SystemExit(1) from exc

    print(f"ml-engine listening on http://{HOST}:{PORT}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nshutting down", flush=True)
        server.shutdown()


if __name__ == "__main__":
    main()
