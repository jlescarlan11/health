"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const assessmentController_1 = require("../controllers/assessmentController");
const router = (0, express_1.Router)();
router.post('/transfer', assessmentController_1.transferAssessment);
exports.default = router;
//# sourceMappingURL=assessmentRoutes.js.map