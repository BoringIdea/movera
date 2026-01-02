'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Database, Activity, Zap, Shield } from 'lucide-react'

interface RegistrationStep {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  estimatedTime: number
}

interface PassportRegistrationProgressProps {
  isRegistering: boolean
  onComplete?: () => void
  progress?: {
    currentStep: number
    elapsedTime: number
    estimatedTime: number
  }
  isBackendCompleted?: boolean
}

export function PassportRegistrationProgress({
  isRegistering,
  onComplete,
  progress,
  isBackendCompleted,
}: PassportRegistrationProgressProps) {
  const [currentStep, setCurrentStep] = useState(progress?.currentStep || 0)
  const [elapsedTime, setElapsedTime] = useState(progress?.elapsedTime || 0)
  const [remainingTime, setRemainingTime] = useState(progress?.estimatedTime || 150)

  const steps: RegistrationStep[] = [
    {
      id: 'signature',
      title: 'Verify signature',
      description: 'Confirming wallet authorization',
      icon: <Shield className="w-5 h-5" />,
      estimatedTime: 10,
    },
    {
      id: 'fetch-transactions',
      title: 'Fetch ledger data',
      description: 'Pulling transactions and balances',
      icon: <Database className="w-5 h-5" />,
      estimatedTime: 50,
    },
    {
      id: 'analyze-activity',
      title: 'Analyze behavior',
      description: 'Profiling your on-chain actions',
      icon: <Activity className="w-5 h-5" />,
      estimatedTime: 40,
    },
    {
      id: 'build-score',
      title: 'Build score',
      description: 'Calculating Passport credibility',
      icon: <Zap className="w-5 h-5" />,
      estimatedTime: 30,
    },
    {
      id: 'finalize',
      title: 'Finalize',
      description: 'Saving your Passport snapshot',
      icon: <CheckCircle className="w-5 h-5" />,
      estimatedTime: 10,
    },
  ]

  const totalEstimated = steps.reduce((sum, step) => sum + step.estimatedTime, 0)

  useEffect(() => {
    if (!isRegistering) return

    const interval = setInterval(() => {
      setElapsedTime(prev => {
        const next = prev + 1
        let stepIndex = 0
        let total = 0
        for (let i = 0; i < steps.length; i++) {
          total += steps[i].estimatedTime
          if (next <= total) {
            stepIndex = i
            break
          }
        }
        setCurrentStep(stepIndex)
        setRemainingTime(Math.max(0, totalEstimated - next))
        return next
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRegistering, totalEstimated, steps])

  useEffect(() => {
    if (progress) {
      setCurrentStep(progress.currentStep)
      setElapsedTime(progress.elapsedTime)
      setRemainingTime(Math.max(0, progress.estimatedTime - progress.elapsedTime))
    }
  }, [progress])

  useEffect(() => {
    if (isRegistering) {
      setElapsedTime(0)
      setCurrentStep(0)
      setRemainingTime(totalEstimated)
    }
  }, [isRegistering, totalEstimated])

  useEffect(() => {
    if (isBackendCompleted && isRegistering) {
      setTimeout(() => onComplete?.(), 1000)
    }
  }, [isBackendCompleted, isRegistering, onComplete])

  if (!isRegistering) return null

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`
  }

  const progressPercent = Math.min((elapsedTime / totalEstimated) * 100, 100)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-black rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.2)] max-w-3xl w-full p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.6rem] font-black text-black/50 uppercase tracking-[0.3em]">Passport creation</p>
            <h2 className="text-2xl font-black text-black">We are building your Passport</h2>
            <p className="text-sm text-black/60">Gathering attestations, histories, and signals to compute your score.</p>
          </div>
          <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-black/50 text-right">
            <div>{Math.round(progressPercent)}% done</div>
            <div>{formatTime(remainingTime)} remaining</div>
          </div>
        </div>

        <div className="w-full h-1 bg-black/10 rounded-full">
          <div className="h-1 bg-black transition-all duration-500 ease-out" style={{ width: `${progressPercent}%` }} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {steps.map((step, index) => {
            const completed = index < currentStep
            const active = index === currentStep
            return (
              <div
                key={step.id}
                className={`border rounded-lg px-4 py-3 flex items-start gap-3 transition-colors duration-300 ${
                  active ? 'border-[#2792FF] bg-[#E1F0FF]' : completed ? 'border-black bg-[#F4F7FF]' : 'border-black/30 bg-white'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    completed || active ? 'bg-black text-white' : 'bg-black/10 text-black/50'
                  }`}
                >
                  {completed ? <CheckCircle className="w-4 h-4" /> : step.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm font-black text-black">
                    <span>{step.title}</span>
                    <span className="text-[0.6rem] text-black/40">{step.estimatedTime}s</span>
                  </div>
                  <p className="text-xs text-black/50">{step.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
