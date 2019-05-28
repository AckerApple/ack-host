/** Runs node testing against a site/app */
export declare const main: (site: any, options: any) => Promise<void | {
    passing: any[];
    failing: any[];
}>;
