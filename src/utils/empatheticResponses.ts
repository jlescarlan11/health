export interface EmpatheticResponseInput {
  header?: string;
  body?: string;
  reason?: string;
  reasonSource?: string;
  nextAction?: string;
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
  metadata,
}: EmpatheticResponseInput): EmpatheticResponseOutput => {
  const contentBlocks: string[] = [];

  if (header?.trim()) {
    contentBlocks.push(header.trim());
  }
  if (body?.trim()) {
    contentBlocks.push(body.trim());
  }

  // Reason is intentionally excluded from the user-facing text
  // but preserved in metadata for debugging context.

  const actionSentence = ensureSentenceEnding(
    nextAction ?? 'Please follow the guidance above so I can continue helping safely',
  );

  if (actionSentence) {
    contentBlocks.push(actionSentence);
  }

  return {
    text: contentBlocks.join('\n\n'),
    metadata: {
      ...(metadata ?? {}),
      empatheticFormatter: {
        reason,
        reasonSource,
        nextAction,
        header,
      },
    },
  };
};
