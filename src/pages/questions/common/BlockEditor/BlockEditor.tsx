import React, { useState } from 'react';
import { QuestionBlock, BlockType } from '@/types';
import { Trash2, Type, Image, Video, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/common/Button';
import RichTextPreview from '@/components/common/RichTextPreview';
import { containsLatex, containsMedia } from '@/utils/textParser';

interface BlockEditorProps
{
  block: QuestionBlock;
  index: number;
  onChange: (index: number, field: keyof QuestionBlock, value: string) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
  type: 'question' | 'variant' | 'hint';
}

const BlockEditor: React.FC<BlockEditorProps> = ({
  block,
  index,
  onChange,
  onRemove,
  showRemove,
  type
}) =>
{
  const [showPreview, setShowPreview] = useState(false);

  const getBlockIcon = () =>
  {
    switch (block.type)
    {
      case BlockType.TEXT:
        return <Type className="h-4 w-4 text-blue-500" />;
      case BlockType.MEDIA:
        return <Image className="h-4 w-4 text-green-500" />;
      case BlockType.VIDEO:
        return <Video className="h-4 w-4 text-purple-500" />;
      default:
        return null;
    }
  };

  const getBlockTypeLabel = () =>
  {
    switch (block.type)
    {
      case BlockType.TEXT:
        return 'Текст';
      case BlockType.MEDIA:
        return 'Изображение';
      case BlockType.VIDEO:
        return 'Видео';
      default:
        return '';
    }
  };

  const togglePreview = () => setShowPreview(!showPreview);

  const hasPreviewableContent = block.type === BlockType.TEXT &&
    (containsLatex(block.value || '') || containsMedia(block.value || ''));

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white mb-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getBlockIcon()}
          <span className="text-sm font-medium text-gray-700">
            Блок {index + 1}: {getBlockTypeLabel()}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {hasPreviewableContent && (
            <Button

              variant="ghost"
              size="sm"
              onClick={togglePreview}
              icon={showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              title={showPreview ? 'Скрыть предпросмотр' : 'Показать предпросмотр'}
            >Предпросмотр</Button>
          )}
          {showRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(index)}
              icon={<Trash2 className="h-4 w-4 text-red-500" />}
            >
              Удалить
            </Button>
          )}
        </div>
      </div>

      {block.type === BlockType.TEXT && (
        <>
          <textarea
            value={block.value || ''}
            onChange={(e) => onChange(index, 'value', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm font-mono"
            placeholder="Введите текст (для LaTeX формул используйте r&quot;...&quot;)"
          />
          {showPreview && (
            <div className="mt-3 p-3 border border-gray-200 rounded-md bg-gray-50">
              <div className="text-xs text-gray-500 mb-2 flex items-center">
                <Eye className="h-3 w-3 mr-1" />
                Предпросмотр:
              </div>
              <RichTextPreview
                text={block.value || ''}
                showMediaPreview={true}
                showLaTeXPreview={true}
                maxMediaHeight={150}
              />
            </div>
          )}
        </>
      )}

      {(block.type === BlockType.MEDIA || block.type === BlockType.VIDEO) && (
        <>
          <input
            type="text"
            value={block.value || ''}
            onChange={(e) => onChange(index, 'value', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            placeholder={block.type === BlockType.MEDIA ? 'URL изображения (http(s)://...)' : 'ID видео или полный URL'}
          />
          {block.type === BlockType.MEDIA && block.value && (
            <div className="mt-2">
              <img
                src={block.value}
                alt=""
                className="max-w-full h-auto max-h-40 rounded border border-gray-200"
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            </div>
          )}
          {block.type === BlockType.VIDEO && block.value && (
            <div className="mt-2 text-xs text-gray-500">
              Пример ID: 8c1cdf667822484c1596b684de54b659
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BlockEditor;