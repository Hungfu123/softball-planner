#!/bin/bash
# Kompiliert die Drill-PDF aus den Typst-Quellen, kopiert sie in die App
# und synchronisiert die pdfPage-Nummern in drills.json automatisch.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DRILLS_JSON="$SCRIPT_DIR/../backend/src/main/resources/drills.json"
cd "$SCRIPT_DIR"

echo "Kompiliere drills.pdf..."
typst compile drills.typ drills.pdf

echo "Kopiere nach backend/src/main/resources/static/..."
cp drills.pdf ../backend/src/main/resources/static/drills.pdf

echo "Synchronisiere pdfPage-Nummern in drills.json..."
typst query drills.typ "<drill-page>" --field value | python3 -c "
import json, sys

# Seitenzahlen aus Typst-Query lesen (Name → Seite)
pages = {entry['name']: entry['page'] for entry in json.load(sys.stdin)}

# drills.json laden
with open('$DRILLS_JSON') as f:
    drills = json.load(f)

updated = 0
missing = []
for drill in drills:
    name = drill['name']
    if name in pages:
        new_page = pages[name]
        if drill.get('pdfPage') != new_page:
            print(f'  ✓ {name}: {drill.get(\"pdfPage\")} → {new_page}')
            drill['pdfPage'] = new_page
            updated += 1
    else:
        missing.append(name)

# Drills in Typst die nicht in JSON sind
json_names = {d['name'] for d in drills}
new_in_typst = [name for name in pages if name not in json_names]

# Zurückschreiben
with open('$DRILLS_JSON', 'w') as f:
    json.dump(drills, f, indent=2, ensure_ascii=False)
    f.write('\n')

if updated:
    print(f'  {updated} pdfPage-Nummern aktualisiert.')
else:
    print('  Alle pdfPage-Nummern stimmen bereits.')

if missing:
    print(f'  ⚠ {len(missing)} Drills in JSON ohne Match in PDF:')
    for m in missing:
        print(f'    - {m}')

if new_in_typst:
    print(f'  ⚠ {len(new_in_typst)} Drills in PDF ohne Match in JSON (fehlen in drills.json!):')
    for n in new_in_typst:
        print(f'    - {n} (Seite {pages[n]})')
"

echo "Fertig — $(wc -c < drills.pdf | tr -d ' ') bytes"
