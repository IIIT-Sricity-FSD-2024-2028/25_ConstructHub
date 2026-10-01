export declare class CompanyDetailsDto {
    name: string;
    code: string;
    domain: string;
    phone?: string;
    plan?: string;
}
export declare class AdminDetailsDto {
    name: string;
    email: string;
    password: string;
    phone?: string;
}
export declare class RegisterCompanyDto {
    company: CompanyDetailsDto;
    admin: AdminDetailsDto;
}
