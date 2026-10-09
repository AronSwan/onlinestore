"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSuccessResponse = void 0;
const isSuccessResponse = (r) => r.success === true && r.data !== undefined;
exports.isSuccessResponse = isSuccessResponse;
