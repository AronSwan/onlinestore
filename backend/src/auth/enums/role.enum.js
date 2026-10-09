"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoleHierarchy = exports.RolePermissions = exports.Role = void 0;
var Role;
(function (Role) {
    Role["ADMIN"] = "admin";
    Role["USER"] = "user";
    Role["MODERATOR"] = "moderator";
    Role["GUEST"] = "guest";
})(Role || (exports.Role = Role = {}));
exports.RolePermissions = {
    [Role.ADMIN]: ['*'],
    [Role.MODERATOR]: ['read', 'write', 'moderate'],
    [Role.USER]: ['read', 'write'],
    [Role.GUEST]: ['read'],
};
exports.RoleHierarchy = {
    [Role.ADMIN]: 4,
    [Role.MODERATOR]: 3,
    [Role.USER]: 2,
    [Role.GUEST]: 1,
};
