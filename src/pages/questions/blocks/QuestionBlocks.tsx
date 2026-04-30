import React from 'react';
import { QuestionBlock } from '@/types';
import Button from '@/components/common/Button';
import { Type, Image } from 'lucide-react';
import BlockEditor from '../common/BlockEditor';

interface QuestionBlocksProps
{
    blocks: QuestionBlock[];
    onChange: (index: number, field: keyof QuestionBlock, value: string) => void;
    onAdd: (type: 'text' | 'media') => void;
    onRemove: (index: number) => void;
}

export const QuestionBlocks: React.FC<QuestionBlocksProps> = ({
    blocks,
    onChange,
    onAdd,
    onRemove
}) =>
{
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">
                    Блоки вопроса <span className="text-red-500">*</span>
                </h4>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAdd('text')}
                        icon={<Type className="h-4 w-4" />}
                    >
                        Текст
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onAdd('media')}
                        icon={<Image className="h-4 w-4" />}
                    >
                        Медиа
                    </Button>
                </div>
            </div>

            {blocks.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500">Нет блоков. Добавьте текстовый или медиа-блок.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {blocks.map((block, index) => (
                        <BlockEditor
                            key={index}
                            block={block}
                            index={index}
                            onChange={onChange}
                            onRemove={onRemove}
                            showRemove={blocks.length > 1}
                            type="question"
                        />
                    ))}
                </div>
            )}
        </div>
    );
};