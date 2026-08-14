import { ChoiceList } from '@/components/ChoiceList';
import { DateField, SelectField } from '@/components/TextField';
import {
  BRANCH_OPTIONS,
  ENVIRONMENT_OPTIONS,
  REGION_OPTIONS,
  applyServiceChange,
  useServiceProfileStore,
  type MilitaryBranch,
} from '@/stores/serviceProfileStore';
import { SettingsLayout, SettingsSection } from './SettingsLayout';

/**
 * 프로필 관리.
 *
 * 복무 정보·자주 겪는 환경·기상 권역을 **받는 유일한 화면**이다.
 * 문서의 온보딩(유저플로우 1)은 이용범위·동의·알림 세 화면뿐이라
 * 최초 이용을 막지 않도록 여기로 옮겼다. 비어 있는 상태가 정상이다.
 *
 * 저장 버튼 없이 즉시 반영하며 저장 위치는 로컬이다 — `serviceProfileStore` 의 TODO 참고.
 */
export function ProfilePage() {
  const profile = useServiceProfileStore();

  return (
    <SettingsLayout title="프로필 관리">
      <SettingsSection title="복무 정보">
        <div className="flex flex-col gap-3">
          <SelectField
            label="군종"
            value={profile.branch}
            onChange={(value) =>
              profile.patch(applyServiceChange(profile, { branch: value as MilitaryBranch }))
            }
            options={BRANCH_OPTIONS}
          />
          <DateField
            label="입대일"
            value={profile.enlistedOn}
            onChange={(value) => profile.patch(applyServiceChange(profile, { enlistedOn: value }))}
          />
          <DateField
            label="전역예정일"
            value={profile.dischargeOn}
            onChange={(dischargeOn) => profile.patch({ dischargeOn })}
          />
        </div>
        <p className="mt-3 px-2 text-xs leading-relaxed text-fg-faint">
          군종이나 입대일을 바꾸면 전역예정일이 다시 계산돼요. 실제와 다르면 직접 고칠 수 있어요.
        </p>
      </SettingsSection>

      <SettingsSection title="자주 겪는 군 생활 환경">
        <ChoiceList
          mode="multi"
          choices={[...ENVIRONMENT_OPTIONS]}
          value={profile.environments}
          exclusiveValue="NONE"
          onChange={(environments) => profile.patch({ environments })}
        />
      </SettingsSection>

      <SettingsSection title="기상 권역">
        <ChoiceList
          mode="single"
          choices={[...REGION_OPTIONS]}
          value={profile.region}
          onChange={(region) => profile.patch({ region })}
        />
      </SettingsSection>

      <p className="pb-4 text-center text-xs text-fg-faint">변경한 내용은 자동으로 저장돼요.</p>
    </SettingsLayout>
  );
}
