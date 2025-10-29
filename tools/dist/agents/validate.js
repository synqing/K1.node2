"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function ensureDir(p) { fs_1.default.mkdirSync(p, { recursive: true }); }
function writeJson(p, obj) { fs_1.default.writeFileSync(p, JSON.stringify(obj, null, 2)); }
function readText(p) { try {
    return fs_1.default.readFileSync(p, 'utf8');
}
catch {
    return '';
} }
const args = process.argv.slice(2);
const modelIdx = args.indexOf('--model');
const cppIdx = args.indexOf('--cpp');
const outIdx = args.indexOf('--out');
if (modelIdx < 0 || cppIdx < 0 || outIdx < 0) {
    console.error('Usage: qa:validate --model <model.json> --cpp <generated.cpp> --out <dir>');
    process.exit(2);
}
const modelPath = path_1.default.resolve(args[modelIdx + 1]);
const cppPath = path_1.default.resolve(args[cppIdx + 1]);
const outDir = path_1.default.resolve(args[outIdx + 1]);
ensureDir(outDir);
// Extremely simple rules for now: presence checks and placeholder violations
const modelTxt = readText(modelPath);
const cppTxt = readText(cppPath);
const violations = [];
if (!modelTxt.trim())
    violations.push({ rule: 'ModelLoad', severity: 'error', detail: 'model.json unreadable' });
if (!cppTxt.trim())
    violations.push({ rule: 'CppLoad', severity: 'error', detail: 'generated.cpp unreadable' });
writeJson(path_1.default.join(outDir, 'graph.validation.json'), {
    violations,
    counts: {
        errors: violations.filter(v => v.severity === 'error').length,
        warnings: violations.filter(v => v.severity === 'warn').length
    }
});
console.log('[qa:validate] graph.validation.json emitted');
