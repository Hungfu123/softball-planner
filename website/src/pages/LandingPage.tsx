import { useHead } from '@/lib/head'
import { Nav } from '@/components/Nav'
import { Hero } from '@/components/Hero'
import { Ticker } from '@/components/Ticker'
import { About } from '@/components/About'
import { Basics } from '@/components/Basics'
import { Steps } from '@/components/Steps'
import { Training } from '@/components/Training'
import { Gallery } from '@/components/Gallery'
import { Faq } from '@/components/Faq'
import { Cta } from '@/components/Cta'
import { Footer } from '@/components/Footer'
import { StickyCta } from '@/components/StickyCta'

export default function LandingPage() {
  useHead({
    title: 'Dead Sox - Softball in Düsseldorf',
    description:
      'Die Dead Sox sind das Mixed-Fastpitch-Softballteam des Düsseldorfer Hochschulsports. Komm zum Probetraining: Ausrüstung stellt das Team.',
  })

  return (
    <>
      <Nav />
      <main id="inhalt">
        <Hero />
        <Ticker />
        <About />
        <Basics />
        <Steps />
        <Training />
        <Gallery />
        <Faq />
        <Cta />
      </main>
      <StickyCta />
      <Footer />
    </>
  )
}
