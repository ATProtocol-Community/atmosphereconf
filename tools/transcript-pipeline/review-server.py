"""Tiny HTTP server: serves files from ~/Desktop, accepts POST /submit
with a JSON body listing transcript changes, writes it to a known path."""
import http.server, json, os, sys

DESKTOP   = os.path.expanduser('~/Desktop')
OUT_PATH  = './work/did-submitted.json'

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('access-control-allow-origin', '*')
        super().end_headers()
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('access-control-allow-methods', 'GET,POST,OPTIONS')
        self.send_header('access-control-allow-headers', 'content-type')
        self.end_headers()
    def do_POST(self):
        if self.path == '/submit':
            n = int(self.headers.get('content-length', 0))
            body = self.rfile.read(n)
            try:
                data = json.loads(body.decode('utf-8'))
            except Exception as e:
                self.send_response(400); self.end_headers()
                self.wfile.write(f'bad json: {e}'.encode()); return
            with open(OUT_PATH, 'w') as f:
                json.dump(data, f, indent=2)
            sys.stderr.write(f'[server] wrote {len(data.get("changes", []))} changes → {OUT_PATH}\n')
            self.send_response(200)
            self.send_header('content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok":true}')
            return
        self.send_response(404); self.end_headers()

os.chdir(DESKTOP)
http.server.HTTPServer(('127.0.0.1', 8765), H).serve_forever()
