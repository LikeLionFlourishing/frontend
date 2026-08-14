import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryKeys } from '@/app/queryClient';
import { TimeWheel } from '@/components/TimeWheel';
import { clsx } from '@/lib/clsx';
import {
  isPushConfigured,
  isPushSupported,
  PushUnavailableError,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push';
import { useServiceProfileStore } from '@/stores/serviceProfileStore';
import { SettingsCard, SettingsLayout, SettingsSection } from './SettingsLayout';

export function NotificationsPage() {
  const queryClient = useQueryClient();
  const profile = useServiceProfileStore();

  const settingsQuery = useQuery({
    queryKey: queryKeys.notificationSettings,
    queryFn: notifications.getSettings,
  });

  /**
   * 수신 여부(서버 설정)와 기기 구독(Web Push)은 별개다.
   * 켤 때는 구독을 먼저 만들고 서버 설정을 켠다 — 순서가 반대면
   * 설정만 켜진 채 알림이 오지 않는 상태가 생긴다.
   */
  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      if (next) await subscribeToPush();
      else await unsubscribeFromPush();
      return notifications.updateSettings(next);
    },
    onSuccess: (next) => queryClient.setQueryData(queryKeys.notificationSettings, next),
  });

  const enabled = settingsQuery.data?.enabled ?? false;
  const serverTime = settingsQuery.data?.time;
  const pushReady = isPushSupported() && isPushConfigured();

  return (
    <SettingsLayout title="알림 설정">
      <SettingsSection title="피부점호 알림">
        <SettingsCard>
          <div className="flex items-center gap-4 px-4 py-4">
            <div className="min-w-0 flex-1">
              <p className="text-body-strong font-medium text-panel-text">알림 받기</p>
              <p className="mt-1 text-xs text-panel-label">
                정해진 시각에 오늘의 피부점호를 알려드려요.
              </p>
            </div>
            <Switch
              checked={enabled}
              // 구독을 만들 수 없는 환경에서 켜면 설정만 켜지고 알림은 안 온다.
              disabled={settingsQuery.isPending || toggle.isPending || (!enabled && !pushReady)}
              onChange={(next) => toggle.mutate(next)}
              label="알림 받기"
            />
          </div>
        </SettingsCard>

        {!pushReady && !enabled && (
          <p className="mt-2 px-2 text-xs leading-relaxed text-fg-faint">
            {isPushSupported()
              ? // TODO(백엔드): VAPID 공개키를 받으면 `VITE_VAPID_PUBLIC_KEY` 에 넣는다.
                '알림 서버 준비가 끝나면 켤 수 있어요.'
              : '이 브라우저는 알림을 지원하지 않아요. 앱을 홈 화면에 추가하면 받을 수 있어요.'}
          </p>
        )}

        {toggle.isError && (
          <p className="mt-2 px-2 text-sm text-caution-500">{pushErrorMessage(toggle.error)}</p>
        )}
      </SettingsSection>

      <SettingsSection title="기본 피부점호 시각">
        <div className="flex justify-center rounded-card bg-panel py-6">
          <TimeWheel
            value={profile.checkInTime}
            onChange={(checkInTime) => profile.patch({ checkInTime })}
          />
        </div>

        <p className="mt-3 px-2 text-xs leading-relaxed text-fg-faint">
          부대마다 휴대전화를 쓸 수 있는 시간이 달라요.
          {/*
            서버는 발송 시각을 고정값으로 두고 있다(NotificationSettings.time 이 const).
            사용자가 고른 시각은 아직 발송에 반영되지 않으므로 숨기지 않고 그대로 알린다.
            TODO(백엔드): 시각 변경이 열리면 이 문구를 지운다.
          */}
          {serverTime && enabled && (
            <>
              <br />
              지금은 준비 중이라 알림이 {serverTime}에 발송돼요. 곧 설정한 시각으로 바뀝니다.
            </>
          )}
        </p>
      </SettingsSection>
    </SettingsLayout>
  );
}

function Switch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative h-8 w-14 shrink-0 rounded-full transition disabled:opacity-50',
        checked ? 'bg-accent' : 'bg-panel-label/40',
      )}
    >
      <span
        aria-hidden="true"
        className={clsx(
          'absolute top-1 size-6 rounded-full bg-white transition-all',
          checked ? 'left-7' : 'left-1',
        )}
      />
    </button>
  );
}

/** 구독 실패는 원인마다 사용자가 할 일이 다르다. */
function pushErrorMessage(error: unknown): string {
  if (error instanceof PushUnavailableError) return error.message;
  return toUserMessage(error);
}
