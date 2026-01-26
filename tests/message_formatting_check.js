// Simulation of the regression check for SymptomAssessmentScreen message composition

// Mock of formatEmpatheticResponse from src/utils/empatheticResponses.ts
// We assume it puts nextAction in metadata.empatheticFormatter if passed
const formatEmpatheticResponse = ({
  header,
  body,
  reason,
  reasonSource,
  nextAction,
  metadata,
}) => {
  const contentBlocks = [];
  if (header?.trim()) contentBlocks.push(header.trim());
  if (body?.trim()) contentBlocks.push(body.trim());

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

// The NEW logic from SymptomAssessmentScreen.tsx
const composeAssistantMessage = ({
  id,
  body,
  header,
  reason,
  reasonSource,
  nextAction,
  timestamp,
  extra = {},
}) => {
  const { metadata: extraMetadata, ...extraRest } = extra;
  
  // Explicitly move nextAction to metadata
  const safeMetadata = {
    ...(extraMetadata || {}),
    nextAction,
    reason,
    reasonSource,
  };

  const formatted = formatEmpatheticResponse({
    header,
    body,
    reason,
    reasonSource,
    // nextAction, // OMITTED
    metadata: safeMetadata,
  });
  return {
    id,
    sender: 'assistant',
    timestamp,
    ...extraRest,
    text: formatted.text,
    metadata: formatted.metadata,
  };
};

// Regression Test
console.log("Running Regression Check...");

const msg = composeAssistantMessage({
    id: "test-1",
    body: "Hello world",
    nextAction: "Do NOT show this",
    timestamp: 12345
});

// Check 1: Text should NOT contain nextAction
if (msg.text.includes("Do NOT show this")) {
    console.error("FAIL: nextAction found in text!");
    process.exit(1);
} else {
    console.log("PASS: nextAction is hidden from text.");
}

// Check 2: Metadata SHOULD contain nextAction
if (msg.metadata.nextAction === "Do NOT show this") {
    console.log("PASS: nextAction is preserved in metadata.");
} else {
    console.error("FAIL: nextAction lost from metadata!", msg.metadata);
    process.exit(1);
}

// Check 3: EmpatheticFormatter metadata should NOT have it (since we omitted it)
if (msg.metadata.empatheticFormatter.nextAction === undefined) {
    console.log("PASS: EmpatheticFormatter does not have nextAction (correctly omitted).");
} else {
    console.error("FAIL: EmpatheticFormatter still has nextAction!", msg.metadata.empatheticFormatter);
    process.exit(1);
}

console.log("Regression check passed.");
