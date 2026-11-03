#!/usr/bin/env python3
"""Lokaler CORS-Proxy für LM Studio.

Leitet Anfragen an den LM-Studio-Server weiter und fügt CORS-Header hinzu,
damit Browser-Apps (localhost / file://) darauf zugreifen können.

Starten:
    python cors_proxy.py

Dann App auf http://localhost:8080 öffnen und in den Einstellungen als
Basis-URL http://localhost:8081 eintragen.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.request
import urllib.error
import threading
import sys


LM_STUDIO_BASE = "http://192.168.2.28:1234"
PROXY_PORT = 8081
PROXY_HOST = "0.0.0.0"


class CORSProxyHandler(BaseHTTPRequestHandler):
    """HTTP-Request-Handler der Anfragen an LM Studio forwarded und CORS-Header setzt."""

    def log_message(self, format, *args):
        # Weniger Log-Ausgabe für sauberere Konsole
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(),
                                                  self.log_date_time_string(),
                                                  format % args))

    def _forward(self, method, body=None):
        """Leitet die Anfrage an LM Studio weiter und streamt die Antwort zurück."""
        target_url = LM_STUDIO_BASE + self.path

        try:
            req = urllib.request.Request(target_url, data=body, method=method)
            # Content-Type weiterleiten
            if self.headers.get("Content-Type"):
                req.add_header("Content-Type", self.headers["Content-Type"])

            # Streaming-Antwort von LM Studio holen
            resp = urllib.request.urlopen(req)

            # Antwort-Status und CORS-Header senden
            self.send_response(resp.status)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")

            # Nicht-hop-by-hop-Header weiterleiten
            hop_by_hop = {
                "connection", "keep-alive", "proxy-authenticate",
                "proxy-authorization", "te", "trailers", "transfer-encoding",
                "upgrade",
            }
            for key, value in resp.headers.items():
                if key.lower() not in hop_by_hop:
                    self.send_header(key, value)

            self.end_headers()

            # Antwort im Streaming-Modus zurückschreiben (wichtig für /chat/completions)
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

    def do_GET(self):
        self._forward("GET")

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else None
        self._forward("POST", body=body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()


def main():
    server = HTTPServer((PROXY_HOST, PROXY_PORT), CORSProxyHandler)
    print(f"CORS-Proxy läuft auf http://localhost:{PROXY_PORT}")
    print(f"Leitet an {LM_STUDIO_BASE} weiter")
    print("Strg+C zum Beenden\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nProxy beendet.")
        server.server_close()


if __name__ == "__main__":
    main()
