import { ArrowLeft, Clapperboard } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const OnboardingAnimationsPage = () => {
    const navigate = useNavigate()

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-3 bg-white border-b border-gray-200 flex-shrink-0">
                <button
                    onClick={() => navigate('/onboarding')}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Онбординг
                </button>
                <span className="text-gray-300">/</span>
                <h1 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                    <Clapperboard className="h-4 w-4 text-indigo-500" />
                    Варианты анимаций
                </h1>
                <span className="ml-auto text-xs text-gray-400">
                    Нажми «▶ Повторить» для просмотра каждого варианта
                </span>
            </div>

            {/* Preview iframe */}
            <iframe
                src="/onboarding_animations_preview.html"
                className="flex-1 w-full border-0"
                title="Варианты анимаций онбординга"
            />
        </div>
    )
}
