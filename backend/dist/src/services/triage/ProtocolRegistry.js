"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROTOCOL_REGISTRY = void 0;
exports.detectProtocol = detectProtocol;
exports.PROTOCOL_REGISTRY = {
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
function detectProtocol(summary, initialSymptom) {
    const searchText = `${summary} ${initialSymptom}`.toLowerCase();
    for (const protocol of Object.values(exports.PROTOCOL_REGISTRY)) {
        if (protocol.keywords.some(keyword => searchText.includes(keyword.toLowerCase()))) {
            return protocol;
        }
    }
    return null;
}
//# sourceMappingURL=ProtocolRegistry.js.map