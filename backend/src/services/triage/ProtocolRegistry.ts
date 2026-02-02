export interface Protocol {
  id: string;
  keywords: string[];
  required_slots: string[];
}

export const PROTOCOL_REGISTRY: Record<string, Protocol> = {
  FEVER: {
    id: 'FEVER',
    keywords: ['fever', 'lagnat', 'mainit', 'nilalagnat', 'high temp'],
    required_slots: [
      'fever_duration',
      'fever_max_temp',
      'fever_antipyretic_response',
      'fever_hydration_ability',
      'fever_functional_status',
      'fever_red_flags_checklist',
    ],
  },
  CHEST_PAIN: {
    id: 'CHEST_PAIN',
    keywords: ['chest pain', 'sikip ng dibdib', 'masakit ang dibdib', 'heart pain'],
    required_slots: [
      'radiation',
      'character',
      'shortness_of_breath',
      'nausea',
      'sweating',
    ],
  },
};

export function detectProtocol(summary: string, initialSymptom: string): Protocol | null {
  const searchText = `${summary} ${initialSymptom}`.toLowerCase();
  
  for (const protocol of Object.values(PROTOCOL_REGISTRY)) {
    if (protocol.keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
      return protocol;
    }
  }
  
  return null;
}
