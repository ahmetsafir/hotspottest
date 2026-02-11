"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const pms_1 = __importDefault(require("./routes/pms"));
const checkout_automation_1 = require("./jobs/checkout-automation");
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/pms', pms_1.default);
app.use('/panel', express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
app.get('/panel', (_req, res) => res.sendFile(path_1.default.join(__dirname, '..', 'public', 'index.html')));
app.get('/', (_req, res) => {
    res.json({
        name: 'PMS Gateway',
        version: '1.0.0',
        endpoints: ['/api/pms/health', '/api/pms/metrics', '/api/pms/circuit-status', '/api/pms/dashboard', '/api/pms/test-verify', '/api/pms/login', '/api/pms/job-status', '/api/pms/settings', '/api/pms/test-connection'],
    });
});
(0, checkout_automation_1.startCheckoutJob)();
exports.default = app;
//# sourceMappingURL=app.js.map