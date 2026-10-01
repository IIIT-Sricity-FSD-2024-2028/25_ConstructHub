declare class MaterialDto {
    name: string;
    qty: number;
    unit: string;
}
export declare class CreateReportDto {
    companyId?: string;
    title: string;
    projectId: string;
    projectName?: string;
    submittedBy: string;
    submittedName?: string;
    date: string;
    progress: number;
    status: string;
    workDone: string;
    issues?: string;
    priority: string;
    materials: MaterialDto[];
    photos: number;
    photoUrls?: string[];
    photoDescription?: string;
    remarks?: string;
}
export {};
