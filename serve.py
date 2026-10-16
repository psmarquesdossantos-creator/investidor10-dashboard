#!/usr/bin/env python3
"""
Serve.py - Servidor HTTP seguro para investidor10-dashboard
Headers CSP, X-Content-Type-Options, limite upload 5MB, sanitização
"""

import http.server
import socketserver
import socket
import os
import mimetypes
from pathlib import Path

PORT = 8765
MAX_UPLOAD_SIZE = 5 * 1024 * 1024  # 5MB
ALLOWED_EXTENSIONS = {'.json', '.csv'}

class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

class SecureHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(Path(__file__).parent), **kwargs)
    
    def end_headers(self):
        # CSP - Content Security Policy (restritiva: sem unsafe-inline)
        self.send_header('Content-Security-Policy',
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' https://fonts.googleapis.com; "
            "font-src 'self' https://fonts.gstatic.com; "
            "img-src 'self' data: https:; "
            "connect-src 'self' https://brapi.dev; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self'")

        # Security Headers
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('X-Frame-Options', 'DENY')
        self.send_header('X-XSS-Protection', '1; mode=block')
        self.send_header('Referrer-Policy', 'strict-origin-when-cross-origin')
        self.send_header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Resource-Policy', 'same-origin')

        # Cache control para arquivos sensíveis
        if self.path.endswith('.json') or self.path.endswith('.csv') or self.path.startswith('/carteira-data.js'):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, private')
            self.send_header('Pragma', 'no-cache')
            self.send_header('Expires', '0')

        super().end_headers()
    
    def do_POST(self):
        """Handle file uploads with size and type validation"""
        if self.path == '/upload':
            content_length = int(self.headers.get('Content-Length', 0))
            
            # Verifica tamanho
            if content_length > MAX_UPLOAD_SIZE:
                self.send_error(413, 'Arquivo muito grande. Máximo 5MB.')
                return
            
            # Verifica Content-Type
            content_type = self.headers.get('Content-Type', '')
            if 'multipart/form-data' not in content_type:
                self.send_error(400, 'Content-Type deve ser multipart/form-data')
                return
            
            # Parse multipart (simplificado)
            try:
                boundary = content_type.split('boundary=')[1].encode()
                body = self.rfile.read(content_length)
                parts = body.split(b'--' + boundary)
                
                filename = None
                file_content = None
                
                for part in parts:
                    if b'filename=' in part:
                        # Extrai filename
                        header_end = part.find(b'\r\n\r\n')
                        headers = part[:header_end].decode('utf-8', errors='ignore')
                        for line in headers.split('\r\n'):
                            if 'filename=' in line:
                                filename = line.split('filename=')[1].strip('"')
                                break
                        file_content = part[header_end+4:-2]  # Remove headers e \r\n
                        break
                
                if not filename:
                    self.send_error(400, 'Nenhum arquivo enviado')
                    return
                
                # Valida extensão
                ext = os.path.splitext(filename)[1].lower()
                if ext not in ALLOWED_EXTENSIONS:
                    self.send_error(400, f'Extensão não permitida. Permitidas: {", ".join(ALLOWED_EXTENSIONS)}')
                    return
                
                # Sanitiza filename
                safe_filename = os.path.basename(filename)
                safe_filename = ''.join(c for c in safe_filename if c.isalnum() or c in '._-')
                
                # Salva arquivo
                upload_dir = Path(self.directory) / 'uploads'
                upload_dir.mkdir(exist_ok=True)
                file_path = upload_dir / safe_filename
                
                with open(file_path, 'wb') as f:
                    f.write(file_content)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(f'{{"status": "success", "filename": "{safe_filename}", "size": {len(file_content)}}}'.encode())
                
            except Exception as e:
                self.send_error(500, f'Erro no upload: {str(e)}')
        else:
            self.send_error(404, 'Endpoint não encontrado')
    
    def guess_type(self, path):
        """Override para adicionar tipos MIME corretos"""
        mimetype = super().guess_type(path)
        if path.endswith('.js'):
            return 'application/javascript'
        if path.endswith('.json'):
            return 'application/json'
        if path.endswith('.csv'):
            return 'text/csv'
        return mimetype

if __name__ == '__main__':
    os.chdir(Path(__file__).parent)
    
    with ThreadingHTTPServer(("", PORT), SecureHandler) as httpd:
        print(f"🚀 Servidor seguro rodando em http://localhost:{PORT}")
        print(f"   CSP: Ativo")
        print(f"   Max upload: {MAX_UPLOAD_SIZE/1024/1024}MB")
        print(f"   Extensões permitidas: {', '.join(ALLOWED_EXTENSIONS)}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Servidor parado")