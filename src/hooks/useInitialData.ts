import { useEffect } from "react";
import { useQuestionStore } from "@/stores/questionStore";
import { useSubjectStore } from "@/stores/subjectStore";
import { useTopicStore } from "@/stores/topicStore";
import { useTrainerStore } from "@/stores/trainerStore";
import { useEntStore } from "@/stores/entStore";
import { useModuleStore } from "@/stores/moduleStore";
import useKeycloakAuth from "./useKeycloakAuth";

export const useInitialData = () => {
  const { fetchAllQuestions } = useQuestionStore();
  const { fetchSubjects } = useSubjectStore();
  const { fetchTopics } = useTopicStore();
  const { fetchTrainers } = useTrainerStore();
  const { fetchEntOptions } = useEntStore();
  const { fetchModules } = useModuleStore();
  const { isInitialized, isAuthenticated } = useKeycloakAuth();

  useEffect(() => {
    if (!isInitialized) return;
    if (!isAuthenticated) return;
    const loadAllData = async () => {
      try {
        await Promise.all([
          fetchAllQuestions(),
          fetchSubjects(),
          fetchTopics(),
          fetchTrainers(),
          fetchEntOptions(),
          fetchModules({}),
        ]);
      } catch (error) {
        console.error("❌ Error loading initial data:", error);
      }
    };

    loadAllData();
  }, [
    fetchAllQuestions,
    fetchSubjects,
    fetchTopics,
    fetchTrainers,
    fetchEntOptions,
    fetchModules,
    isInitialized,
    isAuthenticated,
  ]);
};
