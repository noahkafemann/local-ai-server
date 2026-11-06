#!/usr/bin/env python3
"""Combined Server: Liefert die Webseite aus und leitet LM-Studio-Anfragen weiter (mit CORS).

Starten:
    python combined_server.py

Dann im Browser öffnen:
    - Gleicher PC:  http://localhost:8080
    - iPhone/Anderes Gerät: http://<IP-des-PCs>:8080  (z.B. http://192.168.2.28:8080)

In der App (Zahnrad-Menü) eintragen:
    - LM Studio Basis-URL: http://192.168.2.28:1234
    - CORS-Proxy: AN
    - Proxy-URL: http://localhost:8081  (beim selben PC) bzw. http://<IP-des-PCs>:8081 (von anderen Geräten)
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error
import os
import sys


LM_STUDIO_BASE = "http://192.168.2.28:1234"
WEB_PORT = 8080
PROXY_PORT = 8081
WEB_ROOT = os.path.dirname(os.path.abspath(__file__))


class CombinedHandler(BaseHTTPRequestHandler):
    """Bedient statische Dateien und forwarded /proxy/* Anfragen an LM Studio."""

    # -------- Logging --------
    def log_message(self, format, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (
            self.address_string(), self.log_date_time_string(), format % args))

    # -------- Routing --------
    def do_GET(self):
        if self.path.startswith("/proxy/"):
            self._proxy("GET")
        else:
            self._serve_file()

    def do_POST(self):
        if self.path.startswith("/proxy/"):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length) if content_length > 0 else None
            self._proxy("POST", body=body)
        else:
            self.send_error(404)

    def do_OPTIONS(self):
        if self.path.startswith("/proxy/"):
            self.send_response(200)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()
        else:
            self.send_error(404)

    # -------- Static file serving --------
    def _serve_file(self):
        path = self.path
        if path == "/":
            path = "/index.html"

        file_path = os.path.join(WEB_ROOT, path.lstrip("/"))

        # Sicherheit: Verhindere Directory-Traversal
        file_path = os.path.normpath(file_path)
        if not file_path.startswith(os.path.normpath(WEB_ROOT)):
            self.send_error(403)
            return

        if not os.path.isfile(file_path):
            self.send_error(404)
            return

        # Content-Type bestimmen
        ext = os.path.splitext(file_path)[1].lower()
        content_types = {
            ".html": "text/html; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".json": "application/json",
            ".ico": "image/x-icon",
            ".svg": "image/svg+xml",
        }
        content_type = content_types.get(ext, "application/octet-stream")

        try:
            with open(file_path, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(500, str(e))

    # -------- CORS Proxy --------
    def _proxy(self, method, body=None):
        # Pfad nach /proxy/ entfernen -> z.B. /v1/models
        target_path = self.path[len("/proxy/"):]
        target_url = LM_STUDIO_BASE.rstrip("/") + "/" + target_path.lstrip("/")

        try:
            req = urllib.request.Request(target_url, data=body, method=method)
            if self.headers.get("Content-Type"):
                req.add_header("Content-Type", self.headers["Content-Type"])
            if self.headers.get("Accept"):
                req.add_header("Accept", self.headers["Accept"])

            resp = urllib.request.urlopen(req)

            self.send_response(resp.status)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Expose-Headers", "Content-Type")
            self.send_header("Connection", "keep-alive")

            hop_by_hop = {
                "connection", "keep-alive", "proxy-authenticate",
                "proxy-authorization", "te", "trailers", "transfer-encoding",
                "upgrade",
            }
            for key, value in resp.headers.items():
                if key.lower() not in hop_by_hop:
                    self.send_header(key, value)

            self.end_headers()

            while True:
                chunk = resp.read(65536)
                if not chunk:
                    break
                self.wfile.write(chunk)

        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            try:
                self.wfile.write(e.read())
            except Exception:
                pass
        except Exception as e:
            self.send_response(502)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            try:
                self.wfile.write(str(e).encode("utf-8"))
            except Exception:
                pass


def main():
    # Web-Server (liefert index.html, css, js)
    web_server = HTTPServer(("0.0.0.0", WEB_PORT), CombinedHandler)
    # Proxy-Server (leitet an LM Studio weiter)
    proxy_server = HTTPServer(("0.0.0.0", PROXY_PORT), CombinedHandler)

    print(f"Web-Server läuft auf http://0.0.0.0:{WEB_PORT}")
    print(f"CORS-Proxy läuft auf  http://0.0.0.0:{PROXY_PORT}")
    print(f"Leitet LM-Studio-Anfragen an {LM_STUDIO_BASE} weiter")
    print()
    print("Im Browser öffnen:")
    print(f"  Gleicher PC:  http://localhost:{WEB_PORT}")
    print(f"  iPhone/Anderes: http://<IP-des-PCs>:{WEB_PORT}")
    print()
    print("Strg+C zum Beenden\n")

    import threading
    t = threading.Thread(target=proxy_server.serve_forever, daemon=True)
    t.start()

    try:
        web_server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer beendet.")
        web_server.server_close()
        proxy_server.server_close()


if __name__ == "__main__":
    main()
