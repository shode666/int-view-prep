export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO 8601
}

export interface CreateTodoInput {
  title: string;
}

export interface UpdateTodoInput {
  title?: string;
  completed?: boolean;
}

/** Depend on this abstraction, not on a concrete store (Dependency Inversion). */
export interface TodoRepository {
  list(): Promise<Todo[]>;
  getById(id: string): Promise<Todo | null>;
  create(input: CreateTodoInput): Promise<Todo>;
  update(id: string, input: UpdateTodoInput): Promise<Todo | null>;
  delete(id: string): Promise<boolean>;
}
