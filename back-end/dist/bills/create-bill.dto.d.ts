export declare class CreateBillDto {
    companyId?: string;
    projectId: string;
    projectName?: string;
    clientId: string;
    clientName?: string;
    amount: number;
    milestone: string;
    description: string;
    generatedBy: string;
    status: string;
    decisionDate?: string;
    dueDate: string;
    rejectionReason?: string;
}
