"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockedFunction = createMockedFunction;
function createMockedFunction(impl) {
    return jest.fn(impl);
}
