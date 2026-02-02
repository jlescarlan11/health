"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const routes_1 = __importDefault(require("./routes"));
const middleware_1 = require("./middleware");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, morgan_1.default)('dev'));
app.use(middleware_1.apiLimiter);
app.use('/api', routes_1.default);
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
app.get('/', (_req, res) => {
    res.send('Health App Backend is running');
});
app.use(middleware_1.errorHandler);
exports.default = app;
//# sourceMappingURL=app.js.map