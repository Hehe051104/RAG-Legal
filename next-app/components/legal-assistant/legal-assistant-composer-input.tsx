"use client";

import { LegalAssistantComposerSendButton } from "./legal-assistant-composer-send-button";
import { LegalAssistantComposerTextarea } from "./legal-assistant-composer-textarea";

export function LegalAssistantComposerInput({
  value,
  disabled,
  onChange,
  onSubmit,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex items-end gap-3">
      <LegalAssistantComposerTextarea disabled={disabled} onChange={onChange} onSubmit={onSubmit} value={value} />
      <LegalAssistantComposerSendButton disabled={disabled} onSubmit={onSubmit} />
    </div>
  );
}
