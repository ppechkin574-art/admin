import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'

interface Option
{
    value: string
    label: string
}

interface MultiSelectProps
{
    value: string[]
    options: Option[]
    onChange: (value: string[]) => void
    placeholder?: string
    disabled?: boolean
}

export const MultiSelect: React.FC<MultiSelectProps> = ({
    value,
    options,
    onChange,
    placeholder = 'Выберите...',
    disabled = false,
}) =>
{
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() =>
    {
        const handleClickOutside = (event: MouseEvent) =>
        {
            if (containerRef.current && !containerRef.current.contains(event.target as Node))
                setIsOpen(false)
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectedLabels = options
        .filter(opt => value.includes(opt.value))
        .map(opt => opt.label)

    const handleToggle = (optionValue: string) =>
    {
        const newValue = value.includes(optionValue)
            ? value.filter(v => v !== optionValue)
            : [...value, optionValue]
        onChange(newValue)
    }

    const handleRemove = (optionValue: string, e: React.MouseEvent) =>
    {
        e.stopPropagation()
        onChange(value.filter(v => v !== optionValue))
    }

    return (
        <div className="relative" ref={containerRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm cursor-pointer ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
                    }`}
            >
                <div className="flex flex-wrap gap-1 items-center min-h-[24px]">
                    {selectedLabels.length > 0 ? (
                        selectedLabels.map((label, idx) => (
                            <span
                                key={idx}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800"
                            >
                                {label}
                                {!disabled && (
                                    <X
                                        className="ml-1 h-3 w-3 cursor-pointer hover:text-primary-600"
                                        onClick={(e) => handleRemove(value[idx], e)}
                                    />
                                )}
                            </span>
                        ))
                    ) : (
                        <span className="text-gray-500">{placeholder}</span>
                    )}
                </div>
                <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => handleToggle(option.value)}
                            className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${value.includes(option.value) ? 'bg-primary-50 text-primary-700' : ''
                                }`}
                        >
                            <span className="text-sm">{option.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}