import { useEffect, type ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function BottomSheet({ open, onClose, title, children, footer }: Props) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);

    // 시트가 열린 동안 뒤 배경이 스크롤되지 않게 막는다.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="safe-bottom relative flex max-h-[85dvh] w-full max-w-app flex-col rounded-t-[28px] bg-card px-5 pb-4 pt-3"
      >
        <div aria-hidden="true" className="mx-auto mb-4 h-1 w-10 rounded-full bg-panel-label" />
        <h2 className="mb-4 text-body-strong font-semibold text-fg">{title}</h2>

        <div className="-mx-1 flex-1 overflow-y-auto px-1 pb-2">{children}</div>

        {footer && <div className="pt-3">{footer}</div>}
      </div>
    </div>
  );
}
