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

const stripTrailingPunctuation = (value?: string) => {
  if (!value) return '';
  return value.trim().replace(/[.!?]+$/g, '');
};

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

  const reasonSentence = reason ? `I'm mentioning this because ${stripTrailingPunctuation(reason)}.` : '';
  const actionSentence = ensureSentenceEnding(
    nextAction ?? 'Please follow the guidance above so I can continue helping safely',
  );

  const supplementalSentence = [reasonSentence, actionSentence].filter(Boolean).join(' ');
  if (supplementalSentence) {
    contentBlocks.push(supplementalSentence);
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
