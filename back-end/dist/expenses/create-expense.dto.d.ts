export declare class CreateExpenseDto {
    companyId?: string;
    projectId: string;
    projectName?: string;
    category: string;
    amount: number;
    description: string;
    date: string;
    recordedBy: string;
    receipt?: string;
}
