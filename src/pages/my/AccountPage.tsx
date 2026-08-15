import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/api/endpoints';
import { toUserMessage } from '@/api/problem';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton } from '@/components/StepLayout';
import { formatDotDate } from '@/lib/date';
import { useAuthStore } from '@/stores/authStore';
import { useReportDraftStore } from '@/stores/reportDraftStore';
import { useServiceProfileStore } from '@/stores/serviceProfileStore';
import { SettingsCard, SettingsDivider, SettingsLayout, SettingsSection } from './SettingsLayout';

export function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  const [confirmingDelete, setConfirmingDelete] = useState(false);

  /** 화면에 남아 있는 서버 데이터와 기기에 저장한 값을 함께 비운다. */
  const clearLocalState = ({ keepProfile }: { keepProfile: boolean }) => {
    setSession(null);
    queryClient.clear();
    // 작성 중이던 원문에는 피부 상태가 담긴다. 로그아웃 시에도 남기지 않는다.
    useReportDraftStore.getState().reset();
    if (!keepProfile) useServiceProfileStore.getState().reset();
  };

  const logout = useMutation({
    mutationFn: auth.logout,
    // 서버 호출이 실패해도(이미 만료된 세션 등) 사용자는 나가려는 것이므로 로컬은 정리한다.
    onSettled: () => {
      clearLocalState({ keepProfile: true });
      navigate('/login', { replace: true });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: auth.deleteAccount,
    onSuccess: () => {
      clearLocalState({ keepProfile: false });
      navigate('/login', { replace: true });
    },
  });

  return (
    <SettingsLayout title="계정관리">
      <SettingsSection title="계정 정보">
        <SettingsCard>
          <InfoRow label="이메일" value={user?.email ?? '-'} />
          <SettingsDivider />
          <InfoRow label="가입일" value={user ? formatDotDate(user.createdAt) : '-'} />
        </SettingsCard>
      </SettingsSection>

      <SettingsSection title="계정">
        <SettingsCard>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="w-full px-4 py-4 text-left text-body-strong font-medium text-panel-text disabled:opacity-50"
          >
            {logout.isPending ? '로그아웃 중…' : '로그아웃'}
          </button>
          <SettingsDivider />
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="w-full px-4 py-4 text-left text-body-strong font-medium text-caution-ink"
          >
            회원탈퇴
          </button>
        </SettingsCard>

        <p className="mt-3 px-2 text-xs leading-4 text-fg-faint">
          탈퇴하면 계정과 지금까지 남긴 피부 기록이 모두 삭제되고 되돌릴 수 없어요.
        </p>
      </SettingsSection>

      <BottomSheet
        open={confirmingDelete}
        onClose={() => setConfirmingDelete(false)}
        title="정말 탈퇴하시겠어요?"
        footer={
          /*
           * 되돌릴 수 없는 동작이라 강조색(초록) 버튼을 쓰지 않는다.
           * 앱 전체에서 초록은 '이대로 진행' 신호라 삭제에 붙이면 오인하기 쉽다.
           * 안전한 쪽을 가장 눈에 띄게 두고, 삭제는 경고색으로 한 단계 낮춘다.
           */
          <div className="flex flex-col gap-2">
            <PrimaryButton onClick={() => setConfirmingDelete(false)}>돌아가기</PrimaryButton>
            <button
              type="button"
              onClick={() => deleteAccount.mutate()}
              disabled={deleteAccount.isPending}
              className="w-full rounded-pill px-5 py-4 text-body-strong text-caution transition active:bg-caution/10 disabled:opacity-50"
            >
              {deleteAccount.isPending ? '삭제 중…' : '탈퇴하고 모두 삭제'}
            </button>
          </div>
        }
      >
        <ul className="flex flex-col gap-2 text-sm leading-[18px] text-fg-muted">
          <li>· 지금까지의 피부 보고와 관리 기록이 즉시 삭제돼요.</li>
          <li>· 삭제한 기록은 복구할 수 없어요.</li>
          <li>· 같은 이메일로 다시 가입할 수 있지만, 이전 기록은 돌아오지 않아요.</li>
        </ul>

        {deleteAccount.isError && (
          <p className="mt-4 text-sm text-caution-500">{toUserMessage(deleteAccount.error)}</p>
        )}
      </BottomSheet>
    </SettingsLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <span className="shrink-0 text-sm text-panel-label">{label}</span>
      <span className="min-w-0 flex-1 truncate text-right text-body-strong font-medium text-panel-text">
        {value}
      </span>
    </div>
  );
}
