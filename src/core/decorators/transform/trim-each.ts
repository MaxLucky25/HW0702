import { Transform, TransformFnParams } from 'class-transformer';

export const TrimEach = () => {
  return Transform(({ value }: TransformFnParams): any => {
    if (Array.isArray(value)) {
      return value.map((item) =>
        typeof item === 'string' ? item.trim() : item,
      );
    }
    return value;
  });
};
