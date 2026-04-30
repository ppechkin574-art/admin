import { BaseEntity } from "./enums";

export interface SubjectModule extends BaseEntity {
  title: string;
  description?: string;
  subject_id: number;
  order_index: number;

  subject?: any;
  lessons?: ModuleLesson[];
  lesson_count?: number;
}

export interface ModuleLesson extends BaseEntity {
  title: string;
  description?: string;
  module_id: number;
  topic_id?: number;
  order_index: number;
  video_url?: string;
  presentation_url?: string;

  module?: SubjectModule;
  topic?: any;
}
