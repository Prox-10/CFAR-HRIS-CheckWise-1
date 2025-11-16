import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SidebarInset, SidebarProvider, SidebarSeparator, useSidebar } from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { CalendarDays, ClipboardList, Clock, EyeIcon, FileText, UsersIcon } from 'lucide-react';
// import { format } from 'path';
import { AppSidebar } from '@/components/app-sidebar';
import SidebarHoverZone from '@/components/sidebar-hover-zone';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { ContentLoading } from '@/components/ui/loading';
import { useSidebarHover } from '@/hooks/use-sidebar-hover';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
// Daily attendance now uses a dedicated page

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Report',
        href: '/report',
    },
];

const ReportCard = ({
    title,
    description,
    icon: Icon,
    buttonText = 'Generate Report',
    variant = 'default',
    onClick,
}: {
    title: string;
    description: string;
    icon: React.ElementType;
    buttonText?: string;
    variant?: 'default' | 'attendance' | 'employee' | 'leave' | 'evaluation' | 'payroll';
    onClick?: () => void;
}) => {
    return (
        <Card>
            <CardHeader
                className={cn(
                    'pb-2',
                    variant === 'attendance' && 'border-l-4 border-green-500',
                    variant === 'employee' && 'border-l-4 border-blue-500',
                    variant === 'leave' && 'border-l-4 border-yellow-500',
                    variant === 'evaluation' && 'border-l-4 border-purple-500',
                    variant === 'payroll' && 'border-l-4 border-orange-500',
                )}
            >
                <CardTitle className="flex items-center text-base">
                    <Icon
                        className={cn(
                            'mr-2 h-5 w-5',
                            variant === 'default' && 'text-green-500',
                            variant === 'attendance' && 'text-green-500',
                            variant === 'employee' && 'text-blue-500',
                            variant === 'leave' && 'text-yellow-500',
                            variant === 'evaluation' && 'text-purple-500',
                            variant === 'payroll' && 'text-orange-500',
                        )}
                    />
                    {title}
                </CardTitle>
                <CardDescription className="text-xs">{description}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
                <Button variant="outline" className="flex w-full items-center justify-center" onClick={onClick}>
                    <EyeIcon className="mr-2 h-4 w-4" />
                    {buttonText}
                </Button>
            </CardContent>
        </Card>
    );
};

// Sample analytics data
const attendanceRateData = [
    { month: 'Jan', rate: 95 },
    { month: 'Feb', rate: 93 },
    { month: 'Mar', rate: 96 },
    { month: 'Apr', rate: 94 },
    { month: 'May', rate: 97 },
    { month: 'Jun', rate: 96 },
];

const leaveTypeData = [
    { name: 'Vacation', value: 45 },
    { name: 'Sick', value: 30 },
    { name: 'Emergency', value: 15 },
    { name: 'Others', value: 10 },
];

const performanceData = [
    { rating: '5★', count: 12 },
    { rating: '4★', count: 28 },
    { rating: '3★', count: 34 },
    { rating: '2★', count: 8 },
    { rating: '1★', count: 3 },
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];

type ReportTab = 'attendance' | 'employee' | 'leave' | 'evaluation' | 'absenteeism';

const ReportPage = () => {
    // const [date, setDate] = useState<Date | undefined>(new Date());
    const [startDate, setStartDate] = useState<Date | undefined>(new Date());
    const [endDate, setEndDate] = useState<Date | undefined>(new Date());
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<ReportTab>('attendance');
    // navigates to dedicated daily attendance page

    const getInitialTabFromQuery = useMemo<() => ReportTab>(() => {
        return () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const tab = (params.get('tab') || '').toLowerCase();
                if (tab === 'attendance' || tab === 'employee' || tab === 'leave' || tab === 'evaluation' || tab === 'absenteeism') {
                    return tab as ReportTab;
                }
                return 'attendance';
            } catch {
                return 'attendance';
            }
        };
    }, []);

    useEffect(() => {
        setActiveTab(getInitialTabFromQuery());
        setTimeout(() => {
            setLoading(false);
        }, 500);
    }, [getInitialTabFromQuery]);

    const handleTabChange = (value: string) => {
        const next = (value as ReportTab) || 'attendance';
        setActiveTab(next);
        // keep other params if added later
        const params = new URLSearchParams(window.location.search);
        params.set('tab', next);
        window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    };

    return (
        <SidebarProvider>
            <Head title="Report" />
            {/* <Toaster position="top-right" richColors /> */}
            {/* Sidebar hover logic */}
            <SidebarHoverLogic>
                <SidebarInset>
                    {/* <HeaderShrink/> */}
                    <SiteHeader breadcrumbs={breadcrumbs} title={''} />
                    {loading ? (
                        <ContentLoading />
                    ) : (
                        <Card className="border-main m-5 space-y-4">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center">
                                    <ClipboardList className="text-cfarbempco-green mr-2 h-5 w-5" />
                                    Report Generation
                                </CardTitle>
                                <CardDescription></CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    <SidebarSeparator />
                                    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4 p-5">
                                        <TabsList className="bg-main mb-4 grid grid-cols-2 py-[5px] md:grid-cols-5">
                                            <TabsTrigger
                                                className="hover:bg-main-600 mx-3 mb-5 data-[state=active]:bg-green-600 data-[state=active]:text-white"
                                                value="attendance"
                                                // onClick={() => router.visit('/report/daily-attendance')}
                                            >
                                                Attendance
                                            </TabsTrigger>
                                            <TabsTrigger
                                                className="hover:bg-main-600 mx-3 mb-5 data-[state=active]:bg-green-600 data-[state=active]:text-white"
                                                value="employee"
                                            >
                                                Employee
                                            </TabsTrigger>
                                            <TabsTrigger
                                                className="hover:bg-main-600 mx-3 mb-5 data-[state=active]:bg-green-600 data-[state=active]:text-white"
                                                value="leave"
                                            >
                                                Leave
                                            </TabsTrigger>
                                            <TabsTrigger
                                                className="hover:bg-main-600 mx-3 mb-5 data-[state=active]:bg-green-600 data-[state=active]:text-white"
                                                value="evaluation"
                                            >
                                                Evaluation
                                            </TabsTrigger>
                                            <TabsTrigger
                                                className="hover:bg-main-600 mx-3 mb-5 data-[state=active]:bg-green-600 data-[state=active]:text-white"
                                                value="absenteeism"
                                            >
                                                Absenteeism
                                            </TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="attendance" className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                <ReportCard
                                                    title="PP CREW DAILY TIME RECORD "
                                                    description="Record of daily attendance across Packing Plant Department"
                                                    icon={Clock}
                                                    variant="attendance"
                                                    buttonText="View"
                                                    onClick={() => router.visit('/report/daily-attendance')}
                                                />
                                                <ReportCard
                                                    title="COOP AREA DAILY TIME RECORD"
                                                    description="Record of daily attendance across Coop Area Department"
                                                    icon={Clock}
                                                    variant="attendance"
                                                    buttonText="View"
                                                    onClick={() => router.visit('/report/coop-area-dtr')}
                                                />
                                                <ReportCard
                                                    title="PEST & DISEASE DAILY TIME RECORD "
                                                    description="Record of daily attendance across Pest & Disease Department"
                                                    icon={Clock}
                                                    variant="attendance"
                                                    buttonText="View"
                                                    onClick={() => router.visit('/report/pest-disease-dtr')}
                                                />
                                                <ReportCard
                                                    title="COOP HARVESTER MAINTENANCE DAILY TIME RECORD "
                                                    description="Record of daily attendance across Coop Harvester Maintenance Department"
                                                    icon={Clock}
                                                    variant="attendance"
                                                    buttonText="View"
                                                    onClick={() => router.visit('/report/coop-harvester-maintenance')}
                                                />
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="employee" className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                <ReportCard
                                                    title="Gender And Development"
                                                    description="Report on employee gender and development"
                                                    icon={UsersIcon}
                                                    variant="employee"
                                                    buttonText="View"
                                                    onClick={() => router.visit('/report/gender-development')}
                                                />
                                                {/* <ReportCard
                                                    title="Employee Tenure"
                                                    description="Report on employee service length and anniversaries"
                                                    icon={Calendar}
                                                    variant="employee"
                                                    buttonText="Generate Tenure Report"
                                                />
                                                <ReportCard
                                                    title="Department Headcount"
                                                    description="Headcount breakdown by department and position"
                                                    icon={Users}
                                                    variant="employee"
                                                    buttonText="Generate Headcount Report"
                                                />
                                                <ReportCard
                                                    title="New Hires Report"
                                                    description="List of new employees within selected period"
                                                    icon={Users}
                                                    variant="employee"
                                                    buttonText="Generate New Hires Report"
                                                /> */}
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="leave" className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                <ReportCard
                                                    title="Leave Balance Report"
                                                    description="Current leave balances for all employees"
                                                    icon={CalendarDays}
                                                    variant="leave"
                                                    buttonText="Generate Leave Balance"
                                                />
                                                <ReportCard
                                                    title="Leave Usage Summary"
                                                    description="Summary of leave usage by type and department"
                                                    icon={CalendarDays}
                                                    variant="leave"
                                                    buttonText="Generate Usage Summary"
                                                />
                                                <ReportCard
                                                    title="Pending Leave Requests"
                                                    description="List of all pending leave requests awaiting approval"
                                                    icon={CalendarDays}
                                                    variant="leave"
                                                    buttonText="Generate Pending List"
                                                />
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="evaluation" className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                <ReportCard
                                                    title="Performance Summary"
                                                    description="Summary of employee performance ratings"
                                                    icon={FileText}
                                                    variant="evaluation"
                                                    buttonText="Generate Performance Report"
                                                />
                                                <ReportCard
                                                    title="Department Performance"
                                                    description="Performance analysis by department"
                                                    icon={FileText}
                                                    variant="evaluation"
                                                    buttonText="Generate Department Report"
                                                />
                                                <ReportCard
                                                    title="Evaluation Completion"
                                                    description="Status report on completed vs. pending evaluations"
                                                    icon={FileText}
                                                    variant="evaluation"
                                                    buttonText="Generate Status Report"
                                                />
                                            </div>
                                        </TabsContent>
                                        <TabsContent value="absenteeism" className="space-y-4">
                                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-base">Attendance Rate (Last 6 months)</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="h-64">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <LineChart data={attendanceRateData}>
                                                                <XAxis dataKey="month" />
                                                                <YAxis domain={[0, 100]} />
                                                                <Tooltip />
                                                                <Legend />
                                                                <Line
                                                                    type="monotone"
                                                                    dataKey="rate"
                                                                    stroke="#10b981"
                                                                    strokeWidth={2}
                                                                    dot={{ r: 3 }}
                                                                />
                                                            </LineChart>
                                                        </ResponsiveContainer>
                                                    </CardContent>
                                                </Card>
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-base">Leave Usage by Type</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="h-64">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <PieChart>
                                                                <Pie
                                                                    data={leaveTypeData}
                                                                    dataKey="value"
                                                                    nameKey="name"
                                                                    innerRadius={45}
                                                                    outerRadius={65}
                                                                    paddingAngle={2}
                                                                >
                                                                    {leaveTypeData.map((entry, index) => (
                                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                                    ))}
                                                                </Pie>
                                                                <Tooltip />
                                                                <Legend />
                                                            </PieChart>
                                                        </ResponsiveContainer>
                                                    </CardContent>
                                                </Card>
                                                <Card>
                                                    <CardHeader>
                                                        <CardTitle className="text-base">Performance Rating Distribution</CardTitle>
                                                    </CardHeader>
                                                    <CardContent className="h-64">
                                                        <ResponsiveContainer width="100%" height="100%">
                                                            <BarChart data={performanceData}>
                                                                <XAxis dataKey="rating" />
                                                                <YAxis />
                                                                <Tooltip />
                                                                <Legend />
                                                                <Bar dataKey="count" fill="#8b5cf6" />
                                                            </BarChart>
                                                        </ResponsiveContainer>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </SidebarInset>
            </SidebarHoverLogic>
            {/* Daily attendance modal removed; routed to dedicated page */}
        </SidebarProvider>
    );
};

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

export default ReportPage;
