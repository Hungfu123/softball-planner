import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, ConfirmModal } from '@/components/shared'
import { WizardStepMeta } from './WizardStepMeta'
import { WizardStepLineup } from './WizardStepLineup'
import { metaIsValid, lineupIsValid } from './wizardValidation'
import { WizardStepReview } from './WizardStepReview'
import { useToastContext } from '@/components/layout/Layout'
import { saveDraft, loadDraft, clearDraft, type WizardDraft } from '@/utils/spielbogenDraft'
import * as api from '@/api/client'
import type { CreateSpielbogenRequest, SetLineupRequest, BogenSide } from '@/types'

export default function SpielbogenWizard() {
  const navigate = useNavigate()
  const toast = useToastContext()

  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [meta, setMeta] = useState<Partial<CreateSpielbogenRequest>>({})
  const [homeLineup, setHomeLineup] = useState<SetLineupRequest['slots']>([])
  const [awayLineup, setAwayLineup] = useState<SetLineupRequest['slots']>([])
  const [submitting, setSubmitting] = useState(false)
  const [showResume, setShowResume] = useState(false)
  const [resumeDraft, setResumeDraft] = useState<WizardDraft | null>(null)

  useEffect(() => {
    const draft = loadDraft()
    if (draft) {
      setResumeDraft(draft)
      setShowResume(true)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      saveDraft({ step, meta, homeLineup, awayLineup, savedAt: Date.now() })
    }, 1000)
    return () => clearTimeout(t)
  }, [step, meta, homeLineup, awayLineup])

  const updateLineup = (side: BogenSide, slots: SetLineupRequest['slots']) => {
    if (side === 'HOME') setHomeLineup(slots)
    else setAwayLineup(slots)
  }

  const handleSaveDraft = async () => {
    setSubmitting(true)
    try {
      const created = await api.createSpielbogen(meta as CreateSpielbogenRequest)
      const homeFiltered = homeLineup.filter(s => s.name.trim())
      const awayFiltered = awayLineup.filter(s => s.name.trim())
      if (homeFiltered.length > 0) {
        await api.setSpielbogenLineup(created.id, { side: 'HOME', slots: homeFiltered })
      }
      if (awayFiltered.length > 0) {
        await api.setSpielbogenLineup(created.id, { side: 'AWAY', slots: awayFiltered })
      }
      clearDraft()
      toast.show('Entwurf gespeichert', 'success')
      navigate('/spielbogen')
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartScoring = async () => {
    setSubmitting(true)
    try {
      const created = await api.createSpielbogen(meta as CreateSpielbogenRequest)
      await api.setSpielbogenLineup(created.id, {
        side: 'HOME',
        slots: homeLineup.filter(s => s.name.trim())
      })
      await api.setSpielbogenLineup(created.id, {
        side: 'AWAY',
        slots: awayLineup.filter(s => s.name.trim())
      })
      await api.startSpielbogen(created.id)
      clearDraft()
      toast.show('Spielbogen gestartet', 'success')
      navigate(`/spielbogen/${created.id}`)
    } catch (e) {
      toast.show((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const canAdvanceStep1 = metaIsValid(meta)
  const canAdvanceStep2 = lineupIsValid(homeLineup, awayLineup)

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <Stepper step={step} />

      {step === 1 && <WizardStepMeta meta={meta} onChange={setMeta} />}
      {step === 2 && <WizardStepLineup homeLineup={homeLineup} awayLineup={awayLineup} onChange={updateLineup} />}
      {step === 3 && <WizardStepReview meta={meta} homeLineup={homeLineup} awayLineup={awayLineup} />}

      <div className="flex justify-between gap-2 pt-2 border-t border-cream-300">
        {step > 1 ? (
          <Button variant="ghost" onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}>← Zurück</Button>
        ) : (
          <Button variant="ghost" onClick={() => navigate('/spielbogen')}>Abbrechen</Button>
        )}

        {step === 1 && (
          <Button variant="secondary" disabled={!canAdvanceStep1} onClick={() => setStep(2)}>Weiter →</Button>
        )}
        {step === 2 && (
          <Button variant="secondary" disabled={!canAdvanceStep2} onClick={() => setStep(3)}>Weiter →</Button>
        )}
        {step === 3 && (
          <div className="flex gap-2">
            <Button variant="secondary" disabled={submitting} onClick={handleSaveDraft}>Als Entwurf speichern</Button>
            <Button variant="primary" disabled={submitting} onClick={handleStartScoring}>Speichern + Scoren</Button>
          </div>
        )}
      </div>

      {showResume && resumeDraft && (
        <ConfirmModal
          title="Entwurf wiederherstellen?"
          message={`Du hast einen unfertigen Spielbogen vom ${new Date(resumeDraft.savedAt).toLocaleString('de-DE')}.`}
          confirmLabel="Wiederherstellen"
          cancelLabel="Verwerfen + neu starten"
          onConfirm={() => {
            setStep(resumeDraft.step)
            setMeta(resumeDraft.meta)
            setHomeLineup(resumeDraft.homeLineup)
            setAwayLineup(resumeDraft.awayLineup)
            setShowResume(false)
            setResumeDraft(null)
          }}
          onCancel={() => {
            clearDraft()
            setShowResume(false)
            setResumeDraft(null)
          }}
        />
      )}
    </div>
  )
}

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const stages: Array<{ idx: 1 | 2 | 3; label: string }> = [
    { idx: 1, label: 'Meta' },
    { idx: 2, label: 'Lineup' },
    { idx: 3, label: 'Übersicht' },
  ]
  return (
    <div className="flex items-center justify-between mb-2">
      {stages.map((s, i) => (
        <div key={s.idx} className="flex items-center flex-1">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-display text-xs font-extrabold ${
            step >= s.idx ? 'bg-navy-900 text-white' : 'bg-cream-200 text-gray-500'
          }`}>
            {s.idx}
          </div>
          <span className={`ml-2 font-display text-[10px] tracking-widest font-bold uppercase ${
            step === s.idx ? 'text-navy-900' : 'text-gray-500'
          }`}>{s.label}</span>
          {i < stages.length - 1 && <div className="flex-1 h-px bg-cream-300 mx-2" />}
        </div>
      ))}
    </div>
  )
}
