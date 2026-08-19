import { useMutation, useQuery } from '@tanstack/react-query';
import { notifications } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryClient, queryKeys } from '@/app/queryClient';
import { BottomSheet } from '@/components/BottomSheet';
import { Sentences } from '@/components/Sentences';
import { PrimaryButton } from '@/components/StepLayout';
import {
  isPushConfigured,
  isPushSupported,
  PushUnavailableError,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push';

/*
 * 알림 설정 바텀시트.
 *
 * 시안에 `알림 설정`(설정) · `알람 설정하기`(홈 NEXT CHECK) 진입점은 있지만 그 행이 여는
 * 화면은 없다. 화면을 새로 만들지 않고 이 시트로 on/off 를 다룬다. (docs/명세-대조.md 2-10)
 * 설정·홈 양쪽에서 같이 쓴다.
 *
 * 알림이 실제로 오려면 두 가지가 다 있어야 한다 —
 *   (1) 서버의 수신 설정(`enabled`)
 *   (2) 이 브라우저의 푸시 구독(`POST /push-subscriptions`).
 * 켤 때는 구독을 먼저 만들고 설정을 켠다. 끌 때는 반대로 설정을 끄고 구독을 지운다.
 */
export function NotificationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settingsQuery = useQuery({
    queryKey: queryKeys.notificationSettings,
    queryFn: notifications.getSettings,
    enabled: open,
  });
  const enabled = settingsQuery.data?.enabled ?? false;

  // 이 기기에서 아예 켤 수 없는 상태(미지원·키없음)면 토글을 잠근다.
  const blocked = !isPushSupported()
    ? '이 브라우저는 알림을 지원하지 않아요.'
    : !isPushConfigured()
      ? '알림 서버 키가 설정되지 않았어요.'
      : null;

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) {
        // 구독을 먼저 만든다. 실패하면(권한 거부 등) 설정은 건드리지 않는다.
        await subscribeToPush();
        /*
         * 켤 때는 수신 동의를 함께 보낸다. 온보딩에서 알림을 건너뛴 사용자는 저장된 동의가
         * 없어서, 이 값이 빠지면 서버가 422 로 막는다. 버전은 조회 응답이 활성 버전을
         * 담아 주므로 그것을 그대로 되돌려 준다.
         */
        const version = settingsQuery.data?.consent.version;
        await notifications.updateSettings(true, version ? { agreed: true, version } : undefined);
      } else {
        await notifications.updateSettings(false);
        await unsubscribeFromPush();
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notificationSettings }),
  });

  const time = settingsQuery.data?.time;

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="알림 설정"
      footer={
        <PrimaryButton
          onClick={() => toggle.mutate(!enabled)}
          disabled={Boolean(blocked) || settingsQuery.isPending || toggle.isPending}
        >
          {toggle.isPending ? '변경 중…' : enabled ? '알림 끄기' : '알림 받기'}
        </PrimaryButton>
      }
    >
      <p className="px-1 text-sm text-panel-text">
        {enabled ? '알림을 받고 있어요.' : '알림이 꺼져 있어요.'}
      </p>
      {/* 매일 점호 시각은 온보딩에서 정한 값이다. 설정 화면에서의 변경은 P1(timeEditable=false). */}
      {time && (
        <p className="mt-2 px-1 text-xs leading-4 text-panel-label">
          <Sentences text={`매일 ${time} 에 피부점호 알림을 보내요.`} />
        </p>
      )}
      {blocked && (
        <p className="mt-3 px-1 text-xs leading-4 text-fg-faint">
          <Sentences text={blocked} />
        </p>
      )}
      {toggle.isError && (
        <p className="mt-3 px-1 text-sm text-caution-500">
          <Sentences text={pushErrorMessage(toggle.error)} />
        </p>
      )}
    </BottomSheet>
  );
}

/** 푸시 실패를 사람 말로. `PushUnavailableError` 는 이유별로 다르게 안내한다. */
function pushErrorMessage(error: unknown): string {
  if (error instanceof PushUnavailableError) {
    if (error.reason === 'DENIED') {
      return '알림이 차단돼 있어요. 브라우저·기기 설정에서 이 사이트의 알림을 허용해 주세요.';
    }
    return error.message;
  }
  return toUserMessage(error);
}
