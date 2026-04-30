import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuestionStore } from "@/stores/questionStore";
import { useEntStore } from "@/stores/entStore";
import { useTrainerStore } from "@/stores/trainerStore";
import toast from "react-hot-toast";

interface UseEntityQuestionsOptions {
  entityId: number;
  entityType: "subject" | "topic" | "trainer" | "ent";
  autoLoad?: boolean;
}

export function useEntityQuestions({
  entityId,
  entityType,
  autoLoad = true,
}: UseEntityQuestionsOptions) {
  const { allQuestions, fetchAllQuestions } = useQuestionStore();
  const { fetchEntQuestions, entQuestions } = useEntStore();
  const { fetchTrainerQuestions, trainerQuestions } = useTrainerStore();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadQuestions = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    setError(null);
    try {
      if (entityType === "ent") await fetchEntQuestions(entityId);
      else if (entityType === "trainer") await fetchTrainerQuestions(entityId);
      else await fetchAllQuestions();
    } catch (err: any) {
      console.error(`Error loading ${entityType} questions:`, err);
      setError(err.message || `Ошибка загрузки вопросов`);
      toast.error(`Не удалось загрузить вопросы`);
    } finally {
      setLoading(false);
    }
  }, [
    entityId,
    entityType,
    fetchAllQuestions,
    fetchEntQuestions,
    fetchTrainerQuestions,
  ]);

  const questions = useMemo(() => {
    if (!entityId) return [];
    switch (entityType) {
      case "subject":
        return allQuestions.filter((q) => q.subject_id === entityId);
      case "topic":
        return allQuestions.filter((q) => q.topic_id === entityId);
      case "ent":
        const entData = entQuestions[entityId];
        return Array.isArray(entData) ? entData : [];
      case "trainer":
        const trainerData = trainerQuestions[entityId];
        return Array.isArray(trainerData) ? trainerData : [];
      default:
        return [];
    }
  }, [entityId, entityType, allQuestions, entQuestions, trainerQuestions]);

  useEffect(() => {
    if (autoLoad && entityId) loadQuestions();
  }, [entityId, autoLoad, loadQuestions]);

  return {
    questions,
    loading,
    error,
    loadQuestions,
    refreshQuestions: loadQuestions,
  };
}
