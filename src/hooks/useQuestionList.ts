import { questionService } from "@/services/api";
import { useQuestionStore } from "@/stores/questionStore";
import { useSubjectStore } from "@/stores/subjectStore";
import { useTopicStore } from "@/stores/topicStore";
import { Pagination, Question } from "@/types";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePersistedFilters } from "./usePersistedFilters";
import toast from "react-hot-toast";

type QuestionFilterType = {
  search: string;
  difficulty: string[];
  type: string[];
  subject_ids: string[];
  topic_ids: string[];
};

export const useQuestionList = () => {
  const [initialLoading, setInitialLoading] = useState(true);
  const navigate = useNavigate();

  const {
    allQuestions,
    fetchAllQuestions,
    getPaginatedQuestions,
    updateQuestionInCache,
    addQuestionToCache,
    removeQuestionFromCache,
    loading: questionsLoading,
  } = useQuestionStore();

  const { subjects, fetchSubjects } = useSubjectStore();
  const { topics: allTopics, fetchTopics } = useTopicStore();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<number[]>([]);

  const [questionFilters, setQuestionFilters] =
    usePersistedFilters<QuestionFilterType>("question-filters", {
      search: "",
      difficulty: [],
      type: [],
      subject_ids: [],
      topic_ids: [],
    });

  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    pageSize: 50,
    totalRecords: 0,
    totalPages: 0,
  });

  const [pageSize, setPageSize] = useState<number>(50);

  const loading = useMemo(
    () => initialLoading || questionsLoading,
    [initialLoading, questionsLoading],
  );

  const hasActiveFilters = useMemo(() => {
    return (
      questionFilters.search !== "" ||
      questionFilters.difficulty.length > 0 ||
      questionFilters.type.length > 0 ||
      questionFilters.subject_ids.length > 0 ||
      questionFilters.topic_ids.length > 0
    );
  }, [questionFilters]);

  const isEmpty = useMemo(
    () => !loading && questions.length === 0,
    [loading, questions.length],
  );

  const loadQuestions = useCallback(async () => {
    try {
      const result = getPaginatedQuestions(
        pagination.currentPage,
        pageSize,
        questionFilters,
      );

      setQuestions(result.questions);
      setPagination((prev) => ({
        ...prev,
        totalRecords: result.totalCount,
        totalPages: result.totalPages,
      }));
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Ошибка загрузки вопросов");
      setQuestions([]);
    }
  }, [
    pagination.currentPage,
    pageSize,
    questionFilters,
    getPaginatedQuestions,
  ]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setInitialLoading(true);
        await Promise.all([
          fetchAllQuestions(),
          fetchSubjects(),
          fetchTopics(),
        ]);
      } catch (error) {
        console.error("Error loading initial data:", error);
      } finally {
        setInitialLoading(false);
      }
    };

    loadInitialData();
  }, [fetchAllQuestions, fetchSubjects, fetchTopics]);

  useEffect(() => {
    if (allQuestions.length > 0) loadQuestions();
  }, [loadQuestions, allQuestions.length]);

  const handleFilterChange = useCallback(
    (newFilters: Partial<QuestionFilterType>) => {
      setQuestionFilters(
        (prev) =>
          ({
            ...prev,
            ...newFilters,
          }) as QuestionFilterType,
      );
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
    },
    [setQuestionFilters],
  );

  const handleSubjectFilterChange = useCallback(
    (subjectIds: string[]) =>
      handleFilterChange({
        subject_ids: subjectIds,
        topic_ids: [],
      }),
    [handleFilterChange],
  );

  const handleResetFilters = useCallback(() => {
    setQuestionFilters({
      search: "",
      difficulty: [],
      type: [],
      subject_ids: [],
      topic_ids: [],
    } as QuestionFilterType);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, [setQuestionFilters]);

  const handlePageChange = useCallback(
    (newPage: number) =>
      setPagination((prev) => ({ ...prev, currentPage: newPage })),
    [],
  );

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPagination((prev) => ({ ...prev, currentPage: 1, pageSize: newSize }));
  }, []);

  const handleSelectRow = useCallback(
    (id: string, checked: boolean) =>
      setSelectedQuestions((prev) =>
        checked
          ? [...prev, Number(id)]
          : prev.filter((item) => item !== Number(id)),
      ),
    [],
  );

  const handleSelectAll = useCallback(
    (checked: boolean) =>
      setSelectedQuestions(checked ? questions.map((q) => q.id) : []),
    [questions],
  );

  const handleRefreshData = useCallback(async () => {
    try {
      setInitialLoading(true);
      await Promise.all([
        fetchAllQuestions(true),
        fetchSubjects(),
        fetchTopics(),
      ]);
      await loadQuestions();
      setSelectedQuestions([]);
      toast.success("Данные успешно обновлены");
    } catch (error) {
      console.error("Error refreshing data:", error);
      toast.error("Ошибка при обновлении данных");
    } finally {
      setInitialLoading(false);
    }
  }, [fetchAllQuestions, fetchSubjects, fetchTopics, loadQuestions]);

  const handleCreate = useCallback(() => {
    setEditingQuestion(null);
    setShowModal(true);
  }, []);

  const handleEdit = useCallback((question: Question) => {
    setEditingQuestion(question);
    setShowModal(true);
  }, []);

  const handleView = useCallback(
    (question: Question) => navigate(`/questions/${question.id}`),
    [navigate],
  );

  const handleDelete = useCallback(
    async (question: Question) => {
      const shouldDelete = window.confirm(
        `Вы уверены, что хотите удалить вопрос #${question.id}?`,
      );

      if (!shouldDelete) return;

      try {
        await questionService.delete(question.id);
        removeQuestionFromCache(question.id);
        toast.success("Вопрос успешно удален");
        setSelectedQuestions((prev) => prev.filter((id) => id !== question.id));
        await loadQuestions();
      } catch (error) {
        console.error("Error deleting question:", error);
        toast.error("Ошибка при удалении вопроса");
      }
    },
    [removeQuestionFromCache, loadQuestions],
  );

  const handleBulkDelete = useCallback(async () => {
    if (selectedQuestions.length === 0) return;

    const shouldDelete = window.confirm(
      `Вы уверены, что хотите удалить ${selectedQuestions.length} вопросов?`,
    );

    if (!shouldDelete) return;

    try {
      await Promise.all(
        selectedQuestions.map((id) => questionService.delete(id)),
      );
      selectedQuestions.forEach((id) => removeQuestionFromCache(id));
      toast.success(`Успешно удалено ${selectedQuestions.length} вопросов`);
      setSelectedQuestions([]);
      await loadQuestions();
    } catch (error) {
      console.error("Error bulk deleting questions:", error);
      toast.error("Ошибка при массовом удалении вопросов");
    }
  }, [selectedQuestions, removeQuestionFromCache, loadQuestions]);

  const handleModalSubmit = useCallback(
    async (data: any) => {
      try {
        if (editingQuestion) {
          const updatedQuestion = await questionService.update(
            editingQuestion.id,
            data,
          );
          updateQuestionInCache(updatedQuestion);
        } else {
          const newQuestion = await questionService.create(data);
          addQuestionToCache(newQuestion);
        }

        setShowModal(false);
        setEditingQuestion(null);
        await loadQuestions();
      } catch (error) {
        console.error("Error saving question:", error);
        throw error;
      }
    },
    [editingQuestion, updateQuestionInCache, addQuestionToCache, loadQuestions],
  );

  const handleModalClose = useCallback(() => {
    setShowModal(false);
    setEditingQuestion(null);
  }, []);

  return {
    questions,
    loading,
    isEmpty,
    pagination,
    filters: questionFilters,
    selectedQuestions,
    showModal,
    showImportModal,
    editingQuestion,
    subjects,
    allTopics,
    pageSize,
    hasActiveFilters,

    handleRefreshData,
    handleFilterChange,
    handleSubjectFilterChange,
    handleResetFilters,
    handlePageChange,
    handleDelete,
    handleBulkDelete,
    handleCreate,
    handleEdit,
    handleView,
    handleModalSubmit,
    handleModalClose,
    handleSelectRow,
    handleSelectAll,
    setShowImportModal,
    handlePageSizeChange,
  };
};
