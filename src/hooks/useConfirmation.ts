import { useState, useCallback } from 'react'

export interface ConfirmationOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'danger' | 'warning' | 'info' | 'success'
}

export const useConfirmation = () => {
  const [confirmationState, setConfirmationState] = useState<{
    isOpen: boolean
    options: ConfirmationOptions | null
    resolve: ((value: boolean) => void) | null
  }>({
    isOpen: false,
    options: null,
    resolve: null
  })

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmationState({
        isOpen: true,
        options,
        resolve
      })
    })
  }, [])

  const handleConfirm = useCallback(() => {
    if (confirmationState.resolve) {
      confirmationState.resolve(true)
    }
    setConfirmationState({
      isOpen: false,
      options: null,
      resolve: null
    })
  }, [confirmationState])

  const handleCancel = useCallback(() => {
    if (confirmationState.resolve) {
      confirmationState.resolve(false)
    }
    setConfirmationState({
      isOpen: false,
      options: null,
      resolve: null
    })
  }, [confirmationState])

  return {
    confirm,
    confirmation: confirmationState.options,
    isOpen: confirmationState.isOpen,
    onConfirm: handleConfirm,
    onCancel: handleCancel
  }
}