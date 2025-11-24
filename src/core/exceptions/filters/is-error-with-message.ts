export function isErrorWithMessage(e: unknown): e is { message: string } {
  // Проверяем, что e — это объект и он не равен null
  const isObject = typeof e === 'object' && e !== null;

  if (!isObject) return false;

  // Приводим e к объекту с неизвестными свойствами
  const maybeError = e as Record<string, unknown>;

  // Проверяем, есть ли у объекта свойство 'message' типа string
  return typeof maybeError.message === 'string';
}
