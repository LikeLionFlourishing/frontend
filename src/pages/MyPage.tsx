import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { auth, notifications } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { queryClient, queryKeys } from '@/app/queryClient';
import { BottomSheet } from '@/components/BottomSheet';
import { Icon, type IconName } from '@/components/Icon';
import { Sentences } from '@/components/Sentences';
import { PrimaryButton } from '@/components/StepLayout';
import {
  isPushConfigured,
  isPushSupported,
  PushUnavailableError,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push';
import { useAuthStore } from '@/stores/authStore';
import { SettingsCard, SettingsDivider, SettingsHeader } from './my/settingsUi';

/** 화면을 옮기지 않고 그 자리에서 바텀시트로 여는 항목. */
type SheetKind = 'account' | 'notification';

interface MenuItem {
  icon: IconName;
  label: string;
  /** 없으면 아직 열지 않은 항목이다. 죽은 버튼 대신 '준비 중'을 보여준다. */
  to?: string;
  opens?: SheetKind;
}

/*
 * 시안(Figma `설정` 5:728)의 3개 묶음을 그대로 따른다.
 * 현재 열려 있는 건 계정·알림·기록 세 개다.
 * 나머지는 코드가 아니라 내용(약관 문구, 고객지원 채널)이 없어서 막혀 있다.
 * `프로필 관리` 는 복무 정보가 범위에서 빠지면서 보여 줄 내용이 없어졌다.
 */
const GROUPS: MenuItem[][] = [
  [
    { icon: 'person', label: '프로필 관리' },
    { icon: 'lock', label: '계정관리', opens: 'account' },
    { icon: 'bell', label: '알림 설정', opens: 'notification' },
  ],
  [
    { icon: 'clock', label: '기록', to: '/records' },
    { icon: 'gear', label: '서비스' },
    { icon: 'shield', label: '약관 및 개인정보' },
  ],
  [
    { icon: 'help', label: '도움말' },
    { icon: 'alert', label: '문의하기' },
    { icon: 'phone', label: '고객지원' },
  ],
];

export function MyPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [sheet, setSheet] = useState<SheetKind | null>(null);

  return (
    <div className="mx-auto w-full max-w-app px-4 pt-[calc(var(--safe-top)+9px)]">
      {/* 시안(15:4748)은 탭 루트인데도 뒤로가기가 있다. */}
      <SettingsHeader title="설정" onBack={() => navigate(-1)} />

      <ProfileCard email={user?.email ?? ''} />

      {/* 시안 — 프로필 카드 아래 38, 묶음 사이 17 */}
      <div className="mt-[38px] flex flex-col gap-[17px]">
        {GROUPS.map((group) => (
          <SettingsCard key={group[0]!.label}>
            {group.map((item, index) => (
              <div key={item.label}>
                {index > 0 && <SettingsDivider />}
                <MenuRow item={item} onOpen={setSheet} />
              </div>
            ))}
          </SettingsCard>
        ))}
      </div>

      <AccountSheet open={sheet === 'account'} onClose={() => setSheet(null)} />
      <NotificationSheet open={sheet === 'notification'} onClose={() => setSheet(null)} />
    </div>
  );
}

/*
 * 계정 관리.
 *
 * 시안에 `계정관리` 행은 있지만 그 행이 여는 화면은 없다. 그렇다고 비워 두면
 * **한 번 로그인한 뒤 앱에서 나갈 방법이 없다.** 화면을 새로 만들지는 않고
 * 이 행이 그 자리에서 바텀시트를 여는 것으로 뒀다. (docs/명세-대조.md 2-10)
 */
function AccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);

  const logout = useMutation({
    mutationFn: () => auth.logout(),
    onSuccess: () => {
      setSession(null);
      // 다음 사용자의 화면에 앞사람 기록이 남지 않게 캐시를 비운다.
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="계정관리"
      footer={
        <PrimaryButton onClick={() => logout.mutate()} disabled={logout.isPending}>
          {logout.isPending ? '로그아웃 중…' : '로그아웃'}
        </PrimaryButton>
      }
    >
      <p className="px-1 text-xs leading-4 text-fg-muted">
        <Sentences text="로그아웃해도 기록은 지워지지 않아요. 다시 로그인하면 그대로 볼 수 있어요." />
      </p>
      {logout.isError && (
        <p className="mt-3 px-1 text-sm text-caution-500">
          <Sentences text={toUserMessage(logout.error)} />
        </p>
      )}
    </BottomSheet>
  );
}

/*
 * 알림 설정.
 *
 * 시안에 `알림 설정` 행은 있지만 그 행이 여는 화면은 없다. 화면을 새로 만들지 않고
 * 이 자리에서 바텀시트로 on/off 를 다룬다. (docs/명세-대조.md 2-10)
 *
 * 알림이 실제로 오려면 두 가지가 다 있어야 한다 —
 *   (1) 서버의 수신 설정(`enabled`)
 *   (2) 이 브라우저의 푸시 구독(`POST /push-subscriptions`).
 * 켤 때는 구독을 먼저 만들고 설정을 켠다. 끌 때는 반대로 설정을 끄고 구독을 지운다.
 */
function NotificationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
        await notifications.updateSettings(true);
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

function ProfileCard({ email }: { email: string }) {
  return (
    // 시안 31:44797 — 370×100, 모서리 17, 사진 왼쪽 18
    <div className="flex h-[100px] items-center gap-[8px] rounded-[17px] bg-panel px-[18px]">
      {/* TODO(디자인): 프로필 이미지 정책 미정. 지금은 빈 원. */}
      <div aria-hidden="true" className="size-[54px] shrink-0 rounded-full bg-panel-label/30" />
      <div className="min-w-0">
        {/* PLACEHOLDER: User 스키마에 이름이 없다. 홈 화면과 같은 임시값. */}
        <p className="text-body-strong text-fg-muted">김멋사</p>
        {/* 시안 31:44799 — 변수 `보조` = Thin 12 */}
        <p className="mt-[7px] truncate text-xs font-thin text-fg-muted">{email}</p>
      </div>
    </div>
  );
}

function MenuRow({ item, onOpen }: { item: MenuItem; onOpen: (sheet: SheetKind) => void }) {
  const label = (
    <>
      <Icon name={item.icon} className="size-5 shrink-0" />
      {/* 시안 변수 `본문강조` = SemiBold 16. font-medium 이 굵기를 500 으로 덮고 있었다 */}
      <span className="flex-1 text-left text-body-strong">{item.label}</span>
    </>
  );

  if (item.opens) {
    const opens = item.opens;
    return (
      <button
        type="button"
        onClick={() => onOpen(opens)}
        className="flex h-[51px] w-full items-center gap-4 px-[21px] text-left text-fg-muted"
      >
        {label}
        <span aria-hidden="true" className="shrink-0 text-fg-muted">
          ›
        </span>
      </button>
    );
  }

  if (!item.to) {
    return (
      <div
        aria-disabled="true"
        className="flex h-[51px] items-center gap-4 px-[21px] text-fg-muted opacity-60"
      >
        {label}
        <span className="shrink-0 text-xs">준비 중</span>
      </div>
    );
  }

  return (
    <Link to={item.to} className="flex h-[51px] items-center gap-4 px-[21px] text-fg-muted">
      {label}
      <span aria-hidden="true" className="shrink-0 text-panel-label">
        ›
      </span>
    </Link>
  );
}
