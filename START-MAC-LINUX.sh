#!/bin/bash
echo "FireRed / LeafGreen TCG - Starting server..."
if command -v python3 &>/dev/null; then
  (sleep 1 && open "http://localhost:8080" 2>/dev/null || xdg-open "http://localhost:8080" 2>/dev/null) &
  python3 -m http.server 8080; exit 0
fi
if command -v python &>/dev/null; then
  (sleep 1 && open "http://localhost:8080" 2>/dev/null || xdg-open "http://localhost:8080" 2>/dev/null) &
  python -m SimpleHTTPServer 8080; exit 0
fi
if command -v npx &>/dev/null; then
  (sleep 2 && open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000" 2>/dev/null) &
  npx serve . -l 3000; exit 0
fi
echo "ERROR: Python or Node.js not found. Install from https://www.python.org/downloads/"
