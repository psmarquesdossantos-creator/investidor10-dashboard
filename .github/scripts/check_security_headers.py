#!/usr/bin/env python3
"""
Security Headers Validation Script
Used by GitHub Actions CI/CD pipeline
"""

import urllib.request
import sys

HEADERS_TO_CHECK = [
    'Content-Security-Policy',
    'X-Content-Type-Options',
    'X-Frame-Options',
    'X-XSS-Protection',
    'Referrer-Policy',
    'Permissions-Policy',
    'Cross-Origin-Opener-Policy',
    'Cross-Origin-Resource-Policy'
]

def check_security_headers(base_url='http://localhost:8765'):
    """Validate all required security headers are present"""
    req = urllib.request.Request(f'{base_url}/index.html')
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            missing = []
            present = []
            
            for header in HEADERS_TO_CHECK:
                val = resp.headers.get(header)
                if val:
                    present.append((header, val[:100]))
                else:
                    missing.append(header)
            
            # Print results
            for header, val in present:
                print(f"OK {header}: {val}")
            
            if missing:
                for header in missing:
                    print(f"MISSING {header}")
                return False
            
            print("\nAll security headers present!")
            return True
            
    except urllib.error.URLError as e:
        print(f"ERROR: Could not connect to {base_url}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: {e}")
        return False

if __name__ == '__main__':
    success = check_security_headers()
    sys.exit(0 if success else 1)