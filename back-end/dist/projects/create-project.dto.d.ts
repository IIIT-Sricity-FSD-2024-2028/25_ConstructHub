export declare class CreateProjectDto {
    companyId?: string;
    name: string;
    location: string;
    clientId: string;
    clientName?: string;
    managerId: string;
    budget: number;
    spent: number;
    progress: number;
    status: string;
    startDate: string;
    endDate: string;
    teamSize: number;
    allocations: Record<string, number>;
    description: string;
}
