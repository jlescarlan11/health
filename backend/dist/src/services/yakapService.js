"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getYakapInfo = void 0;
const getYakapInfo = () => {
    return {
        program_name: 'YAKAP (Yaman ang Kalusugan Program)',
        description: 'A free healthcare program for Naga City residents providing medical consultation, laboratory tests, and medicines.',
        eligibility: [
            'Resident of Naga City',
            'No existing HMO or health insurance (except PhilHealth)',
        ],
        requirements: ['Valid ID', 'Proof of Residency (Barangay Certificate)'],
        benefits: ['Free medical check-ups', 'Free medicines', 'Free laboratory tests'],
    };
};
exports.getYakapInfo = getYakapInfo;
//# sourceMappingURL=yakapService.js.map