import React from 'react';
import { ChevronDown, ChevronUp, ChevronFirst, ChevronLast } from 'lucide-react';

interface PaginationProps
{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    loading?: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
    currentPage,
    totalPages,
    onPageChange,
    loading = false,
}) =>
{
    const renderPageNumbers = () =>
    {
        const pageNumbers: number[] = [];

        if (totalPages <= 5)
        {
            // Если страниц 5 или меньше - показываем все
            for (let i = 1; i <= totalPages; i++)
            {
                pageNumbers.push(i);
            }
        } else
        {
            // Если страниц 6 или больше - показываем 5 страниц вокруг текущей
            if (currentPage <= 3)
            {
                // Близко к началу: 1, 2, 3, 4, 5
                for (let i = 1; i <= 5; i++)
                {
                    pageNumbers.push(i);
                }
            } else if (currentPage >= totalPages - 2)
            {
                // Близко к концу: ... totalPages-4, totalPages-3, totalPages-2, totalPages-1, totalPages
                for (let i = totalPages - 4; i <= totalPages; i++)
                {
                    pageNumbers.push(i);
                }
            } else
            {
                // Посередине: ... currentPage-2, currentPage-1, currentPage, currentPage+1, currentPage+2 ...
                for (let i = currentPage - 2; i <= currentPage + 2; i++)
                {
                    pageNumbers.push(i);
                }
            }
        }

        return pageNumbers;
    };

    const pageNumbers = renderPageNumbers();

    // Если всего 1 страница - не показываем пагинацию
    if (totalPages <= 1)
    {
        return null;
    }

    return (
        <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
                {/* Мобильная версия */}
                <div className="flex-1 flex justify-between sm:hidden">
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Назад
                    </button>
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages || loading}
                        className="ml-3 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Вперед
                    </button>
                </div>

                {/* Десктопная версия */}
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-center">
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        {/* Кнопка "В начало" - показываем только если страниц 6 или больше */}
                        {totalPages >= 6 && (
                            <button
                                onClick={() => onPageChange(1)}
                                disabled={currentPage === 1 || loading}
                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Первая страница"
                            >
                                <span className="sr-only">Первая</span>
                                <ChevronFirst className="h-5 w-5" />
                            </button>
                        )}

                        {/* Кнопка "Назад" на 1 страницу */}
                        <button
                            onClick={() => onPageChange(currentPage - 1)}
                            disabled={currentPage === 1 || loading}
                            className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${totalPages < 6 ? 'rounded-l-md' : ''
                                }`}
                            title="Предыдущая страница"
                        >
                            <span className="sr-only">Предыдущая</span>
                            <ChevronUp className="h-5 w-5 transform -rotate-90" />
                        </button>

                        {/* Номера страниц */}
                        {pageNumbers.map((pageNum) => (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                disabled={loading}
                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageNum
                                        ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                {pageNum}
                            </button>
                        ))}

                        {/* Кнопка "Вперед" на 1 страницу */}
                        <button
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages || loading}
                            className={`relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed ${totalPages < 6 ? 'rounded-r-md' : ''
                                }`}
                            title="Следующая страница"
                        >
                            <span className="sr-only">Следующая</span>
                            <ChevronDown className="h-5 w-5 transform -rotate-90" />
                        </button>

                        {/* Кнопка "В конец" - показываем только если страниц 6 или больше */}
                        {totalPages >= 6 && (
                            <button
                                onClick={() => onPageChange(totalPages)}
                                disabled={currentPage >= totalPages || loading}
                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Последняя страница"
                            >
                                <span className="sr-only">Последняя</span>
                                <ChevronLast className="h-5 w-5" />
                            </button>
                        )}
                    </nav>
                </div>
            </div>
        </div>
    );
};