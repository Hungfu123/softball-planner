#!/bin/bash
# Kompiliert die Drill-PDF aus den Typst-Quellen und kopiert sie in die App
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "Kompiliere drills.pdf..."
typst compile drills.typ drills.pdf

echo "Kopiere nach backend/src/main/resources/static/..."
cp drills.pdf ../backend/src/main/resources/static/drills.pdf

echo "Fertig — $(wc -c < drills.pdf | tr -d ' ') bytes"
