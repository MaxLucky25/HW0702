import { DomainExceptionCode } from './domain-exception-codes';

export class Extension {
  constructor(
    public message: string,
    public key: string,
  ) {}
}

export class DomainException extends Error {
  code: DomainExceptionCode;
  field: string;
  extensions: Extension[];
  constructor({
    code,
    message,
    field,
    extensions = [],
  }: {
    code: DomainExceptionCode;
    message: string;
    field: string;
    extensions?: Extension[];
  }) {
    super(message);
    this.code = code;
    this.field = field;
    this.extensions = extensions;
  }
}
