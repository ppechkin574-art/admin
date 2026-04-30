import React from 'react'
import ErrorState from '@/components/common/ErrorState'

export const NotFoundPage: React.FC = () => (
    <div className="flex items-center justify-center h-screen">
        <ErrorState
            variant="404"
            title="Страница не найдена"
            message="Извините, мы не можем найти запрашиваемую страницу."
            actionText="Вернуться на главную"
            onRetry={() => window.location.href = '/'}
            size="large"
        />
    </div>
)