"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const envPath = path_1.default.resolve(__dirname, '../.env');
const parentEnvPath = path_1.default.resolve(__dirname, '../../.env');
dotenv_1.default.config({ path: envPath });
if (!process.env.DATABASE_URL) {
    dotenv_1.default.config({ path: parentEnvPath });
}
const app_1 = __importDefault(require("./app"));
const node_cron_1 = __importDefault(require("node-cron"));
const healthFeedService_1 = require("./services/healthFeedService");
const PORT = process.env.PORT || 3000;
const server = app_1.default.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    healthFeedService_1.healthFeedService.syncHealthNews().catch(err => console.error('Initial feed sync failed:', err));
    node_cron_1.default.schedule('0 0 * * *', () => {
        console.log('Running scheduled health news sync...');
        healthFeedService_1.healthFeedService.syncHealthNews();
    });
});
server.on('error', (error) => {
    console.error('Server error:', error);
});
//# sourceMappingURL=server.js.map