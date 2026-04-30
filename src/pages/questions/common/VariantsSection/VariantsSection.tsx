import React from 'react';
import { QuestionBlock, Variant } from '@/types';
import BlockEditor from '../BlockEditor';
import Button from '@/components/common/Button';
import { Plus, Trash2, Type, Image } from 'lucide-react';

interface VariantsSectionProps
{
    variants: Variant[];
    onVariantChange: (
        variantIndex: number,
        blockIndex: number,
        field: keyof QuestionBlock,
        value: string
    ) => void;
    onAddVariantBlock: (variantIndex: number, type: 'text' | 'media') => void;
    onRemoveVariantBlock: (variantIndex: number, blockIndex: number) => void;
    onAddVariant: () => void;
    onRemoveVariant: (variantIndex: number) => void;
    onCorrectAnswerChange: (variantIndex: number, checked: boolean) => void;
}

export const VariantsSection: React.FC<VariantsSectionProps> = ({
    variants,
    onVariantChange,
    onAddVariantBlock,
    onRemoveVariantBlock,
    onAddVariant,
    onRemoveVariant,
    onCorrectAnswerChange
}) =>
{
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">
                    Варианты ответа <span className="text-red-500">*</span>
                </h4>
            </div>

            {variants.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">Нет вариантов. Добавьте хотя бы один вариант.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {variants.map((variant, variantIndex) => (
                        <div key={variantIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-gray-800">Вариант {variantIndex + 1}</h5>
                                {variants.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => onRemoveVariant(variantIndex)}
                                        icon={<Trash2 className="h-4 w-4 text-red-500" />}
                                    >
                                        Удалить вариант
                                    </Button>
                                )}
                            </div>

                            <div className="space-y-3 mb-4">
                                {variant.blocks.map((block, blockIndex) => (
                                    <BlockEditor
                                        key={blockIndex}
                                        block={block}
                                        index={blockIndex}
                                        onChange={(blockIndex, field, value) =>
                                            onVariantChange(variantIndex, blockIndex, field, value)
                                        }
                                        onRemove={(blockIndex) => onRemoveVariantBlock(variantIndex, blockIndex)}
                                        showRemove={variant.blocks.length > 1}
                                        type="variant"
                                    />
                                ))}
                            </div>

                            <div className="flex items-center space-x-2 mb-4">
                                <span className="text-xs text-gray-500">Добавить блок:</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onAddVariantBlock(variantIndex, 'text')}
                                    icon={<Type className="h-3 w-3" />}
                                >
                                    Текст
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onAddVariantBlock(variantIndex, 'media')}
                                    icon={<Image className="h-3 w-3" />}
                                >
                                    Медиа
                                </Button>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`correct-${variantIndex}`}
                                    checked={variant.is_correct}
                                    onChange={(e) => onCorrectAnswerChange(variantIndex, e.target.checked)}
                                    className="h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                />
                                <label htmlFor={`correct-${variantIndex}`} className="ml-2 text-sm text-gray-700">
                                    Правильный ответ
                                </label>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <Button
                variant="primary"
                size="sm"
                onClick={onAddVariant}
                icon={<Plus className="h-4 w-4" />}
            >
                Добавить вариант
            </Button>
        </div>
    );
};