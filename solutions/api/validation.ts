import type { CreateTodoInput, UpdateTodoInput } from './types/todo.types';

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const validateCreateTodo = (body: unknown): ValidationResult<CreateTodoInput> => {
  if (!isRecord(body)) return { ok: false, error: 'Body must be a JSON object' };
  const { title } = body;
  if (typeof title !== 'string' || title.trim().length === 0) {
    return { ok: false, error: 'title is required and must be a non-empty string' };
  }
  return { ok: true, value: { title: title.trim() } };
};

export const validateUpdateTodo = (body: unknown): ValidationResult<UpdateTodoInput> => {
  if (!isRecord(body)) return { ok: false, error: 'Body must be a JSON object' };

  const value: UpdateTodoInput = {};

  if ('title' in body) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return { ok: false, error: 'title must be a non-empty string' };
    }
    value.title = body.title.trim();
  }

  if ('completed' in body) {
    if (typeof body.completed !== 'boolean') {
      return { ok: false, error: 'completed must be a boolean' };
    }
    value.completed = body.completed;
  }

  return { ok: true, value };
};
