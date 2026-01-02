'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { PageTransitionLoading } from './loading-overlay'

export function PageTransition() {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Loading Page...')

  useEffect(() => {
    const handleStart = () => {
      setIsLoading(true)
      // Set different loading text based on the route
      if (pathname?.includes('/attestation')) {
        setLoadingText('Loading Attestation...')
      } else if (pathname?.includes('/schema')) {
        setLoadingText('Loading Schema...')
      } else if (pathname?.includes('/address')) {
        setLoadingText('Loading Address...')
      } else if (pathname?.includes('/dashboard')) {
        setLoadingText('Loading Dashboard...')
      } else {
        setLoadingText('Loading Page...')
      }
    }

    const handleComplete = () => {
      setIsLoading(false)
    }

    // Simulate loading on route change
    handleStart()
    
    // Use a timeout to simulate loading completion
    const timer = setTimeout(() => {
      handleComplete()
    }, 800) // Show loading for 800ms minimum

    return () => clearTimeout(timer)
  }, [pathname])

  if (!isLoading) return null

  return <PageTransitionLoading text={loadingText} showProgress={true} />
}

// Hook for manual loading control
export function usePageTransition() {
  const [isLoading, setIsLoading] = useState(false)

  const startLoading = (text?: string) => {
    setIsLoading(true)
  }

  const stopLoading = () => {
    setIsLoading(false)
  }

  return {
    isLoading,
    startLoading,
    stopLoading
  }
}
