import { AppSidebar } from '@/components/app-sidebar';
import { Main } from '@/components/customize/main';
import SidebarHoverZone from '@/components/sidebar-hover-zone';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useSidebarHover } from '@/hooks/use-sidebar-hover';
import { type BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { Calendar, CheckCircle, Clock, Plus, User, UserCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';
import AddResumeModal from './components/add-resume-modal';

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

interface ResumeToWorkRequest {
    id: string;
    employee_name: string;
    employee_id: string;
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
    resumeRequests: ResumeToWorkRequest[];
    employees: Employee[];
    userRole: {
        is_supervisor: boolean;
        is_super_admin: boolean;
        supervised_departments: string[];
    };
}

export default function ResumeToWorkIndex({ resumeRequests = [], employees = [], userRole }: Props) {
    const [requests, setRequests] = useState<ResumeToWorkRequest[]>(resumeRequests);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processed'>('all');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const { auth } = usePage().props as any;

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

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return requests.filter((r) => {
            const matchQ = !q || `${r.employee_name} ${r.department}`.toLowerCase().includes(q);
            const matchStatus = statusFilter === 'all' || r.status === statusFilter;
            return matchQ && matchStatus;
        });
    }, [requests, search, statusFilter]);

    const grouped = useMemo(() => {
        return {
            pending: filtered.filter((r) => r.status === 'pending'),
            processed: filtered.filter((r) => r.status === 'processed'),
        };
    }, [filtered]);

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
                                <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | 'pending' | 'processed')}>
                                    <SelectTrigger className="h-10 w-40">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                        <SelectItem value="processed">Processed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Add Request
                            </Button>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
                            <BoardColumn
                                title="Pending Processing"
                                count={grouped.pending.length}
                                tone="blue"
                                onDrop={(e) => onDropToColumn(e, 'pending')}
                                onDragOver={onDragOverColumn}
                            >
                                {grouped.pending.map((item) => (
                                    <ResumeCard
                                        key={item.id}
                                        item={item}
                                        onProcess={processRequest}
                                        canProcess={userRole.is_super_admin}
                                        onDragStart={onDragStart}
                                        onDragEnd={onDragEnd}
                                    />
                                ))}
                            </BoardColumn>

                            <BoardColumn
                                title="Processed"
                                count={grouped.processed.length}
                                tone="green"
                                onDrop={(e) => onDropToColumn(e, 'processed')}
                                onDragOver={onDragOverColumn}
                            >
                                {grouped.processed.map((item) => (
                                    <ResumeCard key={item.id} item={item} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                                ))}
                            </BoardColumn>
                        </div>

                        {/* Add Resume Modal */}
                        <AddResumeModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} employees={employees} />
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
}: {
    item: ResumeToWorkRequest;
    onProcess?: (id: string) => void;
    canProcess?: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
}) {
    const {
        id,
        employee_name,
        employee_id,
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
                        <CardDescription className="text-xs text-gray-500">ID: {employee_id}</CardDescription>
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
                <div className="text-xs text-muted-foreground">Submitted {format(new Date(created_at), 'MMM dd, yyyy HH:mm')}</div>

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

                {status === 'pending' && canProcess && (
                    <div className="flex gap-2 pt-1">
                        <Button
                            variant="outline"
                            className="flex-1 border-green-400 text-green-700 hover:bg-green-50"
                            onClick={() => onProcess?.(id)}
                        >
                            <CheckCircle className="mr-1 h-4 w-4" /> Process
                        </Button>
                    </div>
                )}
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
