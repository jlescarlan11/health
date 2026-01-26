export interface EmpatheticResponseInput {
  header?: string;
  body?: string;
  reason?: string;
  reasonSource?: string;
  nextAction?: string;
  inlineAck?: string;
  metadata?: Record<string, unknown>;
}

export interface EmpatheticResponseOutput {
  text: string;
  metadata: Record<string, unknown>;
}

const ensureSentenceEnding = (value?: string) => {
  if (!value) return '';
  const trimmed = value.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

export const formatEmpatheticResponse = ({
  header,
  body,
  reason,
  reasonSource,
  nextAction,
  inlineAck,
  metadata,
}: EmpatheticResponseInput): EmpatheticResponseOutput => {
  const contentBlocks: string[] = [];

  if (header?.trim()) {
    contentBlocks.push(header.trim());
  }
  
  let mainBody = body?.trim() || '';
  if (inlineAck?.trim()) {
    const ack = ensureSentenceEnding(inlineAck.trim());
    mainBody = mainBody ? `${ack} ${mainBody}` : ack;
  }

  if (mainBody) {
    contentBlocks.push(mainBody);
  }

  // Internal fields (reason, nextAction) are intentionally excluded from the user-facing text
  // but preserved in metadata for debugging context.

  return {
    text: contentBlocks.join('\n\n'),
    metadata: {
      ...(metadata ?? {}),
      empatheticFormatter: {
        reason,
        reasonSource,
        nextAction,
        header,
        inlineAck,
      },
    },
  };
};
