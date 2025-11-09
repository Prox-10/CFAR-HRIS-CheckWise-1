import { AppSidebar } from '@/components/app-sidebar';
import SidebarHoverZone from '@/components/sidebar-hover-zone';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSidebarHover } from '@/hooks/use-sidebar-hover';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import { format } from 'date-fns';
import { ClipboardList } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';

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

export default function DailyAttendancePage() {
    const [reportDate, setReportDate] = useState<Date | undefined>(new Date());
    const [exportFormat, setExportFormat] = useState<'pdf' | 'xlsx'>('pdf');
    const [area, setArea] = useState<string>('all');
    const [microteams, setMicroteams] = useState<MicroteamData>({
        'MICROTEAM - 01': [],
        'MICROTEAM - 02': [],
        'MICROTEAM - 03': [],
    });
    const [loading, setLoading] = useState(false);

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
        } catch (error) {
            console.error('Error fetching microteam data:', error);
            toast.error('Failed to load microteam data');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        // wire to backend later
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
                                    <div className="flex flex-col gap-2">
                                        <div className="flex w-full flex-row items-center justify-between">
                                            <div className="flex flex-col items-start">
                                                <div className="text-sm font-semibold">CFARBEMPCO</div>
                                                <div className="mt-1 flex items-center">
                                                    <span className="mr-2 text-sm font-semibold">PH:</span>
                                                    <Input type="text" placeholder="PH" className="w-20" />
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
                                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                        {(['MICROTEAM - 01', 'MICROTEAM - 02', 'MICROTEAM - 03'] as const).map((title) => {
                                            const employees = microteams[title] || [];
                                            const maxRows = 25;
                                            const rowsToShow = Math.max(maxRows, employees.length);

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
                                                                    const employee = employees[i];
                                                                    return (
                                                                        <TableRow key={i}>
                                                                            <TableCell className="text-[10px]">
                                                                                {String(i + 1).padStart(2, '0')}
                                                                            </TableCell>
                                                                            <TableCell className="text-[10px]">
                                                                                {employee ? employee.employee_name : ''}
                                                                            </TableCell>
                                                                            <TableCell className="text-[10px]">
                                                                                {employee?.time_in && employee?.time_out
                                                                                    ? `${formatTime(employee.time_in)} - ${formatTime(employee.time_out)}`
                                                                                    : ''}
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

                                    {/* Add Crew tables */}
                                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                                        {['ADD CREW - 01', 'ADD CREW - 02', 'ADD CREW - 03'].map((title) => (
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
                                                            {Array.from({ length: 8 }).map((_, i) => (
                                                                <TableRow key={i}>
                                                                    <TableCell className="text-[10px]">{String(i + 1).padStart(2, '0')}</TableCell>
                                                                    <TableCell className="text-[10px]"></TableCell>
                                                                    <TableCell className="text-[10px]"></TableCell>
                                                                </TableRow>
                                                            ))}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            </div>
                                        ))}
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
                                </CardContent>
                            </Card>

                            <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" onClick={() => router.visit('/report')}>
                                    Back
                                </Button>
                                <Button variant="outline" onClick={() => router.visit('/report/daily-attendance/edit')}>
                                    Edit
                                </Button>
                                <Button variant="main" onClick={handleExport}>
                                    Export {exportFormat.toUpperCase()}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </SidebarInset>
            </SidebarHoverLogic>
        </SidebarProvider>
    );
}
