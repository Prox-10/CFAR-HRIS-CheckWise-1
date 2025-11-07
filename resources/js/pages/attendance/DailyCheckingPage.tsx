import { AppSidebar } from '@/components/app-sidebar';
import { Main } from '@/components/customize/main';
import SidebarHoverZone from '@/components/sidebar-hover-zone';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useSidebarHover } from '@/hooks/use-sidebar-hover';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';
import { pdf } from '@react-pdf/renderer';
import axios from 'axios';
import { Printer, Save } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';

interface Employee {
    id: string;
    employeeid: string;
    employee_name: string;
    firstname?: string;
    middlename?: string;
    lastname?: string;
    department: string;
    position: string;
    work_status: string;
    attendances?: { [date: string]: { time_in?: string; time_out?: string } };
}

interface DailyCheckingPageProps {
    employees?: Employee[];
}

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Attendance Management',
        href: '/attendance',
    },
    {
        title: 'Daily Checking PP Crew',
        href: '/attendance/daily-checking',
    },
];

// Position configurations with number of slots
const positions = [
    { name: 'BOX FORMER', slots: 3, field: 'boxFormer' },
    { name: 'PALLETIZER', slots: 2, field: 'palletizer' },
    { name: 'STEVEDOR', slots: 2, field: 'stevedor' },
    { name: 'TOPPER', slots: 3, field: 'topper' },
    { name: 'PALLETIZER TOPPER', slots: 1, field: 'palletizerTopper' },
    { name: 'UTILITY', slots: 1, field: 'utility' },
    { name: 'DEHANDER', slots: 1, field: 'dehander' },
    { name: 'M/BUG SPRAY', slots: 1, field: 'bugSpray' },
    { name: 'SWITCHMAN', slots: 1, field: 'switchman' },
    { name: 'Q.I', slots: 1, field: 'qi' },
    { name: 'STALK FILLER', slots: 1, field: 'stalkFiller' },
    { name: 'C.P.', slots: 1, field: 'cp' },
    { name: 'PACKER', slots: 8, field: 'packer' },
    { name: 'LABELLER', slots: 4, field: 'labeller' },
    { name: 'WEIGHER', slots: 4, field: 'weigher' },
    { name: 'SELECTOR', slots: 6, field: 'selector' },
    { name: 'SUPPORT: ABSENT', slots: 8, field: 'supportAbsent' },
];

// Leave types
const leaveTypes = ['CW', 'ML', 'AWP', 'AWOP', 'SICK LEAVE', 'EMERGENCY LEAVE', 'CUT-OFF'];

// Helper function to format employee name as "Lastname FirstInitial."
const formatEmployeeDisplayName = (employee: Employee): string => {
    if (employee.lastname && employee.firstname) {
        // Get first initial from firstname (handle cases like "RJ Kyle" -> "R")
        const firstInitial = employee.firstname.trim().charAt(0).toUpperCase();
        return `${employee.lastname} ${firstInitial}.`;
    }
    // Fallback to employee_name if name fields are not available
    return employee.employee_name;
};

// Helper function to format time from HH:mm:ss to HH:mm for HTML time input
const formatTimeForInput = (time: string | undefined | null): string => {
    if (!time) return '';
    // If time is in HH:mm:ss format, extract HH:mm
    if (time.includes(':')) {
        const parts = time.split(':');
        return `${parts[0]}:${parts[1]}`;
    }
    return time;
};

export default function DailyCheckingPage({ employees: initialEmployees = [] }: DailyCheckingPageProps) {
    const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [assignmentData, setAssignmentData] = useState<{ [key: string]: string[] }>({});
    // Store time_in and time_out for each position field, slot index, and day index
    const [timeData, setTimeData] = useState<{
        [key: string]: { [slotIndex: number]: { [dayIndex: number]: { time_in: string; time_out: string } } };
    }>({});
    const [leaveData, setLeaveData] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(false);
    const [preparedBy, setPreparedBy] = useState('');
    const [checkedBy, setCheckedBy] = useState('');

    // Initialize assignment data structure
    useEffect(() => {
        const initialData: { [key: string]: string[] } = {};
        const initialTimeData: typeof timeData = {};
        positions.forEach((position) => {
            initialData[position.field] = Array(position.slots).fill('');
            initialTimeData[position.field] = {};
            for (let i = 0; i < position.slots; i++) {
                initialTimeData[position.field][i] = {};
                for (let j = 0; j < 7; j++) {
                    initialTimeData[position.field][i][j] = { time_in: '', time_out: '' };
                }
            }
        });
        setAssignmentData(initialData);
        setTimeData(initialTimeData);

        // Initialize leave data
        const initialLeaveData: { [key: string]: string } = {};
        leaveTypes.forEach((type) => {
            initialLeaveData[type] = '';
        });
        setLeaveData(initialLeaveData);
    }, []);

    // Get days of the week for the table header (starting with Monday)
    const getDaysOfWeek = () => {
        const selectedDate = new Date(date);
        const days = [];
        const dayOfWeek = selectedDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const startOfWeek = new Date(selectedDate);

        // Calculate days to subtract to get to Monday
        // If Sunday (0), go back 6 days; if Monday (1), go back 0 days, etc.
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(selectedDate.getDate() - daysToSubtract);

        // Generate 7 days starting from Monday
        for (let i = 0; i < 7; i++) {
            const day = new Date(startOfWeek);
            day.setDate(startOfWeek.getDate() + i);
            days.push(day);
        }
        return days; // [Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday]
    };

    // Fetch employees when date changes
    useEffect(() => {
        const days = getDaysOfWeek();
        const startDate = days[0].toISOString().split('T')[0];
        const endDate = days[6].toISOString().split('T')[0];
        fetchPackingPlantEmployees(startDate, endDate);
    }, [date]);

    const fetchPackingPlantEmployees = async (startDate?: string, endDate?: string) => {
        setLoading(true);
        try {
            let url = '/api/employees/packing-plant';
            if (startDate && endDate) {
                url += `?start_date=${startDate}&end_date=${endDate}`;
            }
            const response = await axios.get(url);
            setEmployees(response.data);
        } catch (error) {
            console.error('Error fetching employees:', error);
            toast.error('Failed to load employees');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignmentChange = (field: string, slotIndex: number, value: string) => {
        setAssignmentData((prev) => ({
            ...prev,
            [field]: prev[field].map((item, i) => (i === slotIndex ? value : item)),
        }));

        // Auto-populate time_in and time_out when employee is selected
        if (value) {
            const selectedEmployee = employees.find((emp) => emp.employee_name === value);
            if (selectedEmployee && selectedEmployee.attendances) {
                const days = getDaysOfWeek();
                const newTimeData = { ...timeData };

                if (!newTimeData[field]) {
                    newTimeData[field] = {};
                }
                if (!newTimeData[field][slotIndex]) {
                    newTimeData[field][slotIndex] = {};
                }

                days.forEach((day, dayIndex) => {
                    const dateStr = day.toISOString().split('T')[0];
                    const attendance = selectedEmployee.attendances?.[dateStr];
                    if (attendance) {
                        newTimeData[field][slotIndex][dayIndex] = {
                            time_in: formatTimeForInput(attendance.time_in),
                            time_out: formatTimeForInput(attendance.time_out),
                        };
                    } else {
                        newTimeData[field][slotIndex][dayIndex] = {
                            time_in: '',
                            time_out: '',
                        };
                    }
                });

                setTimeData(newTimeData);
            } else {
                // Clear times if employee is deselected or has no attendance data
                const newTimeData = { ...timeData };
                if (newTimeData[field] && newTimeData[field][slotIndex]) {
                    const days = getDaysOfWeek();
                    days.forEach((_, dayIndex) => {
                        newTimeData[field][slotIndex][dayIndex] = {
                            time_in: '',
                            time_out: '',
                        };
                    });
                    setTimeData(newTimeData);
                }
            }
        } else {
            // Clear times if employee is deselected
            const newTimeData = { ...timeData };
            if (newTimeData[field] && newTimeData[field][slotIndex]) {
                const days = getDaysOfWeek();
                days.forEach((_, dayIndex) => {
                    newTimeData[field][slotIndex][dayIndex] = {
                        time_in: '',
                        time_out: '',
                    };
                });
                setTimeData(newTimeData);
            }
        }
    };

    const handleTimeChange = (field: string, slotIndex: number, dayIndex: number, type: 'time_in' | 'time_out', value: string) => {
        setTimeData((prev) => ({
            ...prev,
            [field]: {
                ...prev[field],
                [slotIndex]: {
                    ...prev[field]?.[slotIndex],
                    [dayIndex]: {
                        ...prev[field]?.[slotIndex]?.[dayIndex],
                        [type]: value,
                    },
                },
            },
        }));
    };

    // Get all currently selected employees across all positions
    const getSelectedEmployees = () => {
        const selected: string[] = [];
        Object.values(assignmentData).forEach((slots) => {
            slots.forEach((employee) => {
                if (employee && !selected.includes(employee)) {
                    selected.push(employee);
                }
            });
        });
        return selected;
    };

    const handleLeaveChange = (type: string, value: string) => {
        setLeaveData((prev) => ({
            ...prev,
            [type]: value,
        }));
    };

    const handleSave = () => {
        console.log('Saving data:', { date, assignmentData, leaveData, preparedBy, checkedBy });
        toast.success('Daily checking saved successfully!');
    };

    const handlePrint = async () => {
        try {
            console.log('Generating PDF for printing...', { date, workers: assignmentData });

            // Show loading toast
            toast.loading('Generating PDF for printing...', { id: 'pdf-print' });

            // Import the PDF component dynamically
            const PackingPlantPDF = (await import('./components/packing-plant-pdf')).default;
            const PackingPlantDocument = PackingPlantPDF({ weekStart: new Date(date), workers: assignmentData });

            // Generate PDF blob
            const instance = pdf(PackingPlantDocument());
            const blob = await instance.toBlob();

            // Dismiss loading toast
            toast.dismiss('pdf-print');

            // Create a blob URL
            const pdfUrl = URL.createObjectURL(blob);

            // Open in new window and trigger print dialog
            const printWindow = window.open(pdfUrl, '_blank');

            if (printWindow) {
                printWindow.addEventListener('load', () => {
                    setTimeout(() => {
                        printWindow.print();
                    }, 250);
                });

                // Clean up the URL after a delay
                setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);
            }

            toast.success('PDF opened for printing');
        } catch (error) {
            console.error('Error generating PDF for printing:', error);
            toast.dismiss('pdf-print');
            toast.error('Failed to generate PDF for printing. Please try again.');
        }
    };

    // Function to view the PDF in a new window
    const viewPPPdf = async () => {
        try {
            console.log('Generating PDF for new window...', { date, workers: assignmentData });

            // Show loading toast
            toast.loading('Generating PDF...', { id: 'pdf-generation' });

            // Import the PDF component dynamically
            const PackingPlantPDF = (await import('./components/packing-plant-pdf')).default;
            const PackingPlantDocument = PackingPlantPDF({ weekStart: new Date(date), workers: assignmentData });

            // Generate PDF blob
            const instance = pdf(PackingPlantDocument());
            const blob = await instance.toBlob();

            // Dismiss loading toast
            toast.dismiss('pdf-generation');

            // Create a blob URL
            const pdfUrl = URL.createObjectURL(blob);

            // Try to open in new window
            const newWindow = window.open('', '_blank');

            if (newWindow) {
                // Write the blob URL as iframe src to handle PDF viewing
                newWindow.document.write(`
                    <html>
                        <head>
                            <title>Packing Plant Daily Checking - ${date}</title>
                            <style>
                                body { margin: 0; padding: 0; }
                                iframe { width: 100%; height: 100vh; border: none; }
                            </style>
                        </head>
                        <body>
                            <iframe src="${pdfUrl}" type="application/pdf"></iframe>
                        </body>
                    </html>
                `);
                newWindow.document.close();
            }

            // Clean up the URL after longer delay to ensure PDF loads
            setTimeout(() => URL.revokeObjectURL(pdfUrl), 5000);

            toast.success('PDF opened in new window');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.dismiss('pdf-generation');
            toast.error('Failed to generate PDF. Please try again.');
        }
    };

    const daysOfWeek = getDaysOfWeek();

    return (
        <SidebarProvider>
            <Head title="Daily Checking of PP Crew" />
            <SidebarHoverLogic>
                <SidebarInset>
                    <SiteHeader breadcrumbs={breadcrumbs} title={''} />
                    <Main fixed>
                        <div className="print:p-8">
                            {/* Header */}
                            <div className="mb-6 flex items-center justify-between border-b-2 border-gray-800 pb-4 print:mb-4">
                                <div className="flex items-center gap-4">
                                    <img src="/Logo.png" alt="Company Logo" className="h-20 w-20 object-contain" />
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-800">CFARESSMPCO</h1>
                                        <p className="text-sm text-gray-600">PP-2701</p>
                                        <p className="text-lg font-semibold text-gray-700">DAILY CHECKING OF PP CREW</p>
                                    </div>
                                </div>
                            </div>

                            {/* Date Selection */}
                            <div className="mb-4 print:hidden">
                                <label className="mb-2 block text-sm font-semibold text-gray-700">Select Week Date:</label>
                                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-64 border-gray-300" />
                            </div>

                            {/* Main Table */}
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse border-2 border-black text-sm">
                                    {/* Table Header */}
                                    <thead>
                                        <tr className="bg-gray-100">
                                            <th className="border-2 border-black p-2 text-left font-bold" rowSpan={2}>
                                                DAILY WEEK SCHEDULE
                                            </th>
                                            <th className="w-8 border-2 border-black p-1 text-center font-bold" rowSpan={2}></th>
                                            <th className="border-2 border-black p-2 text-left font-bold" rowSpan={2}>
                                                NAME OF WORKERS
                                            </th>
                                            {daysOfWeek.map((day, index) => (
                                                <th key={index} className="border-2 border-black p-1 text-center" colSpan={2}>
                                                    <div className="text-xs font-bold">
                                                        {day.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}
                                                    </div>
                                                    <div className="text-xs">
                                                        {day.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                        <tr className="bg-gray-100">
                                            {daysOfWeek.map((_, index) => (
                                                <React.Fragment key={index}>
                                                    <th className="border-2 border-black p-1 text-xs">IN</th>
                                                    <th className="border-2 border-black p-1 text-xs">OUT</th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>

                                    {/* Table Body */}
                                    <tbody>
                                        {positions.map((position) => (
                                            <React.Fragment key={position.field}>
                                                {/* Position rows with slot numbers */}
                                                {Array.from({ length: position.slots }).map((_, slotIndex) => (
                                                    <tr key={slotIndex}>
                                                        {/* Position name (only for first row) */}
                                                        {slotIndex === 0 && (
                                                            <td className="border-2 border-black bg-gray-50 p-2 font-bold" rowSpan={position.slots}>
                                                                {position.name}
                                                            </td>
                                                        )}
                                                        {/* Slot number */}
                                                        <td className="w-8 border-2 border-black p-1 text-center text-xs font-semibold">
                                                            {slotIndex + 1}
                                                        </td>
                                                        {/* Employee name dropdown */}
                                                        <td className="border-2 border-black p-1">
                                                            <Select
                                                                value={assignmentData[position.field]?.[slotIndex] || ''}
                                                                onValueChange={(value) => handleAssignmentChange(position.field, slotIndex, value)}
                                                            >
                                                                <SelectTrigger className="h-8 border-0 text-xs">
                                                                    <SelectValue placeholder="Select..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {employees.map((emp) => {
                                                                        const selectedEmployees = getSelectedEmployees();
                                                                        const isSelected = selectedEmployees.includes(emp.employee_name);
                                                                        const isCurrentSelection =
                                                                            assignmentData[position.field]?.[slotIndex] === emp.employee_name;

                                                                        return (
                                                                            <SelectItem
                                                                                key={emp.id}
                                                                                value={emp.employee_name}
                                                                                className="text-xs"
                                                                                disabled={isSelected && !isCurrentSelection}
                                                                            >
                                                                                {formatEmployeeDisplayName(emp)}
                                                                            </SelectItem>
                                                                        );
                                                                    })}
                                                                </SelectContent>
                                                            </Select>
                                                        </td>
                                                        {/* Days of week IN/OUT columns */}
                                                        {daysOfWeek.map((_, dayIndex) => (
                                                            <React.Fragment key={dayIndex}>
                                                                <td className="border-2 border-black p-0">
                                                                    <Input
                                                                        type="time"
                                                                        className="h-8 rounded-none border-0 text-center text-xs"
                                                                        value={timeData[position.field]?.[slotIndex]?.[dayIndex]?.time_in || ''}
                                                                        onChange={(e) =>
                                                                            handleTimeChange(
                                                                                position.field,
                                                                                slotIndex,
                                                                                dayIndex,
                                                                                'time_in',
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                    />
                                                                </td>
                                                                <td className="border-2 border-black p-0">
                                                                    <Input
                                                                        type="time"
                                                                        className="h-8 rounded-none border-0 text-center text-xs"
                                                                        value={timeData[position.field]?.[slotIndex]?.[dayIndex]?.time_out || ''}
                                                                        onChange={(e) =>
                                                                            handleTimeChange(
                                                                                position.field,
                                                                                slotIndex,
                                                                                dayIndex,
                                                                                'time_out',
                                                                                e.target.value,
                                                                            )
                                                                        }
                                                                    />
                                                                </td>
                                                            </React.Fragment>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}

                                        {/* Leave Types Section */}
                                        {leaveTypes.map((leaveType) => (
                                            <tr key={leaveType}>
                                                <td className="border-2 border-black bg-gray-50 p-2 font-bold" colSpan={3}>
                                                    {leaveType}
                                                </td>
                                                {daysOfWeek.map((_, dayIndex) => (
                                                    <React.Fragment key={dayIndex}>
                                                        <td className="border-2 border-black p-0" colSpan={2}>
                                                            <Input
                                                                className="h-8 rounded-none border-0 text-center text-xs"
                                                                value={leaveData[`${leaveType}_${dayIndex}`] || ''}
                                                                onChange={(e) => handleLeaveChange(`${leaveType}_${dayIndex}`, e.target.value)}
                                                            />
                                                        </td>
                                                    </React.Fragment>
                                                ))}
                                            </tr>
                                        ))}

                                        {/* Total Row */}
                                        <tr className="bg-gray-100 font-bold">
                                            <td className="border-2 border-black p-2" colSpan={3}>
                                                TOTAL
                                            </td>
                                            {daysOfWeek.map((_, dayIndex) => (
                                                <td key={dayIndex} className="border-2 border-black p-2 text-center" colSpan={2}>
                                                    <Input className="h-8 rounded-none border-0 text-center font-bold" />
                                                </td>
                                            ))}
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Footer - Prepared by and Checked by */}
                            <div className="mt-8 flex justify-between">
                                <div className="w-1/2">
                                    <p className="mb-2 font-semibold">Prepared by:</p>
                                    <Input
                                        value={preparedBy}
                                        onChange={(e) => setPreparedBy(e.target.value)}
                                        className="w-64 border-t-0 border-r-0 border-b-2 border-l-0 border-gray-400 print:border-b-2"
                                        placeholder="Name"
                                    />
                                </div>
                                <div className="w-1/2 text-right">
                                    <p className="mb-2 font-semibold">Checked by:</p>
                                    <Input
                                        value={checkedBy}
                                        onChange={(e) => setCheckedBy(e.target.value)}
                                        className="ml-auto w-64 border-t-0 border-r-0 border-b-2 border-l-0 border-gray-400 print:border-b-2"
                                        placeholder="Name"
                                    />
                                </div>
                            </div>
                            <div className="mt-4 flex justify-end gap-2 print:hidden">
                                {/* <Button variant="outline" onClick={viewPPPdf} className="border-blue-300 text-blue-600 hover:bg-blue-50">
                                        <Eye className="mr-2 h-4 w-4" />
                                        View
                                    </Button> */}
                                <Button variant="outline" onClick={handlePrint} className="border-blue-300 text-blue-600 hover:bg-blue-50">
                                    <Printer className="mr-2 h-4 w-4" />
                                    Print
                                </Button>
                                <Button onClick={handleSave} className="bg-green-600 text-white hover:bg-green-700">
                                    <Save className="mr-2 h-4 w-4" />
                                    Save
                                </Button>
                            </div>
                        </div>
                    </Main>
                </SidebarInset>
            </SidebarHoverLogic>
        </SidebarProvider>
    );
}

function SidebarHoverLogic({ children }: { children: React.ReactNode }) {
    const { state } = useSidebar();
    const { handleMouseEnter, handleMouseLeave } = useSidebarHover();
    return (
        <>
            <SidebarHoverZone show={state === 'collapsed'} onMouseEnter={handleMouseEnter} />
            <AppSidebar onMouseLeave={handleMouseLeave} />
            {children}
        </>
    );
}
