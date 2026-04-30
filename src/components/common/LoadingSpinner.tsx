interface LoadingSpinnerProps
{
    size?: 'sm' | 'md' | 'lg'
    message?: string
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    message
}) =>
{
    const sizeClasses = {
        sm: 'h-4 w-4 border-2',
        md: 'h-8 w-8 border-2',
        lg: 'h-12 w-12 border-3'
    }

    return (
        <div className="flex flex-col items-center justify-center">
            <div className="relative">
                <div className={`${sizeClasses[size]} border-gray-300 rounded-full`}></div>
                <div className={`${sizeClasses[size]} border-primary-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0`}></div>
            </div>
            {message && (
                <p className="mt-2 text-sm text-gray-600">{message}</p>
            )}
        </div>
    )
}

export default LoadingSpinner