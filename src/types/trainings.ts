export interface Training {
  id: number;
  name: string;
  description?: string;
  questions_count?: number;
  question_count?: number;
  created_at?: string;
  duration?: number;
  tags?: string[];
  questions?: any[];
}

export interface TrainingFormData {
  name: string;
  description: string;
}

export interface TrainingFilters {
  search: string;
  difficulty: string[];
  type: string[];
}