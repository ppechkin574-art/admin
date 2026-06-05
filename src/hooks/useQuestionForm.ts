import { useState, useEffect, useCallback } from "react";
import {
  Question,
  QuestionFormData,
  QuestionType,
  TextBlock,
  Subject,
  Topic,
  EntOption,
  Difficulty,
  BlockType,
} from "@/types";
import { subjectService, topicService, entService } from "@/services/api";

const CLOUDFLARE_IFRAME_PREFIX =
  "https://customer-udg2rk5bpm1tzy74.cloudflarestream.com/";

const extractVideoIdFromLink = (value: string) => {
  if (!value) return "";
  const match = value.match(/cloudflarestream\.com\/([^/]+)\/iframe/);
  return match ? match[1] : value;
};

export const useQuestionForm = (
  question?: Question | null,
  defaultType: QuestionType = QuestionType.SINGLE_CHOICE,
) => {
  const getInitialFormData = useCallback(
    (): QuestionFormData => ({
      type: defaultType,
      question_type: defaultType,
      topic_id: null,
      subject_id: null,
      ent_option_id: null,
      difficulty: Difficulty.MEDIUM,
      blocks: [],
      variants: [],
      hint: { blocks: [] },
      task_description_ru: "",
      task_description_kk: "",
      question_translation_ru: "",
      question_translation_kk: "",
    }),
    [defaultType],
  );

  const [formData, setFormData] =
    useState<QuestionFormData>(getInitialFormData());

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [entOptions, setEntOptions] = useState<EntOption[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  useEffect(() => {
    const loadReferenceData = async () => {
      setLoadingSubjects(true);
      try {
        const [subjectsData, topicsData, entOptionsData] = await Promise.all([
          subjectService.getAll(),
          topicService.getAll(),
          entService.getAll(),
        ]);
        setSubjects(subjectsData);
        setTopics(topicsData);
        setEntOptions(entOptionsData);
      } catch (error) {
        console.error("Error loading reference data:", error);
      } finally {
        setLoadingSubjects(false);
      }
    };

    loadReferenceData();
  }, []);

  useEffect(() => {
    if (question) {
      setFormData({
        type: question.type || defaultType,
        question_type: question.question_type || question.type || defaultType,
        topic_id: question.topic_id ?? null,
        subject_id: question.subject_id,
        ent_option_id: question.ent_option_id ?? null,
        difficulty: question.difficulty,
        blocks: question.blocks || [],
        variants:
          question.variants?.map((variant) => ({
            blocks: variant.blocks || [],
            is_correct: variant.is_correct,
            weight: variant.weight || 1,
          })) || [],
        hint: question.hint
          ? {
              blocks:
                question.hint.blocks?.map((block) =>
                  block.type === BlockType.VIDEO
                    ? { ...block, value: extractVideoIdFromLink(block.value) }
                    : block,
                ) || [],
            }
          : { blocks: [] },
        task_description_ru: question.task_description_ru ?? "",
        task_description_kk: question.task_description_kk ?? "",
        question_translation_ru: question.question_translation_ru ?? "",
        question_translation_kk: question.question_translation_kk ?? "",
      });
    }
  }, [question, defaultType]);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
  }, [getInitialFormData]);

  const resetToQuestion = useCallback(() => {
    if (question) {
      setFormData({
        type: question.type || defaultType,
        question_type: question.question_type || question.type || defaultType,
        topic_id: question.topic_id ?? null,
        subject_id: question.subject_id,
        ent_option_id: question.ent_option_id ?? null,
        difficulty: question.difficulty,
        blocks: question.blocks || [],
        variants:
          question.variants?.map((variant) => ({
            blocks: variant.blocks || [],
            is_correct: variant.is_correct,
            weight: variant.weight || 1,
          })) || [],
        hint: question.hint
          ? {
              blocks:
                question.hint.blocks?.map((block) =>
                  block.type === BlockType.VIDEO
                    ? { ...block, value: extractVideoIdFromLink(block.value) }
                    : block,
                ) || [],
            }
          : { blocks: [] },
        task_description_ru: question.task_description_ru ?? "",
        task_description_kk: question.task_description_kk ?? "",
        question_translation_ru: question.question_translation_ru ?? "",
        question_translation_kk: question.question_translation_kk ?? "",
      });
    } else {
      resetForm();
    }
  }, [question, defaultType, resetForm]);

  const handleChange = useCallback(
    (field: keyof QuestionFormData, value: any) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleSubjectChange = useCallback((subjectId: number | null) => {
    setFormData((prev) => ({
      ...prev,
      subject_id: subjectId,
      topic_id: null,
    }));
  }, []);

  const handleQuestionBlockChange = useCallback(
    (index: number, field: keyof TextBlock, value: any) => {
      setFormData((prev) => ({
        ...prev,
        blocks: prev.blocks.map((block, i) =>
          i === index ? { ...block, [field]: value } : block,
        ),
      }));
    },
    [],
  );

  const addQuestionBlock = useCallback((type: BlockType = BlockType.TEXT) => {
    setFormData((prev) => ({
      ...prev,
      blocks: [
        ...prev.blocks,
        {
          type,
          value: "",
          order: prev.blocks.length,
        },
      ],
    }));
  }, []);

  const removeQuestionBlock = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      blocks: prev.blocks.filter((_, i) => i !== index),
    }));
  }, []);

  const handleVariantChange = useCallback(
    (
      variantIndex: number,
      blockIndex: number,
      field: keyof TextBlock,
      value: any,
    ) => {
      setFormData((prev) => ({
        ...prev,
        variants: prev.variants.map((variant, i) =>
          i === variantIndex
            ? {
                ...variant,
                blocks: variant.blocks.map((block, j) =>
                  j === blockIndex ? { ...block, [field]: value } : block,
                ),
              }
            : variant,
        ),
      }));
    },
    [],
  );

  const addVariantBlock = useCallback(
    (variantIndex: number, type: BlockType = BlockType.TEXT) => {
      setFormData((prev) => ({
        ...prev,
        variants: prev.variants.map((variant, i) =>
          i === variantIndex
            ? {
                ...variant,
                blocks: [
                  ...variant.blocks,
                  {
                    type,
                    value: "",
                    order: variant.blocks.length,
                  },
                ],
              }
            : variant,
        ),
      }));
    },
    [],
  );

  const removeVariantBlock = useCallback(
    (variantIndex: number, blockIndex: number) => {
      setFormData((prev) => ({
        ...prev,
        variants: prev.variants.map((variant, i) =>
          i === variantIndex
            ? {
                ...variant,
                blocks: variant.blocks.filter((_, j) => j !== blockIndex),
              }
            : variant,
        ),
      }));
    },
    [],
  );

  const addVariant = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          blocks: [],
          is_correct: false,
          weight: 1,
        },
      ],
    }));
  }, []);

  const removeVariant = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  }, []);

  const handleHintChange = useCallback(
    (index: number, field: keyof TextBlock, value: any) => {
      setFormData((prev) => ({
        ...prev,
        hint: prev.hint
          ? {
              ...prev.hint,
              blocks: prev.hint.blocks.map((block, i) =>
                i === index ? { ...block, [field]: value } : block,
              ),
            }
          : { blocks: [] },
      }));
    },
    [],
  );

  const addHintBlock = useCallback((type: BlockType = BlockType.TEXT) => {
    setFormData((prev) => ({
      ...prev,
      hint: prev.hint
        ? {
            ...prev.hint,
            blocks: [
              ...prev.hint.blocks,
              {
                type,
                value: "",
                order: prev.hint.blocks.length,
              },
            ],
          }
        : {
            blocks: [
              {
                type,
                value: "",
                order: 0,
              },
            ],
          },
    }));
  }, []);

  const removeHintBlock = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      hint: prev.hint
        ? {
            ...prev.hint,
            blocks: prev.hint.blocks.filter((_, i) => i !== index),
          }
        : { blocks: [] },
    }));
  }, []);

  const handleCorrectAnswerChange = useCallback(
    (variantIndex: number, isCorrect: boolean) => {
      setFormData((prev) => {
        const isSingleChoice =
          prev.question_type === QuestionType.SINGLE_CHOICE;

        return {
          ...prev,
          variants: prev.variants.map((variant, index) => ({
            ...variant,
            is_correct: isSingleChoice
              ? index === variantIndex
              : index === variantIndex
                ? isCorrect
                : variant.is_correct,
          })),
        };
      });
    },
    [],
  );

  return {
    formData,
    setFormData,
    subjects,
    topics,
    entOptions,
    loadingSubjects,
    handleSubjectChange,
    handleChange,
    handleQuestionBlockChange,
    addQuestionBlock,
    removeQuestionBlock,
    handleVariantChange,
    addVariantBlock,
    removeVariantBlock,
    addVariant,
    removeVariant,
    handleHintChange,
    addHintBlock,
    removeHintBlock,
    handleCorrectAnswerChange,
    resetForm,
    resetToQuestion,
  };
};
