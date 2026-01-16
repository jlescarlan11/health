import { parseClarifyingQuestions } from '../gemini';

describe('Gemini Parser: parseClarifyingQuestions', () => {
  it('should correctly parse a valid JSON response with single question', () => {
    const aiResponse = `
      Some conversational text before JSON...
      {
        "questions": [
          {
            "id": "age",
            "text": "How old are you?",
            "type": "text"
          }
        ]
      }
      Some text after...
    `;

    const result = parseClarifyingQuestions(aiResponse);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].id).toBe('age');
    expect(result.questions[0].text).toBe('How old are you?');
    expect(result.questions[0].type).toBe('text');
  });

  it('should correctly parse batched questions', () => {
    const aiResponse = `
      {
        "questions": [
          {
            "id": "duration",
            "text": "When did it start?",
            "type": "text"
          },
          {
            "id": "severity",
            "text": "How bad is the pain?",
            "type": "choice",
            "options": ["Mild", "Moderate", "Severe"]
          }
        ]
      }
    `;

    const result = parseClarifyingQuestions(aiResponse);
    expect(result.questions).toHaveLength(2);
    expect(result.questions[0].id).toBe('duration');
    expect(result.questions[1].id).toBe('severity');
    expect(result.questions[1].options).toEqual(["Mild", "Moderate", "Severe"]);
  });

  it('should handle all valid IDs', () => {
    const aiResponse = `
      {
        "questions": [
          { "id": "age", "text": "Age?", "type": "text" },
          { "id": "duration", "text": "Duration?", "type": "text" },
          { "id": "severity", "text": "Severity?", "type": "text" },
          { "id": "progression", "text": "Progression?", "type": "text" },
          { "id": "red_flag_denials", "text": "Red Flags?", "type": "text" }
        ]
      }
    `;

    const result = parseClarifyingQuestions(aiResponse);
    expect(result.questions).toHaveLength(5);
  });

  it('should skip malformed questions but keep valid ones', () => {
    const aiResponse = `
      {
        "questions": [
          { "id": "age", "text": "Valid age", "type": "text" },
          { "id": "invalid_id", "text": "Invalid ID", "type": "text" },
          { "id": "duration", "type": "text" },
          { "id": "severity", "text": "Choice without options", "type": "choice" }
        ]
      }
    `;

    const result = parseClarifyingQuestions(aiResponse);
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0].id).toBe('age');
  });

  it('should throw error if no valid JSON block is found', () => {
    const aiResponse = "No JSON here, just text.";
    expect(() => parseClarifyingQuestions(aiResponse)).toThrow('Failed to process health assessment questions');
  });

  it('should throw error if questions array is missing', () => {
    const aiResponse = '{"some_other_key": []}';
    expect(() => parseClarifyingQuestions(aiResponse)).toThrow('Failed to process health assessment questions');
  });

  it('should throw error if no valid questions after filtering', () => {
    const aiResponse = '{"questions": [{"id": "wrong", "text": "test", "type": "text"}]}';
    expect(() => parseClarifyingQuestions(aiResponse)).toThrow('Failed to process health assessment questions');
  });
});
