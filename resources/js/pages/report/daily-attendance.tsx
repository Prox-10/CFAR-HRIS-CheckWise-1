import { AppSidebar } from '@/components/app-sidebar';
import SidebarHoverZone from '@/components/sidebar-hover-zone';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSidebarHover } from '@/hooks/use-sidebar-hover';
import { Head, router } from '@inertiajs/react';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import axios from 'axios';
import { format } from 'date-fns';
import { ArrowLeft, ClipboardList, Eye, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast, Toaster } from 'sonner';
import DailyAttendancePDF from './components/daily-attendance-pdf';

// Mock data for preview
const mockRows = Array.from({ length: 20 }).map((_, i) => ({
    no: i + 1,
    employeeId: `E-${String(1000 + i)}`,
    name: `Employee ${i + 1}`,
    department: i % 2 === 0 ? 'Packing' : 'Field',
    shift: i % 3 === 0 ? 'Day' : 'Night',
    inAM: '07:59',
    outAM: '12:02',
    inPM: '13:00',
    outPM: '17:01',
    otIn: '-',
    otOut: '-',
    lateMin: i % 4 === 0 ? 5 : 0,
    undertimeMin: 0,
    status: 'Present',
}));

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

interface MicroteamEmployee {
    id: string;
    employee_name: string;
    employeeid: string;
    work_status: string;
    position: string;
    time_in: string | null;
    time_out: string | null;
}

interface MicroteamData {
    'MICROTEAM - 01': MicroteamEmployee[];
    'MICROTEAM - 02': MicroteamEmployee[];
    'MICROTEAM - 03': MicroteamEmployee[];
}

interface AddCrewData {
    'ADD CREW - 01': MicroteamEmployee[];
    'ADD CREW - 02': MicroteamEmployee[];
    'ADD CREW - 03': MicroteamEmployee[];
}

export default function DailyAttendancePage() {
    const [reportDate, setReportDate] = useState<Date | undefined>(new Date());
    const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx'>('pdf');
    const [area, setArea] = useState<string>('all');
    const [microteams, setMicroteams] = useState<MicroteamData>({
        'MICROTEAM - 01': [],
        'MICROTEAM - 02': [],
        'MICROTEAM - 03': [],
    });
    const [addCrew, setAddCrew] = useState<AddCrewData>({
        'ADD CREW - 01': [],
        'ADD CREW - 02': [],
        'ADD CREW - 03': [],
    });
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [phValue, setPhValue] = useState<string>('');
    const [showPreview, setShowPreview] = useState(false);
    const [microteamSort, setMicroteamSort] = useState<'none' | 'asc' | 'desc'>('none');
    const [addCrewSort, setAddCrewSort] = useState<'none' | 'asc' | 'desc'>('none');
    const reportCardRef = useRef<HTMLDivElement>(null);
    const phInputRef = useRef<HTMLInputElement>(null);

    const titleDate = useMemo(() => (reportDate ? format(reportDate, 'MMMM dd, yyyy') : ''), [reportDate]);
    const titleDay = useMemo(() => (reportDate ? format(reportDate, 'EEEE') : ''), [reportDate]);

    // Fetch microteam data when reportDate changes
    useEffect(() => {
        if (reportDate) {
            fetchMicroteamData();
        }
    }, [reportDate]);

    const fetchMicroteamData = async () => {
        if (!reportDate) return;

        setLoading(true);
        try {
            const dateStr = format(reportDate, 'yyyy-MM-dd');
            const response = await axios.get('/api/daily-checking/for-date', {
                params: { date: dateStr },
            });

            if (response.data.microteams) {
                setMicroteams(response.data.microteams);
            }

            // Handle Add Crew employees grouped by microteam
            // Microteam 1 → ADD CREW - 01, Microteam 2 → ADD CREW - 02, Microteam 3 → ADD CREW - 03
            const addCrewData: AddCrewData = {
                'ADD CREW - 01': [],
                'ADD CREW - 02': [],
                'ADD CREW - 03': [],
            };

            if (response.data.add_crew) {
                // Check if it's the new format (grouped by microteam) or old format (array)
                if (
                    response.data.add_crew['MICROTEAM - 01'] ||
                    response.data.add_crew['MICROTEAM - 02'] ||
                    response.data.add_crew['MICROTEAM - 03']
                ) {
                    // New format: grouped by microteam
                    addCrewData['ADD CREW - 01'] = response.data.add_crew['MICROTEAM - 01'] || [];
                    addCrewData['ADD CREW - 02'] = response.data.add_crew['MICROTEAM - 02'] || [];
                    addCrewData['ADD CREW - 03'] = response.data.add_crew['MICROTEAM - 03'] || [];
                } else if (Array.isArray(response.data.add_crew)) {
                    // Old format: array (fallback for backward compatibility)
                    response.data.add_crew.forEach((employee: MicroteamEmployee, index: number) => {
                        const crewIndex = index % 3;
                        const crewKey = `ADD CREW - ${String(crewIndex + 1).padStart(2, '0')}` as keyof AddCrewData;
                        addCrewData[crewKey].push(employee);
                    });
                }
            }

            setAddCrew(addCrewData);
        } catch (error) {
            console.error('Error fetching microteam data:', error);
            toast.error('Failed to load microteam data');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (!reportDate) {
            toast.error('Please select a date');
            return;
        }

        if (exportFormat === 'pdf') {
            setExporting(true);
            try {
                // Get PH value from input
                const ph = phInputRef.current?.value || phValue || '';

                // Generate PDF using @react-pdf/renderer
                const dateStr = reportDate ? format(reportDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
                const filename = `Daily_Attendance_Report_${dateStr}.pdf`;

                // Apply sorting to microteams and addCrew for PDF export
                const sortedMicroteams: MicroteamData = {
                    'MICROTEAM - 01': sortEmployees(microteams['MICROTEAM - 01'] || [], microteamSort),
                    'MICROTEAM - 02': sortEmployees(microteams['MICROTEAM - 02'] || [], microteamSort),
                    'MICROTEAM - 03': sortEmployees(microteams['MICROTEAM - 03'] || [], microteamSort),
                };
                const sortedAddCrew: AddCrewData = {
                    'ADD CREW - 01': sortEmployees(addCrew['ADD CREW - 01'] || [], addCrewSort),
                    'ADD CREW - 02': sortEmployees(addCrew['ADD CREW - 02'] || [], addCrewSort),
                    'ADD CREW - 03': sortEmployees(addCrew['ADD CREW - 03'] || [], addCrewSort),
                };

                const pdfDocument = <DailyAttendancePDF reportDate={reportDate} microteams={sortedMicroteams} addCrew={sortedAddCrew} ph={ph} />;
                const instance = pdf(pdfDocument);
                const blob = await instance.toBlob();

                // Create download link
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                toast.success('PDF exported successfully');
            } catch (error) {
                console.error('Error exporting PDF:', error);
                toast.error('Failed to export PDF');
            } finally {
                setExporting(false);
            }
        } else {
            // Handle Excel export later
            toast.info('Excel export coming soon');
        }
    };

    // Helper function to format time
    const formatTime = (timeStr: string | null): string => {
        if (!timeStr) return '';
        // If time is in HH:mm:ss format, extract HH:mm
        if (timeStr.includes(':')) {
            const parts = timeStr.split(':');
            return `${parts[0]}:${parts[1]}`;
        }
        return timeStr;
    };

    // Helper function to format employee name: "Lastname FirstInitial."
    // Example: "RJ Kyle G. Labrador" -> "Labrador R."
    const formatEmployeeName = (fullName: string): string => {
        if (!fullName || !fullName.trim()) return '';

        const nameParts = fullName.trim().split(/\s+/);
        if (nameParts.length === 0) return '';

        // Last part is the last name
        const lastName = nameParts[nameParts.length - 1];

        // First part is the first name, get its first character
        const firstName = nameParts[0];
        const firstInitial = firstName.charAt(0).toUpperCase();

        return `${lastName} ${firstInitial}.`;
    };

    // Helper function to sort employees by name
    const sortEmployees = (employees: MicroteamEmployee[], sortOrder: 'none' | 'asc' | 'desc'): MicroteamEmployee[] => {
        if (sortOrder === 'none') return employees;

        const sorted = [...employees].sort((a, b) => {
            const nameA = (a.employee_name || '').toLowerCase();
            const nameB = (b.employee_name || '').toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });

        return sortOrder === 'asc' ? sorted : sorted.reverse();
    };

    // Get sorted microteam employees
    const getSortedMicroteamEmployees = (microteamKey: keyof MicroteamData): MicroteamEmployee[] => {
        const employees = microteams[microteamKey] || [];
        return sortEmployees(employees, microteamSort);
    };

    // Get sorted Add Crew employees
    const getSortedAddCrewEmployees = (addCrewKey: keyof AddCrewData): MicroteamEmployee[] => {
        const employees = addCrew[addCrewKey] || [];
        return sortEmployees(employees, addCrewSort);
    };

    return (
        <SidebarProvider>
            <Head title="Daily Attendance Report" />
            <Toaster position="top-right" richColors />
            <SidebarHoverLogic>
                <SidebarInset>
                    <SiteHeader
                        breadcrumbs={[
                            { title: 'Report', href: '/report' },
                            { title: 'Daily Attendance', href: '/report/daily-attendance' },
                        ]}
                        title={''}
                    />
                    <Card className="border-main m-5 space-y-4">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center">
                                <ClipboardList className="text-cfarbempco-green mr-2 h-5 w-5" />
                                Daily Attendance Report (DTR)
                            </CardTitle>
                            <CardDescription>Generate and export the daily attendance record.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                                <div className="md:col-span-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className={cn('w-full justify-start text-left font-normal', !reportDate && 'text-muted-foreground')}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                {reportDate ? titleDate : <span>Select date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <CalendarComponent mode="single" selected={reportDate} onSelect={setReportDate} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div>
                                    <Select value={area} onValueChange={setArea}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Departments</SelectItem>
                                            {departments.map((dep) => (
                                                <SelectItem key={dep} value={dep}>
                                                    {dep}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Select value={exportFormat} onValueChange={(v: 'pdf' | 'xlsx') => setExportFormat(v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Export" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pdf">PDF</SelectItem>
                                            <SelectItem value="xlsx">Excel</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div> */}

                            {/* Report body matching provided structure */}
                            <Card>
                                <CardContent className="p-4">
                                    <div ref={reportCardRef}>
                                        <div className="flex flex-col gap-2">
                                            <div className="flex w-full flex-row items-center justify-between">
                                                <div className="flex flex-col items-start">
                                                    <div className="text-sm font-semibold">CFARBEMPCO</div>
                                                    <div className="mt-1 flex items-center">
                                                        <span className="mr-2 text-sm font-semibold">PH:</span>
                                                        <Input
                                                            ref={phInputRef}
                                                            type="text"
                                                            placeholder="PH"
                                                            className="w-20"
                                                            value={phValue}
                                                            onChange={(e) => setPhValue(e.target.value)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex flex-1 justify-center">
                                                    <div className="text-center text-base font-bold">Daily Attendance Report (DTR)</div>
                                                </div>
                                                <div className="flex min-w-[110px] flex-col items-end">
                                                    <div className="text-sm">
                                                        <span className="font-bold">Date:</span> {titleDate}
                                                    </div>
                                                    <div className="mr-[66px] text-sm">
                                                        <span className="font-bold">Day:</span> {titleDay}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Microteam tables */}
                                        <div className="mt-4">
                                            {/* Sorting controls for Microteams */}
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="text-xs font-semibold">Sort Microteams:</span>
                                                <Select
                                                    value={microteamSort}
                                                    onValueChange={(value: 'none' | 'asc' | 'desc') => setMicroteamSort(value)}
                                                >
                                                    <SelectTrigger className="h-8 w-40 text-xs">
                                                        <SelectValue placeholder="Sort by..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">No Sort</SelectItem>
                                                        <SelectItem value="asc">A-Z (Ascending)</SelectItem>
                                                        <SelectItem value="desc">Z-A (Descending)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                {(['MICROTEAM - 01', 'MICROTEAM - 02', 'MICROTEAM - 03'] as const).map((title) => {
                                                    const sortedEmployees = getSortedMicroteamEmployees(title);
                                                    const maxRows = 25;
                                                    const rowsToShow = Math.max(maxRows, sortedEmployees.length);

                                                    return (
                                                        <div key={title} className="border">
                                                            <div className="border-b px-2 py-1 text-[10px] font-semibold">{title}</div>
                                                            <div className="overflow-hidden">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead className="w-10 text-[10px]">No</TableHead>
                                                                            <TableHead className="text-[10px]">Name</TableHead>
                                                                            <TableHead className="w-24 text-[10px]">Remarks</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {Array.from({ length: rowsToShow }).map((_, i) => {
                                                                            const employee = sortedEmployees[i];
                                                                            return (
                                                                                <TableRow key={i}>
                                                                                    <TableCell className="text-[10px]">
                                                                                        {String(i + 1).padStart(2, '0')}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-[10px]">
                                                                                        {employee ? formatEmployeeName(employee.employee_name) : ''}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-[10px]">
                                                                                        {employee?.time_in && employee?.time_out ? 'Present' : ''}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Add Crew tables */}
                                        <div className="mt-4">
                                            {/* Sorting controls for Add Crew */}
                                            <div className="mb-2 flex items-center gap-2">
                                                <span className="text-xs font-semibold">Sort Add Crew:</span>
                                                <Select value={addCrewSort} onValueChange={(value: 'none' | 'asc' | 'desc') => setAddCrewSort(value)}>
                                                    <SelectTrigger className="h-8 w-40 text-xs">
                                                        <SelectValue placeholder="Sort by..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="none">No Sort</SelectItem>
                                                        <SelectItem value="asc">A-Z (Ascending)</SelectItem>
                                                        <SelectItem value="desc">Z-A (Descending)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                {(['ADD CREW - 01', 'ADD CREW - 02', 'ADD CREW - 03'] as const).map((title) => {
                                                    const sortedEmployees = getSortedAddCrewEmployees(title);
                                                    const maxRows = 8;
                                                    const rowsToShow = Math.max(maxRows, sortedEmployees.length);

                                                    return (
                                                        <div key={title} className="border">
                                                            <div className="border-b px-2 py-1 text-[10px] font-semibold">{title}</div>
                                                            <div className="overflow-hidden">
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow>
                                                                            <TableHead className="w-10 text-[10px]">No</TableHead>
                                                                            <TableHead className="text-[10px]">Name</TableHead>
                                                                            <TableHead className="w-24 text-[10px]">Remarks</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {Array.from({ length: rowsToShow }).map((_, i) => {
                                                                            const employee = sortedEmployees[i];
                                                                            return (
                                                                                <TableRow key={i}>
                                                                                    <TableCell className="text-[10px]">
                                                                                        {String(i + 1).padStart(2, '0')}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-[10px]">
                                                                                        {employee ? formatEmployeeName(employee.employee_name) : ''}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-[10px]">
                                                                                        {employee?.time_in && employee?.time_out ? 'Present' : ''}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            );
                                                                        })}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Summary table */}
                                        <div className="mt-4 border">
                                            <div className="border-b px-2 py-1 text-[10px] font-semibold">Summary</div>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="text-[10px]"></TableHead>
                                                        <TableHead className="w-16 text-center text-[10px]">M1</TableHead>
                                                        <TableHead className="w-16 text-center text-[10px]">M2</TableHead>
                                                        <TableHead className="w-16 text-center text-[10px]">M3</TableHead>
                                                        <TableHead className="w-20 text-center text-[10px]">TOTAL</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {[
                                                        'PRESENT REGULAR',
                                                        'ADD CREW',
                                                        'TOTAL',
                                                        'WWP',
                                                        'AWOP/AWOL',
                                                        'HLF/SL/PL',
                                                        'OUTSIDE/ONWSAW',
                                                        'OVERALL TOTAL',
                                                    ].map((row) => (
                                                        <TableRow key={row}>
                                                            <TableCell className="text-[10px]">{row}</TableCell>
                                                            <TableCell className="text-center text-[10px]"></TableCell>
                                                            <TableCell className="text-center text-[10px]"></TableCell>
                                                            <TableCell className="text-center text-[10px]"></TableCell>
                                                            <TableCell className="text-center text-[10px]"></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {/* Signatories */}
                                        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-3">
                                            <div className="text-center text-[10px]">
                                                <div className="mb-6">Prepared by:</div>
                                                <div className="mx-auto mb-1 h-px w-40 bg-black" />
                                                <div>PW&C</div>
                                            </div>
                                            <div className="text-center text-[10px]">
                                                <div className="mb-6">Noted by:</div>
                                                <div className="mx-auto mb-1 h-px w-40 bg-black" />
                                                <div>Manager</div>
                                            </div>
                                            <div className="text-center text-[10px]">
                                                <div className="mb-6">Approved by:</div>
                                                <div className="mx-auto mb-1 h-px w-40 bg-black" />
                                                <div>____________________</div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center justify-start gap-2">
                                    <Button variant="outline" onClick={() => router.visit('/report')}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back
                                    </Button>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="outline">
                                        <Save className="mr-2 h-4 w-4" />
                                        Save
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            if (!reportDate) {
                                                toast.error('Please select a date');
                                                return;
                                            }
                                            setShowPreview(true);
                                        }}
                                        disabled={!reportDate}
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View
                                    </Button>
                                    <Button variant="main" onClick={handleExport} disabled={exporting}>
                                        {exporting ? 'Exporting...' : `Export ${exportFormat.toUpperCase()}`}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </SidebarInset>
            </SidebarHoverLogic>

            {/* PDF Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="h-[90vh] w-full min-w-[70vw] p-0">
                    <DialogHeader className="px-6 pt-6 pb-4">
                        <DialogTitle>Daily Attendance Report Preview</DialogTitle>
                    </DialogHeader>
                    <div className="h-[calc(90vh-80px)] w-full overflow-auto bg-gray-100">
                        <style>
                            {`
                                .react-pdf__Page {
                                    margin: 0 !important;
                                    padding: 0 !important;
                                    max-width: 100% !important;
                                }
                                .react-pdf__Page__canvas {
                                    margin: 0 !important;
                                    display: block !important;
                                    max-width: 100% !important;
                                    width: 100% !important;
                                    height: auto !important;
                                }
                                .react-pdf__Document {
                                    display: flex !important;
                                    flex-direction: column !important;
                                    align-items: stretch !important;
                                    width: 100% !important;
                                }
                                .react-pdf__Page__textContent {
                                    width: 100% !important;
                                }
                            `}
                        </style>
                        {reportDate && (
                            <PDFViewer
                                width="100%"
                                height="100%"
                                style={{
                                    borderRadius: '0',
                                    border: 'none',
                                }}
                                showToolbar={true}
                            >
                                <DailyAttendancePDF
                                    reportDate={reportDate}
                                    microteams={{
                                        'MICROTEAM - 01': getSortedMicroteamEmployees('MICROTEAM - 01'),
                                        'MICROTEAM - 02': getSortedMicroteamEmployees('MICROTEAM - 02'),
                                        'MICROTEAM - 03': getSortedMicroteamEmployees('MICROTEAM - 03'),
                                    }}
                                    addCrew={{
                                        'ADD CREW - 01': getSortedAddCrewEmployees('ADD CREW - 01'),
                                        'ADD CREW - 02': getSortedAddCrewEmployees('ADD CREW - 02'),
                                        'ADD CREW - 03': getSortedAddCrewEmployees('ADD CREW - 03'),
                                    }}
                                    ph={phValue}
                                />
                            </PDFViewer>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </SidebarProvider>
    );
}
