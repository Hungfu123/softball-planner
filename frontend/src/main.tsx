import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import '@/styles/index.css'
import App from './App'

/* reducedMotion="user" laesst Framer Motion die Systemeinstellung respektieren:
   Transform- und Opacity-Animationen werden dann uebersprungen statt abgespielt.
   Ohne das lief z.B. die komplette Laeufer-Animation im DiamondView (8 Motion-
   Animationen) auch fuer Leute, die Bewegung abgeschaltet haben — die ScoringPage
   pruefte `prefers-reduced-motion` nur fuer ihre Flash-Overlays und die Vibration. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
