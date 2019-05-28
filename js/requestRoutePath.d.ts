export declare class RequestRoutePath {
    data: any;
    reqres: any;
    constructor(a?: any);
    getRoute(): any;
    setRoute(route: any): this;
    getPath(): any;
    setPath(path: any): this;
    getFail(): any;
    /** on 404, method called(relpath, reqres). If method returns false, indicates 404 has been handled & no auto 404 should be generated */
    fail(method: any): this;
    getSuccess(): any;
    success(method: any): this;
    getPathObj(): any;
    loadAppFile(): any;
    applyToApp(app: any): any;
}
export declare class RequestProcessor {
    req: any;
    res: any;
    next: any;
    RequestRoutePath: any;
    reqres: any;
    app: any;
    requestedFile: any;
    reqpro: any;
    constructor(req: any, res: any, next: any, RequestRoutePath: any);
    process(): any;
    getRequestPath(): any;
    getFileSearch(): any;
    loadRequestedFile(): any;
    processAppRequest(): any;
    runReqpro(reqpro: any): any;
    runFileNotFound(): any;
    getRouteCatcher(): (e: any) => void;
}
