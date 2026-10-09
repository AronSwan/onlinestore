export declare enum Role {
    ADMIN = "admin",
    USER = "user",
    MODERATOR = "moderator",
    GUEST = "guest"
}
export declare const RolePermissions: {
    admin: string[];
    moderator: string[];
    user: string[];
    guest: string[];
};
export declare const RoleHierarchy: {
    admin: number;
    moderator: number;
    user: number;
    guest: number;
};
