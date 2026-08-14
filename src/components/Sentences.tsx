/**
 * 문장마다 줄을 바꾼다.
 *
 * 두 문장 이상인 문단을 그냥 두면 브라우저가 폭에 맞춰 문장 **중간**에서 접는다.
 * 온점에서 끊어야 어디까지가 한 이야기인지 눈에 들어온다.
 *
 * 감싸는 요소는 호출부가 정한다 — 문단마다 크기·색이 달라서다.
 *
 *   <p className="text-xs text-fg-muted">
 *     <Sentences text="첫 문장이에요. 둘째 문장이에요." />
 *   </p>
 */
export function Sentences({ text }: { text: string }) {
  return splitSentences(text).map((sentence, index) => (
    <span key={index} className="block">
      {sentence}
    </span>
  ));
}

/**
 * 마침표·물음표·느낌표 **뒤에 공백이 오는 지점**에서만 자른다.
 * 뒤에 공백이 없으면 문단 끝이거나 소수점이라 자르지 않는다.
 */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
