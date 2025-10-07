// Filename: employee.ts

// Interface for displaying employee data (from backend)
export interface Employee {
    employeeid: string;
    employee_name: string;
    firstname: string;
    middlename: string;
    lastname: string;
    gender: string;
    department: string;
    position: string;
    phone: string;
    work_status: string;
    marital_status: string;
    email: string;
    address: string;
    service_tenure: string;
    date_of_birth: string;
    picture: string; // URL string for display
    city: string;
    state: string;
    country: string;
    zip_code: string;
    nationality?: string;
    philhealth: string;
    tin: string;
    sss: string;
    pag_ibig: string;
    gmail_password: string;
    recommendation_letter?: string; // URL string for display
    [key: string]: any;
}

// Interface for form data (for creating/editing employees)
export interface Employees {
    employeeid: string;
    employee_name: string;
    firstname: string;
    middlename: string;
    lastname: string;
    gender: string;
    department: string;
    position: string;
    phone: string;
    work_status: string;
    marital_status: string;
    email: string;
    address: string;
    service_tenure: string;
    date_of_birth: string;
    picture: File | null; // File object for uploads
    city: string;
    state: string;
    country: string;
    zip_code: string;
    nationality?: string;
    philhealth: string;
    tin: string;
    sss: string;
    pag_ibig: string;
    gmail_password: string;
    recommendation_letter: File | null; // File object for uploads
    [key: string]: any;
}

// Initial form data for new employees
export const initialEmployeeFormData: Employees = {
    employeeid: '',
    employee_name: '',
    firstname: '',
    middlename: '',
    lastname: '',
    gender: '',
    department: '',
    position: '',
    phone: '',
    work_status: '',
    marital_status: '',
    service_tenure: '',
    date_of_birth: '',
    email: '',
    address: '',
    city: '',
    state: '',
    picture: null,
    country: '',
    zip_code: '',
    nationality: '',
    philhealth: '',
    tin: '',
    sss: '',
    pag_ibig: '',
    gmail_password: '',
    recommendation_letter: null,
};
