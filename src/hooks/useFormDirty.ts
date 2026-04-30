import { useState, useCallback, useEffect, useRef } from 'react'

export const useFormDirty = (initialData: any, currentData: any) => {
  const [isDirty, setIsDirty] = useState(false)
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    const checkDirty = () => {
      try {
        return JSON.stringify(initialData) !== JSON.stringify(currentData)
      } catch (error) {
        console.error('Error comparing form data:', error)
        return false
      }
    }
    
    setIsDirty(checkDirty())
  }, [initialData, currentData])

  const resetDirty = useCallback(() => {
    setIsDirty(false)
  }, [])
    
  const markAsClean = useCallback(() => {
    setIsDirty(false)
  }, [])

  return {
    isDirty,
    setIsDirty,
    resetDirty,
    markAsClean
  }
}