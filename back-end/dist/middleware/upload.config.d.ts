declare const UPLOADS_DIR: string;
export declare const multerConfig: {
    storage: any;
    fileFilter: (_req: any, file: any, cb: (error: Error | null, acceptFile: boolean) => void) => void;
    limits: {
        fileSize: number;
        files: number;
    };
};
export declare const UPLOADS_SERVE_PATH = "/uploads";
export { UPLOADS_DIR };
