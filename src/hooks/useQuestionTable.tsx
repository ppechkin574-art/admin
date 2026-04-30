import { useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/common/Badge/Badge';
import { Topic } from '@/types';
import { containsLatex } from '@/utils/textParser';

interface UseQuestionTableProps
{
  topics: Topic[];
  onView?: (question: any) => void;
  onEdit?: (question: any) => void;
  onDelete?: (question: any) => void;
}

export const useQuestionTable = ({
  topics,
  onView,
  onEdit,
  onDelete
}: UseQuestionTableProps) =>
{
  const renderId = useCallback((value: number) => (
    <strong className="question-id">#{value}</strong>
  ), []);

  const renderQuestion = useCallback((value: any[], item: any) =>
  {
    const textBlocks = (item.blocks || [])
      .filter((block: any) => block && block.type === 'text')
      .sort((a: any, b: any) => (a.order || 0) - (b.order || 0))
      .map((block: any) => block.value || '')
      .filter((text: string) => text.trim());

    const questionText = textBlocks.join(' ').substring(0, 150);
    const hasMedia = (item.blocks || []).some(
      (block: any) => block && block.type === 'media'
    );
    const hasHint = item.hint && item.hint.blocks && item.hint.blocks.length > 0;
    const hasLatex = (item.blocks || []).some(
      (block: any) => block && block.type === 'text' && containsLatex(block.value || '')
    );

    return (
      <div className="question-preview">
        <div className="question-preview__text">
          {questionText + (questionText.length >= 150 ? '...' : '')}
        </div>
        <div className="question-preview__meta">
          {hasMedia && (
            <Badge type="media" icon="fa-image" size="sm">
              медиа
            </Badge>
          )}
          {hasHint && (
            <Badge type="hint" icon="fa-lightbulb" size="sm">
              подсказка
            </Badge>
          )}
          {hasLatex && (
            <Badge type="info" icon="fa-code" size="sm">
              LaTeX
            </Badge>
          )}
        </div>
      </div>
    );
  }, []);

  const renderType = useCallback((value: string) =>
  {
    const typeMap: Record<string, any> = {
      'single_choice': 'success',
      'multiple_choice': 'primary',
      'text': 'info',
      'matching': 'warning'
    };

    const badgeType = typeMap[value] || 'secondary';
    const typeLabels: Record<string, string> = {
      'single_choice': 'Одиночный выбор',
      'multiple_choice': 'Множественный выбор',
      'text': 'Текстовый ответ',
      'matching': 'Сопоставление'
    };

    return (
      <Badge type={badgeType} size="sm">
        {typeLabels[value] || value}
      </Badge>
    );
  }, []);

  const renderDifficulty = useCallback((value: string) =>
  {
    const difficultyMap: Record<string, any> = {
      'easy': 'success',
      'medium': 'warning',
      'hard': 'error',
    };

    const badgeType = difficultyMap[value] || 'secondary';
    const difficultyLabels: Record<string, string> = {
      'easy': 'Легкий',
      'medium': 'Средний',
      'hard': 'Сложный',
    };

    return (
      <Badge type={badgeType} size="sm">
        {difficultyLabels[value] || value}
      </Badge>
    );
  }, []);

  const renderTopic = useCallback((value: number, item: any) =>
  {
    const topic = topics.find((t) => t.id === value);
    if (topic)
      return (
        <Link
          to={`/topics/${topic.id}`}
          className="topic-link"
          onClick={(e) => e.stopPropagation()}
        >
          {topic.name}
        </Link>
      );
    return <span className="text-muted">—</span>;
  }, [topics]);

  const questionColumns = useMemo(() => [
    {
      key: 'id',
      title: 'ID',
      width: '80px',
      render: renderId,
    },
    {
      key: 'blocks',
      title: 'Вопрос',
      render: renderQuestion,
    },
    {
      key: 'type',
      title: 'Тип',
      width: '150px',
      render: renderType,
    },
    {
      key: 'difficulty',
      title: 'Сложность',
      width: '120px',
      render: renderDifficulty,
    },
    {
      key: 'topic_id',
      title: 'Тема',
      width: '150px',
      render: renderTopic,
    },
  ], [renderId, renderQuestion, renderType, renderDifficulty, renderTopic]);

  const tableActions = useMemo(() =>
  {
    const actions: any = {};

    if (onView)
      actions.view = {
        handler: onView,
        className: 'view',
        icon: 'fas fa-eye'
      };

    if (onEdit)
      actions.edit = {
        handler: onEdit,
        className: 'edit',
        icon: 'fas fa-edit'
      };

    if (onDelete)
      actions.delete = {
        handler: onDelete,
        className: 'delete',
        icon: 'fas fa-trash'
      };

    return Object.keys(actions).length > 0 ? actions : undefined;
  }, [onView, onEdit, onDelete]);

  return {
    questionColumns,
    tableActions
  };
};