import { Link, useNavigate } from 'react-router-dom';
import { Icon, type IconName } from '@/components/Icon';
import { useAuthStore } from '@/stores/authStore';
import { SettingsCard, SettingsDivider, SettingsHeader } from './my/settingsUi';

interface MenuItem {
  icon: IconName;
  label: string;
  /** 없으면 아직 열지 않은 항목이다. 죽은 버튼 대신 '준비 중'을 보여준다. */
  to?: string;
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
    { icon: 'lock', label: '계정관리' },
    { icon: 'bell', label: '알림 설정' },
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
                <MenuRow item={item} />
              </div>
            ))}
          </SettingsCard>
        ))}
      </div>
    </div>
  );
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

function MenuRow({ item }: { item: MenuItem }) {
  const label = (
    <>
      <Icon name={item.icon} className="size-5 shrink-0" />
      {/* 시안 변수 `본문강조` = SemiBold 16. font-medium 이 굵기를 500 으로 덮고 있었다 */}
      <span className="flex-1 text-left text-body-strong">{item.label}</span>
    </>
  );

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
