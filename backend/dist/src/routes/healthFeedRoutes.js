"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const healthFeedController_1 = require("../controllers/healthFeedController");
const router = (0, express_1.Router)();
router.get('/health', healthFeedController_1.healthFeedController.getFeed);
router.post('/health/sync', healthFeedController_1.healthFeedController.triggerSync);
exports.default = router;
//# sourceMappingURL=healthFeedRoutes.js.map