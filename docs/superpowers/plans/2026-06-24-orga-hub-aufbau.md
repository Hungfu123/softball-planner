# Orga-Hub + Aufbau-Heimspieltag-Katalog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/orga` wird ein Hub mit Einladungen + „Aufbau Heimspieltag" (globaler Material-Katalog, kein Spieltag-Bezug); das Item-Formular wird DRY geteilt.

**Architecture:** Reuse der bestehenden Equipment-Persistenz/Service. Zwei neue gameday-lose REST-Endpoints (`GET`/`POST /api/equipment`). Frontend: geteilte `EquipmentItemForm`, neue `EquipmentCatalogPage` + `useEquipmentCatalog`-Hook, `/orga`-Hub mit Sub-Routen, GameDay-Button „Material"→„Aufbau".

**Tech Stack:** Java 21 / Spring Boot 3.4.3 (backend), React 19 / TypeScript / Vite / Tailwind v4 / React Router DOM 7 (frontend).

## Global Constraints

- Maven IMMER mit `-s .mvn/local-settings.xml` (Backend). Niemals `~/.m2/settings.xml` anfassen. Backend-Tests brauchen Docker (Testcontainers).
- Onion: domain kennt kein Spring/JPA/DTO; application nur domain; adapter implementiert ports. KEINE Migration, KEIN neues Domain-Modell, KEINE neuen Ports nötig (Katalog existiert als `equipment_item`).
- DTOs Java-Records mit Bean-Validation; Fehler via BusinessValidationException(400)/ResourceNotFoundException(404).
- Frontend: Path-Alias `@/`. Nur eigene SVG-Icons aus `src/icons/index.tsx` (kein lucide für neue Icons; `Mail` aus lucide ist bestehend in Layout). Tailwind v4; Bracket-Werte sind im Code etabliert und erlaubt. Modals dark backdrop, kein `confirm()` (nutze `ConfirmModal` aus `@/components/shared`). Hover-reveal Edit/Delete (Desktop), mobil immer sichtbar. German UI.
- Bestehende Routen liegen unter `Layout` in `App.tsx`.
- Conventional commits mit gitmoji-Prefix, KEIN `Co-Authored-By`.
- Pre-Commit nicht-trivial: `npm run build` (frontend) + `./mvnw test -s .mvn/local-settings.xml` (backend).
- Sandbox-Hinweis: falls Bash mit bwrap loopback "Operation not permitted" scheitert → mit dangerouslyDisableSandbox erneut.

---

## File Structure

**Backend (modify):**
- `adapter/in/web/EquipmentController.java` — 2 Endpoints ergänzen (`GET`/`POST /api/equipment`)
- Test: `integration/EquipmentIntegrationTest.java` — 2 Methoden ergänzen

**Frontend (neu):**
- `src/components/equipment/EquipmentItemForm.tsx` — geteilte Form (aus MaterialSheet extrahiert)
- `src/components/equipment/EquipmentCatalogPage.tsx` — `/orga/aufbau`
- `src/components/orga/OrgaHome.tsx` — `/orga` Hub (2 Kacheln)
- `src/hooks/useEquipmentCatalog.ts`

**Frontend (modify):**
- `src/components/planner/MaterialSheet.tsx` — lokales `ItemForm` raus, geteilte Form importieren
- `src/types/index.ts` — `EquipmentCatalogItem`
- `src/api/client.ts` — `getEquipmentCatalog`, `createEquipmentItem`
- `src/App.tsx` — Routen `/orga`, `/orga/einladungen`, `/orga/aufbau`
- `src/components/planner/GameDayPlanner.tsx` — Button-Label „Material"→„Aufbau"

---

### Task 1: Backend — gameday-lose Katalog-Endpoints

**Files:**
- Modify: `backend/src/main/java/com/softball/adapter/in/web/EquipmentController.java`
- Test: `backend/src/test/java/com/softball/integration/EquipmentIntegrationTest.java`

**Interfaces:**
- Consumes: `EquipmentService.findAll()` → `List<EquipmentItem>`; `EquipmentService.create(String name, String category, int quantity, String storageLocation, String notes)` → `EquipmentItem`; `EquipmentResponse.from(EquipmentItem)`; `EquipmentRequest` record `{name, category, quantity, storageLocation, notes}`.
- Produces: `GET /api/equipment` → `List<EquipmentResponse>`; `POST /api/equipment` (`@Valid EquipmentRequest`) → 201 `EquipmentResponse`.

- [ ] **Step 1: Failing-Tests ergänzen**

In `EquipmentIntegrationTest.java` zwei Methoden hinzufügen (nach den bestehenden Test-Methoden, vor dem `createGameDay`-Helper):

```java
    @Test
    void catalog_postThenGet_listsItem() throws Exception {
        mockMvc.perform(post("/api/equipment")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of(
                    "name", "Kalk", "category", "Spielmaterial", "quantity", 2,
                    "storageLocation", "Garage", "notes", "Linien ziehen"))))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Kalk"))
            .andExpect(jsonPath("$.quantity").value(2));

        mockMvc.perform(get("/api/equipment"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].name").value("Kalk"))
            .andExpect(jsonPath("$[0].storageLocation").value("Garage"));
    }

    @Test
    void catalog_getEmptyByDefault() throws Exception {
        mockMvc.perform(get("/api/equipment"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }
```

- [ ] **Step 2: Test laufen lassen — muss fehlschlagen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=EquipmentIntegrationTest`
Expected: FAIL — `POST /api/equipment` existiert noch nicht (SPA-Fallback/HTML statt 201, jsonPath schlägt fehl).

- [ ] **Step 3: Endpoints im Controller ergänzen**

In `EquipmentController.java` zwei Handler hinzufügen (z.B. nach dem bestehenden `update`-Handler). Der `EquipmentResponse`-Import existiert bereits.

```java
    @GetMapping("/equipment")
    public java.util.List<EquipmentResponse> getCatalog() {
        return equipmentService.findAll().stream().map(EquipmentResponse::from).toList();
    }

    @PostMapping("/equipment")
    @org.springframework.web.bind.annotation.ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public EquipmentResponse createCatalogItem(@jakarta.validation.Valid @org.springframework.web.bind.annotation.RequestBody final EquipmentRequest req) {
        return EquipmentResponse.from(equipmentService.create(
            req.name(), req.category(), req.quantity(), req.storageLocation(), req.notes()));
    }
```

(Falls die Klasse bereits `HttpStatus`, `ResponseStatus`, `Valid`, `RequestBody`, `List` importiert — bestehende Imports nutzen statt FQN. FQN ist nur zur Sicherheit, damit es ohne Import-Wissen kompiliert.)

- [ ] **Step 4: Test laufen lassen — muss bestehen**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml -Dtest=EquipmentIntegrationTest`
Expected: PASS (alle Methoden inkl. der zwei neuen).

- [ ] **Step 5: Volle Suite**

Run: `cd backend && ./mvnw test -s .mvn/local-settings.xml`
Expected: PASS, keine Regression.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/softball/adapter/in/web/EquipmentController.java \
  backend/src/test/java/com/softball/integration/EquipmentIntegrationTest.java
git commit -m "✨ BE: Equipment-Katalog-Endpoints — GET/POST /api/equipment (ohne Spieltag)"
```

---

### Task 2: Frontend — geteilte EquipmentItemForm + API-Client + Typ + Hook

**Files:**
- Create: `frontend/src/components/equipment/EquipmentItemForm.tsx`
- Modify: `frontend/src/components/planner/MaterialSheet.tsx`
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/api/client.ts`
- Create: `frontend/src/hooks/useEquipmentCatalog.ts`

**Interfaces:**
- Consumes: `EquipmentInput`, `EquipmentItem` (bestehend in `@/types`); `request<T>` (api/client); existing `updateEquipment(itemId, input)`, `deleteEquipment(itemId)`.
- Produces:
  - `EquipmentItemForm` component, props `{ initial: EquipmentInput | EquipmentItem | EquipmentCatalogItem; onCancel: () => void; onSubmit: (input: EquipmentInput) => Promise<void> }`; also exports `CATEGORY_SUGGESTIONS: string[]`, `LOCATION_SUGGESTIONS: string[]`, `EMPTY_EQUIPMENT_INPUT: EquipmentInput`.
  - Type `EquipmentCatalogItem = Omit<EquipmentItem, 'used'>`.
  - `getEquipmentCatalog(): Promise<EquipmentCatalogItem[]>`, `createEquipmentItem(input: EquipmentInput): Promise<EquipmentCatalogItem>`.
  - Hook `useEquipmentCatalog()` → `{ items: EquipmentCatalogItem[], loading, add, edit, remove, reload }`.

- [ ] **Step 1: Geteilte EquipmentItemForm erstellen**

Create `frontend/src/components/equipment/EquipmentItemForm.tsx`:

```tsx
import { useState, useId } from 'react'
import type { EquipmentInput, EquipmentItem } from '@/types'

export const CATEGORY_SUGGESTIONS = ['Aufbau', 'Spielmaterial', 'Catering']
export const LOCATION_SUGGESTIONS = ['Garage', 'Raum']
export const EMPTY_EQUIPMENT_INPUT: EquipmentInput = {
  name: '', category: 'Aufbau', quantity: 1, storageLocation: '', notes: '',
}

interface Props {
  initial: EquipmentInput | EquipmentItem | Omit<EquipmentItem, 'used'>
  onCancel: () => void
  onSubmit: (input: EquipmentInput) => Promise<void>
}

export function EquipmentItemForm({ initial, onCancel, onSubmit }: Props) {
  const uid = useId()
  const catListId = `cat-${uid}`
  const locListId = `loc-${uid}`
  const [name, setName] = useState(initial.name)
  const [category, setCategory] = useState(initial.category || 'Aufbau')
  const [quantity, setQuantity] = useState(initial.quantity || 1)
  const [storageLocation, setStorageLocation] = useState(initial.storageLocation ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await onSubmit({ name: name.trim(), category: category.trim() || 'Sonstiges', quantity, storageLocation: storageLocation.trim() || null, notes: notes.trim() || null })
    } finally { setSaving(false) }
  }

  return (
    <div className="bg-cream-100 border border-cream-300 rounded-lg p-3 space-y-2 mx-2 my-2">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Name (z.B. Pavillon)" autoFocus
        className="w-full px-2 py-1.5 rounded border border-cream-300 text-sm" />
      <div className="flex gap-2">
        <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Kategorie" list={catListId}
          className="flex-1 px-2 py-1.5 rounded border border-cream-300 text-sm" />
        <input type="number" min={0} value={quantity} onChange={e => setQuantity(Math.max(0, Number(e.target.value)))}
          className="w-20 px-2 py-1.5 rounded border border-cream-300 text-sm tabular-nums" />
      </div>
      <datalist id={catListId}>{CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}</datalist>
      <input value={storageLocation} onChange={e => setStorageLocation(e.target.value)} placeholder="Lagerort (z.B. Garage)" list={locListId}
        className="w-full px-2 py-1.5 rounded border border-cream-300 text-sm" />
      <datalist id={locListId}>{LOCATION_SUGGESTIONS.map(l => <option key={l} value={l} />)}</datalist>
      <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notiz (optional)"
        className="w-full px-2 py-1.5 rounded border border-cream-300 text-sm" />
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-cream-200 rounded cursor-pointer">Abbrechen</button>
        <button onClick={submit} disabled={!name.trim() || saving}
          className="px-3 py-1.5 text-sm font-bold text-white bg-navy-800 hover:bg-navy-900 rounded cursor-pointer disabled:opacity-50">Speichern</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: MaterialSheet auf die geteilte Form umstellen**

In `frontend/src/components/planner/MaterialSheet.tsx`:
- Den lokalen Block ENTFERNEN: das `interface FormProps { ... }` und die ganze `function ItemForm(...) { ... }` (am Dateiende), sowie die jetzt geteilten Konstanten `const CATEGORY_SUGGESTIONS = ...`, `const LOCATION_SUGGESTIONS = ...`, `const emptyInput: EquipmentInput = ...`.
- Import ergänzen (oben):
```tsx
import { EquipmentItemForm, EMPTY_EQUIPMENT_INPUT } from '@/components/equipment/EquipmentItemForm'
```
- Alle JSX-Verwendungen `<ItemForm ... />` → `<EquipmentItemForm ... />` umbenennen.
- Die Verwendung mit `initial={emptyInput}` → `initial={EMPTY_EQUIPMENT_INPUT}`.
- `useId` aus dem `react`-Import von MaterialSheet entfernen, falls nach Entfernen von `ItemForm` nicht mehr genutzt (prüfen: wird `useId` sonst noch verwendet? Wenn nein, aus `import { useMemo, useState, useId } from 'react'` streichen → `import { useMemo, useState } from 'react'`).
- `EquipmentInput`-Import in MaterialSheet bleibt nur, falls noch referenziert; sonst aus dem `type`-Import entfernen, damit kein „unused"-Lint kommt.

- [ ] **Step 3: Typ + API-Client ergänzen**

In `frontend/src/types/index.ts` am Ende anhängen:

```typescript
export type EquipmentCatalogItem = Omit<EquipmentItem, 'used'>
```

In `frontend/src/api/client.ts`: `EquipmentCatalogItem` zum Typ-Import oben hinzufügen, dann am Dateiende:

```typescript
export const getEquipmentCatalog = () =>
  request<EquipmentCatalogItem[]>('/equipment')
export const createEquipmentItem = (input: EquipmentInput) =>
  request<EquipmentCatalogItem>('/equipment', { method: 'POST', body: JSON.stringify(input) })
```

(`updateEquipment` und `deleteEquipment` existieren bereits und werden vom Katalog-Hook wiederverwendet.)

- [ ] **Step 4: useEquipmentCatalog-Hook erstellen**

Create `frontend/src/hooks/useEquipmentCatalog.ts`:

```typescript
import { useState, useCallback, useEffect } from 'react'
import type { EquipmentCatalogItem, EquipmentInput } from '@/types'
import * as api from '@/api/client'

export function useEquipmentCatalog() {
  const [items, setItems] = useState<EquipmentCatalogItem[]>([])
  const [loading, setLoading] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try { setItems(await api.getEquipmentCatalog()) } finally { setLoading(false) }
  }, [])

  useEffect(() => { void reload() }, [reload])

  const add = useCallback(async (input: EquipmentInput) => {
    const created = await api.createEquipmentItem(input)
    setItems(prev => [...prev, created])
    return created
  }, [])

  const edit = useCallback(async (itemId: number, input: EquipmentInput) => {
    const updated = await api.updateEquipment(itemId, input)
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...updated } : i))
  }, [])

  const remove = useCallback(async (itemId: number) => {
    await api.deleteEquipment(itemId)
    setItems(prev => prev.filter(i => i.id !== itemId))
  }, [])

  return { items, loading, add, edit, remove, reload }
}
```

- [ ] **Step 5: Lint + Build**

Run: `cd frontend && npm run lint && npm run build`
Expected: 0 ESLint-Fehler (Warnings ok), tsc/vite build PASS. Falls MaterialSheet einen unused-Import (`useId`/`EquipmentInput`) meldet → entfernen.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/equipment/EquipmentItemForm.tsx \
  frontend/src/components/planner/MaterialSheet.tsx \
  frontend/src/types/index.ts frontend/src/api/client.ts \
  frontend/src/hooks/useEquipmentCatalog.ts
git commit -m "♻️ FE: EquipmentItemForm extrahiert (geteilt) + Katalog-API/Hook/Typ"
```

---

### Task 3: Frontend — EquipmentCatalogPage (`/orga/aufbau`)

**Files:**
- Create: `frontend/src/components/equipment/EquipmentCatalogPage.tsx`

**Interfaces:**
- Consumes: `useEquipmentCatalog()` (Task 2), `EquipmentItemForm` + `EMPTY_EQUIPMENT_INPUT` (Task 2), `EquipmentCatalogItem` type, icons `PlusCircle, Pencil, TrashBin, AlertTriangle, CrossBones` from `@/icons`, `ConfirmModal` + `EmptyState` from `@/components/shared`, `useToastContext` from `@/components/layout/Layout`.
- Produces: default-exported `EquipmentCatalogPage` React component (no props), used by the router.

- [ ] **Step 1: Komponente erstellen**

Create `frontend/src/components/equipment/EquipmentCatalogPage.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { useEquipmentCatalog } from '@/hooks/useEquipmentCatalog'
import { useToastContext } from '@/components/layout/Layout'
import { ConfirmModal, EmptyState } from '@/components/shared'
import { EquipmentItemForm, EMPTY_EQUIPMENT_INPUT } from './EquipmentItemForm'
import { PlusCircle, Pencil, TrashBin, AlertTriangle, CrossBones } from '@/icons'
import type { EquipmentCatalogItem } from '@/types'

type GroupMode = 'category' | 'location'

export default function EquipmentCatalogPage() {
  const { items, loading, add, edit, remove } = useEquipmentCatalog()
  const toast = useToastContext()
  const [groupMode, setGroupMode] = useState<GroupMode>('category')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleteItem, setDeleteItem] = useState<EquipmentCatalogItem | null>(null)
  const [expandedNote, setExpandedNote] = useState<number | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, EquipmentCatalogItem[]>()
    for (const i of items) {
      const key = groupMode === 'category' ? (i.category || 'Sonstiges') : (i.storageLocation?.trim() || 'Ohne Ort')
      const arr = map.get(key) ?? []
      arr.push(i)
      map.set(key, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de'))
  }, [items, groupMode])

  const handleDelete = async () => {
    if (!deleteItem) return
    try { await remove(deleteItem.id); toast.show(`„${deleteItem.name}" gelöscht`) }
    catch (e) { toast.show((e as Error).message, 'error') }
    finally { setDeleteItem(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-display text-xl sm:text-2xl font-extrabold text-navy-900 tracking-wide uppercase">
          Aufbau Heimspieltag
        </h1>
        <div className="flex bg-cream-100 border border-cream-300 rounded-lg p-0.5">
          <button onClick={() => setGroupMode('category')}
            className={`px-3 h-8 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors ${groupMode === 'category' ? 'bg-navy-800 text-white' : 'text-navy-700'}`}>
            Kategorie
          </button>
          <button onClick={() => setGroupMode('location')}
            className={`px-3 h-8 text-xs font-bold uppercase tracking-wider rounded-md cursor-pointer transition-colors ${groupMode === 'location' ? 'bg-navy-800 text-white' : 'text-navy-700'}`}>
            Lagerort
          </button>
        </div>
      </div>
      <p className="text-sm text-gray-500 -mt-2">Was brauchen wir, wo liegt es. Abhaken passiert am jeweiligen Spieltag.</p>

      <div className="bg-cream-50 border border-cream-300 rounded-xl overflow-hidden">
        {loading ? (
          <p className="text-center text-sm text-gray-400 py-10">Lädt…</p>
        ) : items.length === 0 ? (
          <EmptyState icon={<CrossBones size={40} className="opacity-30" />} title="Noch keine Sachen"
            message="Leg den Heimspieltag-Aufbau an — baut sich nach und nach auf." />
        ) : groups.map(([groupName, groupItems]) => (
          <div key={groupName} className="border-b border-cream-200 last:border-b-0">
            <div className="px-3 pt-3 pb-1 font-display text-[11px] font-extrabold uppercase tracking-widest text-navy-900">{groupName}</div>
            {groupItems.map(item => (
              <div key={item.id} className="group flex items-center gap-2 min-h-[48px] px-3 hover:bg-cream-100">
                <div className="flex-1 min-w-0 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-navy-900 truncate">{item.name}</span>
                    <span className="text-xs text-gray-400 tabular-nums shrink-0">×{item.quantity}</span>
                    {item.notes && (
                      <button onClick={() => setExpandedNote(expandedNote === item.id ? null : item.id)} aria-label="Notiz" className="shrink-0 cursor-pointer">
                        <AlertTriangle size={13} className="text-amber-400" />
                      </button>
                    )}
                  </div>
                  {item.storageLocation && groupMode === 'category' && (
                    <span className="inline-block mt-0.5 text-[11px] bg-cream-100 text-navy-800 px-1.5 py-0.5 rounded">📍 {item.storageLocation}</span>
                  )}
                  {expandedNote === item.id && item.notes && (
                    <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setEditingId(item.id)} aria-label="Bearbeiten" className="p-1.5 text-gray-400 hover:text-navy-700 cursor-pointer"><Pencil size={14} /></button>
                  <button onClick={() => setDeleteItem(item)} aria-label="Löschen" className="p-1.5 text-gray-400 hover:text-softball-red-600 cursor-pointer"><TrashBin size={14} /></button>
                </div>
              </div>
            ))}
            {editingId != null && groupItems.some(i => i.id === editingId) && (
              <EquipmentItemForm
                initial={groupItems.find(i => i.id === editingId)!}
                onCancel={() => setEditingId(null)}
                onSubmit={async input => { await edit(editingId, input); setEditingId(null) }}
              />
            )}
          </div>
        ))}
        {adding && (
          <EquipmentItemForm
            initial={EMPTY_EQUIPMENT_INPUT}
            onCancel={() => setAdding(false)}
            onSubmit={async input => { await add(input); setAdding(false) }}
          />
        )}
      </div>

      <button onClick={() => setAdding(true)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-navy-800 text-white font-bold text-sm hover:bg-navy-900 cursor-pointer">
        <PlusCircle size={18} /> Sache hinzufügen
      </button>

      {deleteItem && (
        <ConfirmModal
          title="Aus Katalog löschen"
          message={`„${deleteItem.name}" dauerhaft aus dem Katalog löschen? Wird aus allen Spieltagen entfernt.`}
          confirmLabel="Löschen"
          onConfirm={handleDelete}
          onCancel={() => setDeleteItem(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: EmptyState-Props prüfen**

Run: `cd frontend && grep -n "export function EmptyState\|interface\|icon\|title\|message" src/components/shared/EmptyState.tsx`
Expected: bestätigt die Props `icon`, `title`, `message`. Falls die Signatur abweicht (z.B. andere Prop-Namen oder kein `icon`), die `<EmptyState .../>`-Verwendung in Step 1 an die echte Signatur anpassen (sonst tsc-Fehler in Step 3).

- [ ] **Step 3: Build**

Run: `cd frontend && npm run build`
Expected: tsc/vite PASS. (Noch nicht geroutet — Komponente wird in Task 4 eingehängt; sie ist hier eigenständig kompilierbar.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/equipment/EquipmentCatalogPage.tsx
git commit -m "✨ FE: EquipmentCatalogPage — globale Aufbau-Stammliste (Kategorie/Lagerort, CRUD)"
```

---

### Task 4: Frontend — Orga-Hub, Routing, GameDay-Button-Rename

**Files:**
- Create: `frontend/src/components/orga/OrgaHome.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/planner/GameDayPlanner.tsx`

**Interfaces:**
- Consumes: `EquipmentCatalogPage` (Task 3, default export), existing `InvitationListPage` (named export `@/components/orga/InvitationListPage`), `Card` from `@/components/shared`, icons `ClipboardListIcon` from `@/icons`, `Mail` from `lucide-react` (already used in Layout — ok for this hub tile to match nav).
- Produces: named export `OrgaHome`; routes `/orga` (hub), `/orga/einladungen` (InvitationListPage), `/orga/aufbau` (EquipmentCatalogPage).

- [ ] **Step 1: OrgaHome-Hub erstellen**

Create `frontend/src/components/orga/OrgaHome.tsx`:

```tsx
import { Link } from 'react-router-dom'
import { Card } from '@/components/shared'
import { ClipboardListIcon } from '@/icons'
import { Mail } from 'lucide-react'

export function OrgaHome() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-xl sm:text-2xl font-extrabold text-navy-900 tracking-wide uppercase">Orga</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/orga/einladungen">
          <Card padding="lg" className="hover:border-navy-400 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 text-white shrink-0"><Mail size={20} /></span>
              <div>
                <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">Einladungen</div>
                <div className="text-xs text-gray-500 mt-0.5">Einladungsschreiben für Heimspieltage</div>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/orga/aufbau">
          <Card padding="lg" className="hover:border-navy-400 hover:shadow-md transition-all cursor-pointer h-full">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-navy-800 text-white shrink-0"><ClipboardListIcon size={20} /></span>
              <div>
                <div className="font-display text-sm font-extrabold uppercase tracking-widest text-navy-900">Aufbau Heimspieltag</div>
                <div className="text-xs text-gray-500 mt-0.5">Was brauchen wir, wo liegt es</div>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Routing in App.tsx anpassen**

In `frontend/src/App.tsx`:
- Import `InvitationListPage` bleibt. Ergänze named import für `OrgaHome` und einen lazy import für `EquipmentCatalogPage` (Heavy-Page-Konvention; default-export):
```tsx
import { OrgaHome } from '@/components/orga/OrgaHome'
```
und bei den `lazy(...)`-Deklarationen oben:
```tsx
const EquipmentCatalogPage = lazy(() => import('@/components/equipment/EquipmentCatalogPage'))
```
- Die bestehende Route ` { path: '/orga', element: <InvitationListPage />, errorElement: <ChunkErrorBoundary /> },` ERSETZEN durch drei Routen:
```tsx
      { path: '/orga', element: <OrgaHome />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/einladungen', element: <InvitationListPage />, errorElement: <ChunkErrorBoundary /> },
      { path: '/orga/aufbau', element: <Suspense fallback={<LoadingSkeleton />}><EquipmentCatalogPage /></Suspense>, errorElement: <ChunkErrorBoundary /> },
```
(`Suspense` + `LoadingSkeleton` werden in App.tsx bereits für andere lazy-Pages genutzt — gleiche Imports verwenden.)

- [ ] **Step 3: GameDay-Button „Material" → „Aufbau"**

In `frontend/src/components/planner/GameDayPlanner.tsx`:
- Mobile `ToolbarBtn` (um Zeile 599): `label="Material"` → `label="Aufbau"`.
- Desktop-Button (um Zeile 671–676): `title="Material / Aufbau"` → `title="Aufbau Heimspieltag"`, und `<span>Material</span>` → `<span>Aufbau</span>`.
- Icon `ClipboardListIcon` + `showMaterial`-State + `<MaterialSheet/>` bleiben unverändert.

- [ ] **Step 4: Lint + Build**

Run: `cd frontend && npm run lint && npm run build`
Expected: 0 ESLint-Fehler, tsc/vite PASS.

- [ ] **Step 5: Manuell verifizieren (lokal, Docker)**

```bash
docker compose up -d db
cd backend && ./mvnw spring-boot:run -s .mvn/local-settings.xml
cd frontend && npx vite
```
Prüfen: Nav „Orga" → Hub mit 2 Kacheln. „Einladungen" → bestehende Liste (unter `/orga/einladungen`). „Aufbau Heimspieltag" → Katalog, Sache anlegen → reload-fest, Kategorie↔Lagerort, Edit, Delete (ConfirmModal). GameDay → Button heißt „Aufbau", Sheet funktioniert wie zuvor.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/orga/OrgaHome.tsx frontend/src/App.tsx \
  frontend/src/components/planner/GameDayPlanner.tsx
git commit -m "✨ FE: /orga-Hub (Einladungen + Aufbau Heimspieltag) + Button-Rename Material→Aufbau"
```

---

## Self-Review

**Spec-Coverage:**
- `/orga` Hub mit 2 Kacheln → Task 4 (OrgaHome) ✓
- `/orga/einladungen` = bestehende Liste verschoben → Task 4 Routing ✓
- `/orga/aufbau` = globaler Katalog, kein Spieltag/used → Task 3 (EquipmentCatalogPage) + Task 1 (GET/POST /api/equipment) ✓
- Kategorie↔Lagerort-Toggle, Edit/Delete (ConfirmModal mit „alle Spieltage"-Warnung), Notiz-`!`, Leerstate → Task 3 ✓
- DRY: EquipmentItemForm extrahiert, MaterialSheet nutzt sie → Task 2 ✓
- Backend: GET/POST /api/equipment via findAll()/create(), PUT/DELETE bestehen → Task 1 ✓
- API-Client getEquipmentCatalog/createEquipmentItem, Typ EquipmentCatalogItem, Hook useEquipmentCatalog → Task 2 ✓
- GameDay-Button „Material"→„Aufbau" → Task 4 ✓
- Tests: BE Integration GET/POST → Task 1; FE build/lint → Tasks 2-4 ✓

**Placeholder-Scan:** Keine TBD/TODO; voller Code je Schritt. Die FQN-Imports in Task 1 Step 3 sind bewusst (kompiliert ohne Import-Wissen). ✓

**Typ-Konsistenz:** `EquipmentCatalogItem = Omit<EquipmentItem,'used'>` in Task 2 definiert, in Tasks 2-3 (Hook, Page, API) konsistent genutzt. `EquipmentItemForm`-Props/Exports (`EMPTY_EQUIPMENT_INPUT`, `CATEGORY_SUGGESTIONS`, `LOCATION_SUGGESTIONS`) in Task 2 definiert, in Tasks 2-3 genutzt. Endpoints `GET/POST /api/equipment` (Task 1) = API-Client-URLs (Task 2). ✓

**Annahme zu prüfen (in Task 3 Step 2 abgesichert):** `EmptyState`-Props (`icon`/`title`/`message`) — falls abweichend, Verwendung anpassen.
