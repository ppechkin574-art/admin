import {
  Question,
  Subject,
  Topic,
  EntOption,
  Trainer,
  SubjectType,
} from "@/types";

export const transformQuestion = (apiQuestion: any): Question => {
  return {
    ...apiQuestion,
    question_type: apiQuestion.type || apiQuestion.question_type,
    guid: apiQuestion.guid || apiQuestion.id.toString(),
    subject_id: apiQuestion.subject_id || 0,
    blocks: apiQuestion.blocks || [],
    variants: apiQuestion.variants || [],
  };
};

export const transformSubject = (apiSubject: any): Subject => {
  return {
    ...apiSubject,
    guid: apiSubject.guid || apiSubject.id.toString(),
    type: (apiSubject.type as SubjectType) || SubjectType.MAIN,
    image: apiSubject.image || "",
    description: apiSubject.description || "",
    question_count: apiSubject.question_count || 0,
    topic_count: apiSubject.topic_count || 0,
    trainer_count: apiSubject.trainer_count || 0,
  };
};

export const transformTopic = (apiTopic: any): Topic => {
  return {
    ...apiTopic,
    guid: apiTopic.guid || apiTopic.id.toString(),
  };
};

export const transformEntOption = (apiEntOption: any): EntOption => {
  return {
    ...apiEntOption,
    guid: apiEntOption.guid || apiEntOption.id.toString(),
  };
};

export const transformTrainer = (apiTrainer: any): Trainer => {
  return {
    ...apiTrainer,
    guid: apiTrainer.guid || apiTrainer.id.toString(),
  };
};
