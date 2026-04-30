// import { ConfirmationOptions, useConfirmation } from '@/hooks/useConfirmation'
// import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react'
// import ConfirmationModal from '@/components/common/ConfirmationModal'
// import Notification from './Notification'

// interface NotificationData
// {
//     type: 'success' | 'error' | 'warning' | 'info'
//     title: string
//     message?: string
//     details?: any
//     id?: number
// }

// interface NotificationContextType
// {
//     showNotification: (type: 'success' | 'error' | 'warning' | 'info', title: string, message?: string, details?: any) => void
//     hideNotification: (id: number) => void
//     showSuccess: (title: string, options?: { message?: string; details?: any }) => void
//     showError: (title: string, options?: { message?: string; details?: any }) => void
//     showWarning: (title: string, options?: { message?: string; details?: any }) => void
//     showInfo: (title: string, options?: { message?: string; details?: any }) => void
//     confirm: (options: ConfirmationOptions) => Promise<boolean>
//     notifications: NotificationData[]
// }

// const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// export const useNotification = () =>
// {
//     const context = useContext(NotificationContext)
//     if (!context)
//         throw new Error('useNotification must be used within NotificationProvider')
//     return context
// }

// interface NotificationProviderProps
// {
//     children: ReactNode
// }

// const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) =>
// {
//     const [notifications, setNotifications] = useState<NotificationData[]>([])

//     const {
//         confirm,
//         confirmation,
//         isOpen: isConfirmationOpen,
//         onConfirm: handleConfirmationConfirm,
//         onCancel: handleConfirmationCancel
//     } = useConfirmation()

//     const showNotification = useCallback((
//         type: 'success' | 'error' | 'warning' | 'info',
//         title: string,
//         message?: string,
//         details?: any
//     ): number =>
//     {
//         const id = Date.now() + Math.random()
//         const notification: NotificationData = {
//             id,
//             type,
//             title,
//             message,
//             details
//         }

//         setNotifications(prev =>
//         {
//             const updated = [notification, ...prev]
//             return updated.slice(0, 5) // Ограничиваем до 5 уведомлений
//         })

//         return id
//     }, [])

//     const hideNotification = useCallback((id: number) =>
//     {
//         setNotifications(prev => prev.filter(notification => notification.id !== id))
//     }, [])

//     const showSuccess = useCallback((title: string, options?: { message?: string; details?: any }) =>
//     {
//         return showNotification('success', title, options?.message, options?.details)
//     }, [showNotification])

//     const showError = useCallback((title: string, options?: { message?: string; details?: any }) =>
//     {
//         console.error('Notification Error:', title, options)
//         return showNotification('error', title, options?.message, options?.details)
//     }, [showNotification])

//     const showWarning = useCallback((title: string, options?: { message?: string; details?: any }) =>
//     {
//         return showNotification('warning', title, options?.message, options?.details)
//     }, [showNotification])

//     const showInfo = useCallback((title: string, options?: { message?: string; details?: any }) =>
//     {
//         return showNotification('info', title, options?.message, options?.details)
//     }, [showNotification])

//     const contextValue: NotificationContextType = {
//         showNotification,
//         hideNotification,
//         showSuccess,
//         showError,
//         showWarning,
//         showInfo,
//         confirm,
//         notifications
//     }

//     return (
//         <NotificationContext.Provider value={contextValue}>
//             {children}

//             <div className={'notifications_container'}>
//                 {notifications.map(notification => (
//                     <Notification
//                         key={notification.id}
//                         type={notification.type}
//                         title={notification.title}
//                         message={notification.message}
//                         details={notification.details}
//                         onClose={() => hideNotification(notification.id!)}
//                         autoHide={true}
//                         duration={notification.type === 'error' ? 15000 : 5000}
//                     />
//                 ))}
//             </div>

//             {confirmation && (
//                 <ConfirmationModal
//                     isOpen={isConfirmationOpen}
//                     title={confirmation.title}
//                     message={confirmation.message}
//                     confirmText={confirmation.confirmText}
//                     cancelText={confirmation.cancelText}
//                     type={confirmation.type}
//                     onConfirm={handleConfirmationConfirm}
//                     onCancel={handleConfirmationCancel}
//                 />
//             )}
//         </NotificationContext.Provider>
//     )
// }

// export default NotificationProvider