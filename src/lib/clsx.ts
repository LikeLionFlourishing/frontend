type ClassValue = string | false | null | undefined;

/** 조건부 className 결합. 이것 하나 때문에 의존성을 추가할 이유는 없다. */
export function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}
