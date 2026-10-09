"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockQueryBuilder = exports.asMocked = exports.createMockHttpService = exports.createMockConfigService = exports.createMockQueryRunner = exports.createMockDataSource = exports.createMockRepository = exports.createMockedFunction = void 0;
var typed_mock_factory_1 = require("./typed-mock-factory");
Object.defineProperty(exports, "createMockedFunction", { enumerable: true, get: function () { return typed_mock_factory_1.createMockedFunction; } });
var test_helpers_1 = require("../test-helpers");
Object.defineProperty(exports, "createMockRepository", { enumerable: true, get: function () { return test_helpers_1.createMockRepository; } });
Object.defineProperty(exports, "createMockDataSource", { enumerable: true, get: function () { return test_helpers_1.createMockDataSource; } });
Object.defineProperty(exports, "createMockQueryRunner", { enumerable: true, get: function () { return test_helpers_1.createMockQueryRunner; } });
Object.defineProperty(exports, "createMockConfigService", { enumerable: true, get: function () { return test_helpers_1.createMockConfigService; } });
const createMockHttpService = () => {
    return {
        post: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
        put: jest.fn(),
        patch: jest.fn(),
    };
};
exports.createMockHttpService = createMockHttpService;
const asMocked = (obj) => obj;
exports.asMocked = asMocked;
const createMockQueryBuilder = () => {
    const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
        getMany: jest.fn(),
        getRawOne: jest.fn(),
        execute: jest.fn(),
    };
    return qb;
};
exports.createMockQueryBuilder = createMockQueryBuilder;
