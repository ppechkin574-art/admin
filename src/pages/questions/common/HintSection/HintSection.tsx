import React from 'react';
import { Hint } from '@/types';
import BlockEditor from '../BlockEditor';
import Button from '@/components/common/Button';
import { Type, Image, Video, Plus } from 'lucide-react';

interface HintSectionProps
{
  hint: Hint;
  onChange: (index: number, field: keyof import('@/types').QuestionBlock, value: string) => void;
  onAdd: (type: 'text' | 'media' | 'video') => void;
  onRemove: (index: number) => void;
}

export const HintSection: React.FC<HintSectionProps> = ({
  hint,
  onChange,
  onAdd,
  onRemove
}) =>
{
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Подсказка</h4>
        {hint.blocks.length > 0 && (
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdd('video')}
              icon={<Video className="h-4 w-4" />}
            >
              Видео
            </Button>
          </div>
        )}
      </div>

      {hint.blocks.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-4">Подсказка не добавлена</p>
          <div className="flex justify-center space-x-2">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAdd('video')}
              icon={<Video className="h-4 w-4" />}
            >
              Видео
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {hint.blocks.map((block, index) => (
            <BlockEditor
              key={index}
              block={block}
              index={index}
              onChange={onChange}
              onRemove={onRemove}
              showRemove={true}
              type="hint"
            />
          ))}
        </div>
      )}
    </div>
  );
};