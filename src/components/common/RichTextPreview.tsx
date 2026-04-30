import React, { useState } from 'react'
import { parseTextWithFormulasAndMedia, TextPart } from '@/utils/textParser'
import { Image, Video, FileText } from 'lucide-react'
import LatexRenderer from './LaTeXRenderer'

interface RichTextPreviewProps
{
    text: string
    className?: string
    showMediaPreview?: boolean
    maxMediaHeight?: number
    showLaTeXPreview?: boolean
}

const RichTextPreview: React.FC<RichTextPreviewProps> = ({
    text,
    className = '',
    showMediaPreview = true,
    maxMediaHeight = 200,
    showLaTeXPreview = false
}) =>
{
    const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

    if (!text || typeof text !== 'string')
        return null

    const parts = parseTextWithFormulasAndMedia(text)

    if (parts.length === 0)
        return <span className="text-content">{text}</span>

    const handleImageError = (url: string) =>
        setImageErrors(prev => new Set(prev).add(url))

    const isImageError = (url: string) => imageErrors.has(url)

    return (
        <div className={`rich-text-preview inline-block ${className}`}>
            {parts.map((part, index) =>
            {
                switch (part.type)
                {
                    case 'latex':
                        if (!showLaTeXPreview)
                            return (
                                <span key={index} className="inline-block bg-gray-100 px-2 py-1 rounded text-sm mx-1">
                                    <FileText className="h-3 w-3 inline mr-1" />
                                    LaTeX
                                </span>
                            )

                        return (
                            <span key={index} className="latex-container inline-block align-middle mx-1">
                                <LatexRenderer
                                    latex={part.content}
                                    displayMode={false}
                                    className="inline-block"
                                />
                            </span>
                        )

                    case 'image':
                        if (!showMediaPreview)
                            return (
                                <span key={index} className="inline-flex items-center bg-gray-100 px-2 py-1 rounded text-sm mx-1">
                                    <Image className="h-3 w-3 inline mr-1" />
                                    Изображение
                                </span>
                            )

                        return (
                            <div key={index} className="media-container my-2 block">
                                <div className="flex items-center mb-1 text-sm text-gray-500">
                                    <Image className="h-4 w-4 mr-1" />
                                    <span>Изображение</span>
                                </div>
                                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                    {!isImageError(part.content) ? (
                                        <img
                                            src={part.content}
                                            alt="Изображение"
                                            className="max-w-full h-auto"
                                            style={{ maxHeight: `${maxMediaHeight}px` }}
                                            onError={() => handleImageError(part.content)}
                                        />
                                    ) : (
                                        <div className="p-4 text-center text-gray-500">
                                            <Image className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                                            <div className="text-sm">Не удалось загрузить изображение</div>
                                            <div className="text-xs mt-1 truncate">{part.content}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )

                    case 'video':
                        if (!showMediaPreview)
                            return (
                                <span key={index} className="inline-flex items-center bg-gray-100 px-2 py-1 rounded text-sm mx-1">
                                    <Video className="h-3 w-3 inline mr-1" />
                                    Видео
                                </span>
                            )

                        return (
                            <div key={index} className="media-container my-2 block">
                                <div className="flex items-center mb-1 text-sm text-gray-500">
                                    <Video className="h-4 w-4 mr-1" />
                                    <span>Видео</span>
                                </div>
                                <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                    <video
                                        src={part.content}
                                        controls
                                        className="max-w-full h-auto"
                                        style={{ maxHeight: `${maxMediaHeight}px` }}
                                    />
                                </div>
                            </div>
                        )

                    case 'text':
                        return part.content ? (
                            <span key={index} className="text-content whitespace-pre-wrap">
                                {part.content}
                            </span>
                        ) : null

                    default:
                        return null
                }
            })}
        </div>
    )
}

export default RichTextPreview