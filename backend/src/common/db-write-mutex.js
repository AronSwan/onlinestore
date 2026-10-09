"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runExclusiveWrite = runExclusiveWrite;
let writeTail = Promise.resolve();
function runExclusiveWrite(fn) {
    const run = writeTail.then(fn, fn);
    writeTail = run.then(() => undefined, () => undefined);
    return run;
}
