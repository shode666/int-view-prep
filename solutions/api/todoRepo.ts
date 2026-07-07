import { randomUUID } from 'node:crypto';
import type { CreateTodoInput, Todo, TodoRepository, UpdateTodoInput } from './types/todo.types';

export const createInMemoryTodoRepo = (): TodoRepository => {
  const todos = new Map<string, Todo>();

  return {
    list: async () => [...todos.values()],

    getById: async (id) => todos.get(id) ?? null,

    create: async (input: CreateTodoInput) => {
      const todo: Todo = {
        id: randomUUID(),
        title: input.title,
        completed: false,
        createdAt: new Date().toISOString(),
      };
      todos.set(todo.id, todo);
      return todo;
    },

    update: async (id, input: UpdateTodoInput) => {
      const existing = todos.get(id);
      if (!existing) return null;
      const updated: Todo = { ...existing, ...input };
      todos.set(id, updated);
      return updated;
    },

    delete: async (id) => todos.delete(id),
  };
};
