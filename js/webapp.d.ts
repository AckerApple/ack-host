export declare const reExpress: () => any;
export declare const host: () => any;
export declare const webapp: any;
export declare class tools {
    app: any;
    constructor(app: any);
    RequestRoutePath(route: any, path: any, success: any, fail: any): any;
    ViewRoutePath(route: any, path: any, success: any, fail: any): ViewRoutePath;
}
export declare class ViewRoutePath {
    data: any;
    constructor(a: any);
    getPathObj(): any;
    fail(fail: any): this;
    success(success: any): this;
    processRequest(req: any, res: any, next: any): any;
    applyToApp(app: any): this;
}
