"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPublicUser = void 0;
const dateUtils_1 = require("./dateUtils");
const toPublicUser = (user) => {
    const dateOfBirth = (0, dateUtils_1.formatIsoDate)(user.dateOfBirth);
    return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        dateOfBirth,
        sexAtBirth: user.sexAtBirth,
    };
};
exports.toPublicUser = toPublicUser;
//# sourceMappingURL=userMappers.js.map