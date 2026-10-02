/**
 * Marker + Klassen für Portal-Overlays, die über einem offenen Radix-Layer liegen
 * (vaul-Drawer = ResponsiveSheet unter 640px). Genauer erklärt in `PortalOverlay.tsx`.
 *
 * Hier nur die Konstanten, damit jede Datei entweder nur Components exportiert
 * (Vite Fast Refresh) — der Overlay-Baustein selbst steht in `PortalOverlay.tsx`.
 */

/** Marker für Overlays mit eigener Struktur: schützt vor vauls Outside-Dismiss. */
export const portalOverlayAttrs = { 'data-portal-overlay': '' } as const

/** Für Overlays mit eigener Struktur: bricht den geerbten body-Lock. */
export const portalOverlayClickable = 'pointer-events-auto'