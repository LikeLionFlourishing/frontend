import { useState } from 'react';
import { ChoiceList } from '@/components/ChoiceList';
import { BottomSheet } from '@/components/BottomSheet';
import { Sentences } from '@/components/Sentences';
import { PrimaryButton } from '@/components/StepLayout';
import { labelOf, labelsOf } from '@/hooks/useReportOptions';
import { clsx } from '@/lib/clsx';
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
  /*
   * 대표 부위 외에 불편한 곳. 2026-08-18 시안에서 입력 행이 빠져 **늘 null** 이다.
   * 계약이 nullable 필수라 자리는 남긴다.
   */
  otherAreasNote: string | null;
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
  /** AI 구조화가 실패해 사용자가 직접 채워야 하는 경우 안내를 띄운다. */
  aiFailed?: boolean;
}

/** 화면에 행으로 나오는 항목. `otherAreasNote` 는 시안에서 빠져 여기 없다. */
type FieldKey = Exclude<keyof ConfirmValues, 'otherAreasNote'>;

/**
 * 2026-08-18 시안(32:51747)에서 행이 **여섯 → 다섯**이 됐다.
 *
 *  · `다른 부위 추가 설명`(otherAreasNote) 행이 빠졌다. 계약은 이 값을
 *    nullable 로 받으므로 늘 null 을 보낸다.
 *  · `불편` 이 **`피부 상태`** 로 바뀌고 두 번째로 올라왔다.
 */
const FIELDS: { key: FieldKey; label: string; required: boolean }[] = [
  { key: 'primaryArea', label: '부위', required: true },
  { key: 'sensations', label: '피부 상태', required: true },
  { key: 'appearances', label: '겉모습', required: true },
  { key: 'situations', label: '직전 상황', required: true },
  { key: 'careAvailability', label: '현재 상태', required: true },
];

/**
 * 3-2. 보고 내용 확인·수정.
 *
 * 이 서비스의 신뢰도가 결정되는 화면이다.
 * 사용자가 최종 확인한 값만 저장되고, 결과 유형 분기에도 이 값만 쓰인다. (F-03)
 */
export function ConfirmStep({ options, values, onChange, onConfirm, aiFailed }: Props) {
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
  const allFilled = FIELDS.every((f) => !f.required || !isEmpty(f.key));

  return (
    <div className="flex flex-col">
      {aiFailed && (
        <p className="mb-5 rounded-card bg-card-raised px-4 py-3 text-sm text-fg-muted">
          <Sentences text="정리에 실패했어요. 아래 항목을 직접 선택해 주세요." />
        </p>
      )}

      {/* 시안(25:28859) 기준 행 369×75 · 간격 7 · 좌우 여백 22, 첫 행 상단 131 */}
      <div className="mt-[3px] flex flex-col gap-[7px]">
        {FIELDS.map((field) => (
          <button
            key={field.key}
            type="button"
            onClick={() => setEditing(field.key)}
            className="flex h-[75px] w-full items-center justify-between gap-3 rounded-card bg-panel px-[22px] text-left"
          >
            <span className="min-w-0">
              <span className="block text-xs text-panel-label">{field.label}</span>
              <span
                className={clsx(
                  'mt-1 block truncate text-body-strong font-semibold',
                  isEmpty(field.key) && !field.required ? 'text-panel-label' : 'text-panel-text',
                )}
              >
                {isEmpty(field.key)
                  ? field.required
                    ? '선택해주세요'
                    : '없어요'
                  : displayOf(field.key)}
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-sm font-medium text-info">
              수정
            </span>
          </button>
        ))}
      </div>

      {/*
       * 시안에는 `확인했어요` 하나뿐이다(상단 719). 예전에 있던 `다시 작성할래요` 는
       * 2026-08-15 시안에서 빠졌다 — 다시 쓰려면 뒤로가기로 한 문장 화면까지 돌아간다.
       *
       * 시안은 마지막 행과 버튼을 103 띄우지만 그러면 화면이 넘친다. 여백만 줄인다.
       */}
      <div className="mt-[43px] pb-8">
        <PrimaryButton onClick={onConfirm} disabled={!allFilled}>
          확인했어요
        </PrimaryButton>
      </div>

      {!allFilled && (
        <p className="-mt-4 pb-4 text-center text-sm text-fg-muted">비어 있는 항목을 채워주세요.</p>
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
          onChange={(v) => onChange({ appearances: v as AppearanceSelection })}
        />
      )}

      {field === 'sensations' && (
        <ChoiceList
          mode="multi"
          choices={options.sensations}
          value={values.sensations}
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
