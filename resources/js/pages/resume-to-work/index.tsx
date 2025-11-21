import { AppSidebar } from '@/components/app-sidebar';
import { Main } from '@/components/customize/main';
import ResumeToWorkPDF from '@/components/pdf/resume-to-work-pdf';
import SidebarHoverZone from '@/components/sidebar-hover-zone';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useSidebarHover } from '@/hooks/use-sidebar-hover';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { Calendar, CheckCircle, Clock, FileText, Pencil, Send, User, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';
import EditResumeModal from './components/edit-resume-modal';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resume to Work',
        href: '/resume-to-work',
    },
];

interface Employee {
    id: string;
    employee_name: string;
    employeeid: string;
    department: string;
    position: string;
}

interface ApprovedLeave {
    id: string;
    employee_name: string;
    employeeid: string;
    employee_id_db?: string;
    department: string;
    position: string;
    leave_type: string;
    leave_start_date: string;
    leave_end_date: string;
    leave_days: string;
    picture?: string;
    status: string;
    supervisor_status: string | null;
    hr_status: string | null;
    hr_approved_at: string | null;
}

interface ApprovedAbsence {
    id: string;
    employee_name: string;
    employee_id_number: string;
    employee_id_db?: string;
    department: string;
    position: string;
    absence_type: string;
    from_date: string;
    to_date: string;
    days: number;
    picture?: string;
    status: string;
    supervisor_status: string | null;
    hr_status: string | null;
    hr_approved_at: string | null;
}

interface ResumeToWorkRequest {
    id: string;
    employee_name: string;
    employee_id: string; // Database ID
    employee_id_number?: string; // Employee ID number for display
    department: string;
    position: string;
    return_date: string;
    previous_absence_reference: string;
    comments: string;
    status: 'pending' | 'processed';
    processed_by: string | null;
    processed_at: string | null;
    supervisor_notified: boolean;
    supervisor_notified_at: string | null;
    created_at: string;
}

interface Props {
    resumeRequests?: ResumeToWorkRequest[];
    approvedLeaves?: ApprovedLeave[];
    approvedAbsences?: ApprovedAbsence[];
    employees?: Employee[];
    userRole?: {
        is_supervisor: boolean;
        is_super_admin: boolean;
        is_hr?: boolean;
        supervised_departments: string[];
    };
    leave_id?: string;
    absence_id?: string;
    type?: 'leave' | 'absence';
}

export default function ResumeToWorkIndex({
    resumeRequests = [],
    approvedLeaves = [],
    approvedAbsences = [],
    employees = [],
    userRole,
    leave_id,
    absence_id,
    type,
}: Props) {
    const [requests, setRequests] = useState<ResumeToWorkRequest[]>(resumeRequests);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'leave' | 'absence'>('all');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<ResumeToWorkRequest | null>(null);
    const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
    const [pdfRequest, setPdfRequest] = useState<ResumeToWorkRequest | null>(null);
    const { auth } = usePage().props as any;

    // Get URL query parameters
    const page = usePage();
    const urlParams = new URLSearchParams(window.location.search);
    const leaveIdParam = urlParams.get('leave_id') || leave_id;
    const absenceIdParam = urlParams.get('absence_id') || absence_id;
    const typeParam = urlParams.get('type') || type;

    // Update local state when server data changes
    useEffect(() => {
        setRequests(resumeRequests);
    }, [resumeRequests]);

    // Set up real-time updates using Echo
    useEffect(() => {
        const echo = (window as any).Echo;
        if (!echo) {
            console.warn('Echo not available, skipping real-time updates');
            return;
        }

        const currentUser = auth?.user;

        // Handlers to avoid duplication across channels
        const handleProcessed = (e: any) => {
            console.log('Received ReturnWorkProcessed event:', e);
            if (e?.type !== 'return_work_processed') return;

            setRequests((prev) =>
                prev.map((request) =>
                    request.id === e.return_work_id
                        ? {
                              ...request,
                              status: 'processed',
                              processed_by: e.processed_by,
                              processed_at: e.processed_at,
                          }
                        : request,
                ),
            );
            toast.success(`Return to work request for ${e.employee_name} has been processed!`);
        };

        const handleRequested = (e: any) => {
            console.log('Received ReturnWorkRequested event:', e);
            if (e?.type !== 'return_work_request') return;

            const newRequest = {
                id: `return_${e.return_work_id}`,
                employee_name: e.employee_name,
                employee_id: e.employee_id_number,
                department: e.department,
                position: '', // Will be filled from employee data
                return_date: e.return_date,
                previous_absence_reference: e.absence_type,
                comments: e.reason,
                status: 'pending' as const,
                processed_by: null,
                processed_at: null,
                supervisor_notified: false,
                supervisor_notified_at: null,
                created_at: new Date().toISOString(),
                source: 'employee',
            } as any;

            setRequests((prev) => {
                const exists = prev.some((r) => r.id === newRequest.id);
                if (exists) {
                    console.log('Return work request already exists, not adding duplicate');
                    return prev;
                }
                toast.info(`New return to work request from ${e.employee_name}`);
                return [newRequest, ...prev];
            });
        };

        const handleStatusUpdated = (e: any) => {
            if (e?.type !== 'return_work_status') return;
            setRequests((prev) =>
                prev.map((request) =>
                    request.id === `return_${e.request_id}`
                        ? {
                              ...request,
                              status: 'processed',
                              processed_by: e.approved_by || e.processed_by || request.processed_by,
                              processed_at: e.approved_at || e.processed_at || request.processed_at,
                          }
                        : request,
                ),
            );
        };

        // Set up public notifications channel
        const publicNotifications = echo.channel('notifications');
        publicNotifications
            .listen('.ReturnWorkRequested', (e: any) => {
                // Only process if user is SuperAdmin (supervisors get it via their private channel)
                if (!userRole?.is_super_admin && userRole?.is_supervisor) {
                    return; // Supervisors should only receive via their private channel
                }
                handleRequested(e);
            })
            .listen('.ReturnWorkProcessed', handleProcessed)
            .listen('.RequestStatusUpdated', handleStatusUpdated);

        // Also listen on private supervisor channel if user is supervisor
        let supervisorChannel: any = null;
        if (userRole?.is_supervisor && currentUser?.id) {
            const currentUserId = currentUser.id;
            console.log('Setting up supervisor channel for return work:', currentUserId);
            supervisorChannel = echo.private(`supervisor.${currentUserId}`);

            supervisorChannel.subscribed(() => {
                console.log('Successfully subscribed to supervisor channel for return work');
            });

            supervisorChannel.error((error: any) => {
                console.error('Error subscribing to supervisor channel:', error);
            });

            supervisorChannel.listen('.ReturnWorkRequested', handleRequested);
        }

        return () => {
            console.log('Cleaning up Echo listeners (resume-to-work)');
            try {
                publicNotifications.stopListening('.ReturnWorkRequested');
                publicNotifications.stopListening('.ReturnWorkProcessed');
                publicNotifications.stopListening('.RequestStatusUpdated');
                if (supervisorChannel) {
                    supervisorChannel.stopListening('.ReturnWorkRequested');
                    echo.leave(`supervisor.${currentUser?.id}`);
                }
                echo.leave('notifications');
            } catch (error) {
                console.warn('Error cleaning up Echo listeners:', error);
            }
        };
    }, [userRole, auth?.user?.id]);

    // Filter approved leaves and absences that need resume-to-work forms
    const filteredLeaves = useMemo(() => {
        const q = search.trim().toLowerCase();
        return approvedLeaves.filter((leave) => {
            const matchQ = !q || `${leave.employee_name} ${leave.department}`.toLowerCase().includes(q);
            const matchStatus = statusFilter === 'all' || statusFilter === 'leave';
            const isFullyApproved = leave.status === 'Approved' && leave.supervisor_status === 'approved' && leave.hr_status === 'approved';
            return matchQ && matchStatus && isFullyApproved;
        });
    }, [approvedLeaves, search, statusFilter]);

    const filteredAbsences = useMemo(() => {
        const q = search.trim().toLowerCase();
        return approvedAbsences.filter((absence) => {
            const matchQ = !q || `${absence.employee_name} ${absence.department}`.toLowerCase().includes(q);
            const matchStatus = statusFilter === 'all' || statusFilter === 'absence';
            const isFullyApproved = absence.supervisor_status === 'approved' && absence.hr_status === 'approved';
            return matchQ && matchStatus && isFullyApproved;
        });
    }, [approvedAbsences, search, statusFilter]);

    // Filter resume requests
    const filteredRequests = useMemo(() => {
        const q = search.trim().toLowerCase();
        return requests.filter((request) => {
            return !q || `${request.employee_name} ${request.department} ${request.employee_id}`.toLowerCase().includes(q);
        });
    }, [requests, search]);

    const handleEditRequest = (request: ResumeToWorkRequest) => {
        setSelectedRequest(request);
        setIsEditModalOpen(true);
    };

    const handleViewPDF = (request: ResumeToWorkRequest) => {
        setPdfRequest(request);
        setIsPdfViewerOpen(true);
    };

    const handleSendEmail = (request: ResumeToWorkRequest) => {
        // Extract the actual ID from the request (handle both 'resume_' and 'return_' prefixes)
        const requestId =
            request.id.startsWith('resume_') || request.id.startsWith('return_') ? request.id.replace(/^(resume_|return_)/, '') : request.id;

        router.post(
            route('resume-to-work.send-email', { resumeToWork: requestId }),
            {},
            {
                onSuccess: () => {
                    toast.success('Email sent successfully!');
                },
                onError: (errors) => {
                    console.error('Email sending errors:', errors);
                    toast.error('Failed to send email. Please try again.');
                },
                preserveScroll: true,
            },
        );
    };

    const handleEditLeave = (leave: ApprovedLeave) => {
        // Navigate to leave edit page
        try {
            router.visit(route('leave.edit', { leave: leave.id }), {
                preserveScroll: true,
            });
        } catch (error) {
            toast.info('Edit functionality for leaves is available in the Leave Management page');
        }
    };

    const handleEditAbsence = (absence: ApprovedAbsence) => {
        // Navigate to absence page (edit functionality may be available there)
        try {
            router.visit(route('absence.index'), {
                preserveScroll: true,
            });
            toast.info(`Navigate to Absence Management to edit absence #${absence.id}`);
        } catch (error) {
            toast.info('Edit functionality for absences is available in the Absence Management page');
        }
    };

    const handleCreateResumeFromLeave = (leave: ApprovedLeave) => {
        // Find the employee by employee_id_db
        const employee = employees.find((e) => e.id === leave.employee_id_db);
        if (!employee) {
            toast.error('Employee not found');
            return;
        }

        // Calculate return date (day after leave ends)
        const endDate = new Date(leave.leave_end_date);
        endDate.setDate(endDate.getDate() + 1);
        const returnDate = format(endDate, 'yyyy-MM-dd');

        // Create resume-to-work request directly
        router.post(
            route('resume-to-work.store'),
            {
                employee_id: employee.id,
                return_date: returnDate,
                previous_absence_reference: `Leave Request #${leave.id} - ${leave.leave_type}`,
                comments: `Resume to work after approved leave: ${leave.leave_type}`,
            },
            {
                onSuccess: () => {
                    toast.success('Resume to work request created successfully!');
                },
                onError: (errors) => {
                    console.error('Creation errors:', errors);
                    toast.error('Failed to create resume to work request. Please try again.');
                },
                preserveScroll: true,
            },
        );
    };


    // If specific leave_id or absence_id is provided, filter to show only that item
    const selectedLeave = useMemo(() => {
        if (leaveIdParam && typeParam === 'leave') {
            return filteredLeaves.find((l) => l.id === leaveIdParam);
        }
        return null;
    }, [filteredLeaves, leaveIdParam, typeParam]);

    const selectedAbsence = useMemo(() => {
        if (absenceIdParam && typeParam === 'absence') {
            return filteredAbsences.find((a) => a.id === absenceIdParam);
        }
        return null;
    }, [filteredAbsences, absenceIdParam, typeParam]);

    // Component for displaying approved leave card
    function ApprovedLeaveCard({ leave, onCreateResume }: { leave: ApprovedLeave; onCreateResume: () => void }) {
        const calculateReturnDate = () => {
            const endDate = new Date(leave.leave_end_date);
            endDate.setDate(endDate.getDate() + 1); // Day after leave ends
            return format(endDate, 'MMM dd, yyyy');
        };

        return (
            <Card className="border-main/40 transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            {leave.picture ? (
                                <img
                                    src={leave.picture}
                                    alt={leave.employee_name}
                                    className="border-main h-12 w-12 rounded-full border-2 object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = '/Logo.png';
                                    }}
                                />
                            ) : (
                                <div className="border-main flex h-12 w-12 items-center justify-center rounded-full border-2 bg-muted">
                                    <User className="text-main h-6 w-6" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base">{leave.employee_name}</CardTitle>
                            <CardDescription className="truncate text-xs">
                                {leave.department} • {leave.position}
                            </CardDescription>
                            <CardDescription className="text-xs text-gray-500">ID: {leave.employeeid}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                            {leave.leave_type}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                                {format(new Date(leave.leave_start_date), 'MMM dd')} - {format(new Date(leave.leave_end_date), 'MMM dd, yyyy')}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            <span className="font-medium">{leave.leave_days}</span> day(s)
                        </div>
                        <div className="border-t pt-2">
                            <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Return Date:</span> {calculateReturnDate()}
                            </div>
                        </div>
                    </div>
                    <Button onClick={onCreateResume} className="bg-main hover:bg-main/90 w-full text-white" size="sm">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Create Resume to Work
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Component for displaying approved absence card
    function ApprovedAbsenceCard({ absence, onCreateResume }: { absence: ApprovedAbsence; onCreateResume: () => void }) {
        const calculateReturnDate = () => {
            const endDate = new Date(absence.to_date);
            endDate.setDate(endDate.getDate() + 1); // Day after absence ends
            return format(endDate, 'MMM dd, yyyy');
        };

        return (
            <Card className="border-main/40 transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            {absence.picture ? (
                                <img
                                    src={absence.picture}
                                    alt={absence.employee_name}
                                    className="border-main h-12 w-12 rounded-full border-2 object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = '/Logo.png';
                                    }}
                                />
                            ) : (
                                <div className="border-main flex h-12 w-12 items-center justify-center rounded-full border-2 bg-muted">
                                    <User className="text-main h-6 w-6" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base">{absence.employee_name}</CardTitle>
                            <CardDescription className="truncate text-xs">
                                {absence.department} • {absence.position}
                            </CardDescription>
                            <CardDescription className="text-xs text-gray-500">ID: {absence.employee_id_number}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        <Badge variant="outline" className="bg-purple-100 text-purple-700">
                            {absence.absence_type}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                                {format(new Date(absence.from_date), 'MMM dd')} - {format(new Date(absence.to_date), 'MMM dd, yyyy')}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            <span className="font-medium">{absence.days}</span> day(s)
                        </div>
                        <div className="border-t pt-2">
                            <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Return Date:</span> {calculateReturnDate()}
                            </div>
                        </div>
                    </div>
                    <Button onClick={onCreateResume} className="bg-main hover:bg-main/90 w-full text-white" size="sm">
                        <UserCheck className="mr-2 h-4 w-4" />
                        Create Resume to Work
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Drag and Drop handlers
    const onDragStart = (e: React.DragEvent, id: string) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        // Add visual feedback
        (e.currentTarget as HTMLElement).style.opacity = '0.5';
    };

    const onDragOverColumn = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const onDropToColumn = (e: React.DragEvent, newStatus: 'pending' | 'processed') => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (!id) return;

        // Reset opacity for all dragged elements
        const draggedElements = document.querySelectorAll('[draggable="true"]');
        draggedElements.forEach((el) => {
            (el as HTMLElement).style.opacity = '1';
        });

        if (newStatus === 'processed') {
            processRequest(id);
        } else {
            // Revert to pending status (if needed)
            updateRequestStatus(id, 'pending');
        }
    };

    const onDragEnd = (e: React.DragEvent) => {
        // Reset opacity when drag ends
        (e.currentTarget as HTMLElement).style.opacity = '1';
    };

    const updateRequestStatus = useCallback(
        (id: string, status: 'pending' | 'processed') => {
            // Store the original status in case we need to revert
            const originalStatus = requests.find((r) => r.id === id)?.status;

            // Update local state immediately for UI responsiveness (optimistic update)
            setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

            // Make API call using Inertia router
            if (status === 'processed') {
                router.patch(
                    route('resume-to-work.process', { resumeToWork: id }),
                    {},
                    {
                        onSuccess: () => {
                            toast.success('Resume to work request processed successfully!');
                        },
                        onError: () => {
                            // Revert local state on error
                            if (originalStatus) {
                                setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: originalStatus } : r)));
                            }
                            toast.error('Failed to process resume to work request. Please try again.');
                        },
                        preserveScroll: true,
                    },
                );
            }
        },
        [requests],
    );

    const processRequest = useCallback(
        (id: string) => {
            updateRequestStatus(id, 'processed');
        },
        [updateRequestStatus],
    );

    // Component for displaying approved leave card
    const ApprovedLeaveCardComponent = ({
        leave,
        onCreateResume,
        onEdit,
    }: {
        leave: ApprovedLeave;
        onCreateResume: (leave: ApprovedLeave) => void;
        onEdit?: (leave: ApprovedLeave) => void;
    }) => {
        const calculateReturnDate = () => {
            const endDate = new Date(leave.leave_end_date);
            endDate.setDate(endDate.getDate() + 1); // Day after leave ends
            return format(endDate, 'MMM dd, yyyy');
        };

        return (
            <Card className="border-main/40 transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            {leave.picture ? (
                                <img
                                    src={leave.picture}
                                    alt={leave.employee_name}
                                    className="border-main h-12 w-12 rounded-full border-2 object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = '/Logo.png';
                                    }}
                                />
                            ) : (
                                <div className="border-main flex h-12 w-12 items-center justify-center rounded-full border-2 bg-muted">
                                    <User className="text-main h-6 w-6" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base">{leave.employee_name}</CardTitle>
                            <CardDescription className="truncate text-xs">
                                {leave.department} • {leave.position}
                            </CardDescription>
                            <CardDescription className="text-xs text-gray-500">ID: {leave.employeeid}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        <Badge variant="outline" className="bg-green-100 text-green-700">
                            {leave.leave_type}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                                {format(new Date(leave.leave_start_date), 'MMM dd')} - {format(new Date(leave.leave_end_date), 'MMM dd, yyyy')}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            <span className="font-medium">{leave.leave_days}</span> day(s)
                        </div>
                        <div className="border-t pt-2">
                            <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Return Date:</span> {calculateReturnDate()}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => onCreateResume(leave)} className="bg-main hover:bg-main/90 flex-1 text-white" size="sm">
                            <UserCheck className="mr-2 h-4 w-4" />
                            Create Resume to Work
                        </Button>
                        {onEdit && (
                            <Button
                                variant="outline"
                                className="border-blue-400 text-blue-700 hover:bg-blue-50"
                                onClick={() => onEdit(leave)}
                                size="sm"
                                title="Edit"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    // Component for displaying approved absence card
    const ApprovedAbsenceCardComponent = ({
        absence,
        onCreateResume,
        onEdit,
    }: {
        absence: ApprovedAbsence;
        onCreateResume: (absence: ApprovedAbsence) => void;
        onEdit?: (absence: ApprovedAbsence) => void;
    }) => {
        const calculateReturnDate = () => {
            const endDate = new Date(absence.to_date);
            endDate.setDate(endDate.getDate() + 1); // Day after absence ends
            return format(endDate, 'MMM dd, yyyy');
        };

        return (
            <Card className="border-main/40 transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0">
                            {absence.picture ? (
                                <img
                                    src={absence.picture}
                                    alt={absence.employee_name}
                                    className="border-main h-12 w-12 rounded-full border-2 object-cover"
                                    onError={(e) => {
                                        e.currentTarget.src = '/Logo.png';
                                    }}
                                />
                            ) : (
                                <div className="border-main flex h-12 w-12 items-center justify-center rounded-full border-2 bg-muted">
                                    <User className="text-main h-6 w-6" />
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <CardTitle className="truncate text-base">{absence.employee_name}</CardTitle>
                            <CardDescription className="truncate text-xs">
                                {absence.department} • {absence.position}
                            </CardDescription>
                            <CardDescription className="text-xs text-gray-500">ID: {absence.employee_id_number}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="space-y-2">
                        <Badge variant="outline" className="bg-purple-100 text-purple-700">
                            {absence.absence_type}
                        </Badge>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span>
                                {format(new Date(absence.from_date), 'MMM dd')} - {format(new Date(absence.to_date), 'MMM dd, yyyy')}
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            <span className="font-medium">{absence.days}</span> day(s)
                        </div>
                        <div className="border-t pt-2">
                            <div className="text-xs text-muted-foreground">
                                <span className="font-medium">Return Date:</span> {calculateReturnDate()}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={() => onCreateResume(absence)} className="bg-main hover:bg-main/90 flex-1 text-white" size="sm">
                            <UserCheck className="mr-2 h-4 w-4" />
                            Create Resume to Work
                        </Button>
                        {onEdit && (
                            <Button
                                variant="outline"
                                className="border-blue-400 text-blue-700 hover:bg-blue-50"
                                onClick={() => onEdit(absence)}
                                size="sm"
                                title="Edit"
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <SidebarProvider>
            <Head title="Resume to Work" />
            <Toaster position="top-center" richColors />
            <SidebarHoverLogic>
                <SidebarInset>
                    <SiteHeader breadcrumbs={breadcrumbs} title={''} />
                    <Main fixed>
                        {/* Header with Add Button */}
                        <div className="flex items-center justify-between p-4">
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <Input
                                        placeholder="Search by employee name or department..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="h-10"
                                    />
                                </div>
                                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'leave' | 'absence')}>
                                    <SelectTrigger className="h-10 w-40">
                                        <SelectValue placeholder="Filter Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Types</SelectItem>
                                        <SelectItem value="leave">Leaves</SelectItem>
                                        <SelectItem value="absence">Absences</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Separator />

                      

                        {/* Show all approved leaves and absences */}
                        <div className="space-y-6 p-4">
                            {/* Approved Leaves Section */}
                            {filteredLeaves.length > 0 && (
                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-lg font-semibold">Approved Leaves ({filteredLeaves.length})</h2>
                                        <Badge variant="outline" className="bg-green-50 text-green-700">
                                            Ready for Resume to Work
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredLeaves.map((leave) => (
                                            <ApprovedLeaveCardComponent
                                                key={leave.id}
                                                leave={leave}
                                                onCreateResume={handleCreateResumeFromLeave}
                                                onEdit={handleEditLeave}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                           

                            {/* No approved items message */}
                            {filteredLeaves.length === 0 && filteredAbsences.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                                    <p className="text-lg font-medium text-muted-foreground">No Approved Leaves or Absences</p>
                                    <p className="text-sm text-muted-foreground">
                                        Approved leaves and absences will appear here for creating resume to work forms.
                                    </p>
                                </div>
                            )}

                            {/* Resume to Work Requests Section */}
                            {filteredRequests.length > 0 && (
                                <div>
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="text-lg font-semibold">Resume to Work Requests ({filteredRequests.length})</h2>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {filteredRequests.map((request) => (
                                            <ResumeCard
                                                key={request.id}
                                                item={request}
                                                onProcess={processRequest}
                                                canProcess={userRole?.is_super_admin || userRole?.is_hr}
                                                onDragStart={onDragStart}
                                                onDragEnd={onDragEnd}
                                                onEdit={handleEditRequest}
                                                onViewPDF={handleViewPDF}
                                                onSendEmail={handleSendEmail}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Edit Resume Modal */}
                        <EditResumeModal
                            isOpen={isEditModalOpen}
                            onClose={() => {
                                setIsEditModalOpen(false);
                                setSelectedRequest(null);
                            }}
                            employees={employees}
                            request={selectedRequest}
                        />

                        {/* PDF Viewer Modal */}
                        <Dialog open={isPdfViewerOpen} onOpenChange={setIsPdfViewerOpen}>
                            <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
                                {pdfRequest && <ResumeToWorkPDF request={pdfRequest} />}
                            </DialogContent>
                        </Dialog>
                    </Main>
                </SidebarInset>
            </SidebarHoverLogic>
        </SidebarProvider>
    );
}

function BoardColumn({
    title,
    count,
    tone,
    children,
    onDragOver,
    onDrop,
}: {
    title: string;
    count: number;
    tone: 'blue' | 'green';
    children: React.ReactNode;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}) {
    const toneClasses = tone === 'blue' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200';

    return (
        <div className={`min-h-[400px] rounded-lg border p-3 ${toneClasses}`} onDragOver={onDragOver} onDrop={onDrop}>
            <div className="mb-3 flex items-center gap-2">
                <h3 className="text-base font-semibold">{title}</h3>
                <Badge variant="outline">{count}</Badge>
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

const getStatusBadge = (status: string) => {
    if (status === 'processed') {
        return (
            <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="mr-1 h-3 w-3" />
                Processed
            </Badge>
        );
    }
    return (
        <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="mr-1 h-3 w-3" />
            Pending
        </Badge>
    );
};

function ResumeCard({
    item,
    onProcess,
    canProcess = false,
    onDragStart,
    onDragEnd,
    onEdit,
    onViewPDF,
    onSendEmail,
}: {
    item: ResumeToWorkRequest;
    onProcess?: (id: string) => void;
    canProcess?: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onEdit?: (item: ResumeToWorkRequest) => void;
    onViewPDF?: (item: ResumeToWorkRequest) => void;
    onSendEmail?: (item: ResumeToWorkRequest) => void;
}) {
    const {
        id,
        employee_name,
        employee_id,
        employee_id_number,
        department,
        position,
        return_date,
        previous_absence_reference,
        comments,
        status,
        processed_by,
        processed_at,
        supervisor_notified,
        supervisor_notified_at,
        created_at,
    } = item;

    return (
        <Card
            draggable
            onDragStart={(e) => onDragStart(e, id)}
            onDragEnd={onDragEnd}
            className="border-main/40 cursor-grab shadow-sm transition hover:shadow-md"
        >
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <div className="border-main flex h-10 w-10 items-center justify-center rounded-full border-2 bg-muted">
                        <User className="text-main h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <CardTitle className="text-base">{employee_name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 text-xs">
                            <UserCheck className="h-3.5 w-3.5" /> {department} • {position}
                        </CardDescription>
                        <CardDescription className="text-xs text-gray-500">ID: {employee_id_number || employee_id}</CardDescription>
                    </div>
                    {getStatusBadge(status)}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" /> Return Date: {format(new Date(return_date), 'MMM dd, yyyy')}
                    </div>
                </div>
                <div className="text-xstext-muted-foreground">Submitted {format(new Date(created_at), 'MMM dd, yyyy HH:mm')}</div>

                {previous_absence_reference && (
                    <div className="rounded-md bg-muted/40 p-2 text-sm">
                        <span className="font-semibold">Previous Absence: </span>
                        {previous_absence_reference}
                    </div>
                )}

                {comments && (
                    <div className="rounded-md bg-muted/40 p-2 text-sm">
                        <span className="font-semibold">Comments: </span>
                        {comments}
                    </div>
                )}

                {status === 'processed' && (
                    <div className="space-y-1 text-xs text-muted-foreground">
                        <div>Processed by: {processed_by || 'N/A'}</div>
                        <div>Processed at: {processed_at ? format(new Date(processed_at), 'MMM dd, yyyy HH:mm') : 'N/A'}</div>
                        <div>Supervisor notified: {supervisor_notified ? 'Yes' : 'No'}</div>
                        {supervisor_notified_at && <div>Notified at: {format(new Date(supervisor_notified_at), 'MMM dd, yyyy HH:mm')}</div>}
                    </div>
                )}

                <div className="z-50 flex flex-wrap gap-2 pt-1 bg-red-500">
                    {status === 'pending' && canProcess && (
                        <Button
                            variant="outline"
                            className="flex-1 border-green-400 text-green-700 bg-green-500"
                            onClick={() => onProcess?.(id)}
                        >
                            <CheckCircle className="mr-1 h-4 w-4" /> Process
                        </Button>
                    )}
                    {onEdit && status === 'pending' && (
                        <Button
                            variant="outline"
                            className="border-blue-400 text-blue-700 hover:bg-blue-50"
                            onClick={() => onEdit(item)}
                            size="sm"
                            title="Edit request"
                        >
                            <Pencil className="h-4 w-4" />
                        </Button>
                    )}
                    {onViewPDF && (
                        <Button
                            variant="outline"
                            className="border-purple-400 text-purple-700 hover:bg-purple-50"
                            onClick={() => onViewPDF(item)}
                            size="sm"
                            title="View PDF"
                        >
                            <FileText className="h-4 w-4" />
                        </Button>
                    )}
                    {onSendEmail && (
                        <Button
                            variant="outline"
                            className="border-orange-400 text-orange-700 hover:bg-orange-50"
                            onClick={() => onSendEmail(item)}
                            size="sm"
                            title="Send Email"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
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
