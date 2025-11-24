import { Transform, TransformFnParams } from 'class-transformer';

export const Trim = () => {
  return Transform(({ value }: TransformFnParams): string => {
    return typeof value === 'string' ? value.trim() : value;
  });
};
