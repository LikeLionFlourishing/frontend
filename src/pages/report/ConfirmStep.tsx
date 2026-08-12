import { useState } from 'react';
import { ChoiceList } from '@/components/ChoiceList';
import { BottomSheet } from '@/components/BottomSheet';
import { PrimaryButton, SecondaryButton } from '@/components/StepLayout';
import { labelOf, labelsOf } from '@/hooks/useReportOptions';
import { EXCLUSIVE_OPTION } from '@/api/schemas';
import type {
  AppearanceSelection,
  BodyArea,
  CareAvailability,
  SensationSelection,
  SituationSelection,
  SkinReportOptions,
} from '@/api/schemas';

export interface ConfirmValues {
  primaryArea: BodyArea | null;
  appearances: AppearanceSelection;
  sensations: SensationSelection;
  situations: SituationSelection;
  careAvailability: CareAvailability | null;
}

interface Props {
  options: SkinReportOptions;
  values: ConfirmValues;
  onChange: (partial: Partial<ConfirmValues>) => void;
  onConfirm: () => void;
  onRewrite: () => void;
  /** AI 구조화가 실패해 사용자가 직접 채워야 하는 경우 안내를 띄운다. */
  aiFailed?: boolean;
}

type FieldKey = keyof ConfirmValues;

const FIELDS: { key: FieldKey; label: string }[] = [
  { key: 'primaryArea', label: '부위' },
  { key: 'appearances', label: '겉모습' },
  { key: 'sensations', label: '불편' },
  { key: 'situations', label: '직전 상황' },
  { key: 'careAvailability', label: '현재 상태' },
];

/**
 * 3-2. 보고 내용 확인·수정.
 *
 * 이 서비스의 신뢰도가 결정되는 화면이다.
 * 사용자가 최종 확인한 값만 저장되고, 결과 유형 분기에도 이 값만 쓰인다. (F-03)
 */
export function ConfirmStep({ options, values, onChange, onConfirm, onRewrite, aiFailed }: Props) {
  const [editing, setEditing] = useState<FieldKey | null>(null);

  const displayOf = (key: FieldKey): string => {
    switch (key) {
      case 'primaryArea':
        return labelOf(options.areas, values.primaryArea);
      case 'appearances':
        return labelsOf(options.appearances, values.appearances);
      case 'sensations':
        return labelsOf(options.sensations, values.sensations);
      case 'situations':
        return labelsOf(options.situations, values.situations);
      case 'careAvailability':
        return labelOf(options.careAvailability, values.careAvailability);
    }
  };

  const isEmpty = (key: FieldKey) => displayOf(key).length === 0;
  const allFilled = FIELDS.every((f) => !isEmpty(f.key));

  return (
    <div className="flex flex-col gap-5">
      {aiFailed && (
        <p className="rounded-card bg-card-raised px-4 py-3 text-sm text-fg-muted">
          정리에 실패했어요. 아래 항목을 직접 선택해 주세요.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {FIELDS.map((field) => (
          <button
            key={field.key}
            type="button"
            onClick={() => setEditing(field.key)}
            className="flex w-full items-center justify-between gap-3 rounded-card bg-panel px-5 py-4 text-left"
          >
            <span className="min-w-0">
              <span className="block text-xs text-panel-label">{field.label}</span>
              <span className="mt-1 block truncate text-body-strong font-semibold text-panel-text">
                {isEmpty(field.key) ? '선택해주세요' : displayOf(field.key)}
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-sm text-accent">
              수정
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 pt-6">
        <PrimaryButton onClick={onConfirm} disabled={!allFilled}>
          확인했어요
        </PrimaryButton>
        <SecondaryButton onClick={onRewrite}>다시 작성할래요</SecondaryButton>
      </div>

      {!allFilled && (
        <p className="text-center text-sm text-fg-muted">비어 있는 항목을 채워주세요.</p>
      )}

      <EditSheet
        field={editing}
        options={options}
        values={values}
        onChange={onChange}
        onClose={() => setEditing(null)}
      />
    </div>
  );
}

function EditSheet({
  field,
  options,
  values,
  onChange,
  onClose,
}: {
  field: FieldKey | null;
  options: SkinReportOptions;
  values: ConfirmValues;
  onChange: (partial: Partial<ConfirmValues>) => void;
  onClose: () => void;
}) {
  if (!field) return null;

  const meta = FIELDS.find((f) => f.key === field)!;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={meta.label}
      footer={<PrimaryButton onClick={onClose}>완료</PrimaryButton>}
    >
      {field === 'primaryArea' && (
        <ChoiceList
          mode="single"
          choices={options.areas}
          value={values.primaryArea}
          onChange={(v) => onChange({ primaryArea: v as BodyArea })}
        />
      )}

      {field === 'appearances' && (
        <ChoiceList
          mode="multi"
          choices={options.appearances}
          value={values.appearances}
          exclusiveValue={EXCLUSIVE_OPTION.appearances}
          onChange={(v) => onChange({ appearances: v as AppearanceSelection })}
        />
      )}

      {field === 'sensations' && (
        <ChoiceList
          mode="multi"
          choices={options.sensations}
          value={values.sensations}
          exclusiveValue={EXCLUSIVE_OPTION.sensations}
          onChange={(v) => onChange({ sensations: v as SensationSelection })}
        />
      )}

      {field === 'situations' && (
        <ChoiceList
          mode="multi"
          choices={options.situations}
          value={values.situations}
          exclusiveValue={EXCLUSIVE_OPTION.situations}
          onChange={(v) => onChange({ situations: v as SituationSelection })}
        />
      )}

      {field === 'careAvailability' && (
        <ChoiceList
          mode="single"
          choices={options.careAvailability}
          value={values.careAvailability}
          onChange={(v) => onChange({ careAvailability: v as CareAvailability })}
        />
      )}
    </BottomSheet>
  );
}
