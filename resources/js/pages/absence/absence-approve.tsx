import { AppSidebar } from '@/components/app-sidebar';
import { Main } from '@/components/customize/main';
import SidebarHoverZone from '@/components/sidebar-hover-zone';
import { SiteHeader } from '@/components/site-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, useSidebar } from '@/components/ui/sidebar';
import { useSidebarHover } from '@/hooks/use-sidebar-hover';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { format } from 'date-fns';
import { ArrowLeft, Calendar, Check, Clock, UserRound, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster, toast } from 'sonner';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Absence Approvals',
        href: '/absence/absence-approve',
    },
];

export type AbsenceType = 'Annual Leave' | 'Sick Leave' | 'Emergency Leave' | 'Maternity/Paternity' | 'Personal Leave' | 'Other';

export type AbsenceStatus = 'pending' | 'approved' | 'rejected';

interface AbsenceRequestItem {
    id: string;
    full_name: string;
    employee_id_number: string;
    department: string;
    position: string;
    absence_type: AbsenceType;
    from_date: string;
    to_date: string;
    submitted_at: string;
    days: number;
    reason: string;
    is_partial_day: boolean;
    status: AbsenceStatus;
    picture?: string;
    employee_name?: string;
}

const absenceTypesForFilter: Array<AbsenceType | 'All'> = [
    'All',
    'Annual Leave',
    'Sick Leave',
    'Emergency Leave',
    'Maternity/Paternity',
    'Personal Leave',
    'Other',
];

interface Props {
    initialRequests: AbsenceRequestItem[];
    user_permissions?: {
        is_supervisor: boolean;
        is_super_admin: boolean;
        supervised_departments: string[];
    };
}

export default function AbsenceApprove({ initialRequests = [], user_permissions }: Props) {
    const [requests, setRequests] = useState<AbsenceRequestItem[]>(initialRequests);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<AbsenceType | 'All'>('All');
    const { props } = usePage<{ initialRequests?: AbsenceRequestItem[] }>();

    // Update local state when server data changes
    useEffect(() => {
        if (props.initialRequests && Array.isArray(props.initialRequests)) {
            setRequests(props.initialRequests);
        }
    }, [props.initialRequests]);

    // Realtime updates via Echo (admin view)
    useEffect(() => {
        const echo: any = (window as any).Echo;
        if (!echo) {
            console.warn('Echo not available for real-time updates');
            return;
        }

        console.log('Setting up real-time listeners for absence requests');
        console.log('Echo instance:', echo);
        console.log('Echo config:', {
            broadcaster: echo.options.broadcaster,
            key: echo.options.key,
            wsHost: echo.options.wsHost,
            wsPort: echo.options.wsPort,
        });

        // Test Echo connection (works for both Pusher and Reverb)
        const connector = echo.connector;
        if (connector) {
            // For Reverb, check if there's a connection object
            if (connector.pusher && connector.pusher.connection) {
                connector.pusher.connection.bind('connected', () => {
                    console.log('Echo connected successfully');
                });

                connector.pusher.connection.bind('disconnected', () => {
                    console.log('Echo disconnected');
                });

                connector.pusher.connection.bind('error', (error: any) => {
                    console.error('Echo connection error:', error);
                });

                // Check current connection state
                const state = connector.pusher.connection.state;
                console.log('Current Echo connection state:', state);
            } else {
                console.warn('Echo connector structure not recognized. Reverb server may not be running.');
            }
        }

        // Listen on notifications channel for general absence requests
        const notificationsChannel = echo.channel('notifications');
        console.log('Subscribing to notifications channel');

        // Add subscription callbacks
        notificationsChannel.subscribed(() => {
            console.log('Successfully subscribed to notifications channel');
        });

        notificationsChannel.error((error: any) => {
            console.error('Error subscribing to notifications channel:', error);
        });

        notificationsChannel
            .listen('.AbsenceRequested', (e: any) => {
                console.log('Received AbsenceRequested event on notifications channel:', e);
                if (e && e.absence) {
                    const newAbsence: AbsenceRequestItem = {
                        id: String(e.absence.id),
                        full_name: e.absence.full_name || e.absence.employee_name || 'Employee',
                        employee_id_number: e.absence.employee_id_number || '',
                        department: e.absence.department || '',
                        position: e.absence.position || '',
                        absence_type: e.absence.absence_type,
                        from_date: e.absence.from_date,
                        to_date: e.absence.to_date,
                        submitted_at: e.absence.submitted_at || new Date().toISOString(),
                        days: e.absence.days || 1,
                        reason: e.absence.reason || '',
                        is_partial_day: !!e.absence.is_partial_day,
                        status: e.absence.status || 'pending',
                        picture: e.absence.picture || '',
                        employee_name: e.absence.employee_name || '',
                    };

                    // Check if this absence already exists to avoid duplicates
                    setRequests((prev) => {
                        const exists = prev.some((r) => r.id === newAbsence.id);
                        if (exists) {
                            console.log('Absence already exists, not adding duplicate');
                            return prev;
                        }
                        console.log('Adding new absence request to list');
                        return [newAbsence, ...prev];
                    });

                    // Show toast notification
                    toast.success(`New absence request from ${newAbsence.full_name}`);
                }
            })
            .listen('.RequestStatusUpdated', (e: any) => {
                console.log('Received RequestStatusUpdated event:', e);
                if (String(e.type || '') !== 'absence_status') return;
                setRequests((prev) => prev.map((r) => (String(r.id) === String(e.request_id) ? { ...r, status: e.status } : r)));
            });

        // Also listen on private supervisor channel if user is supervisor
        if (user_permissions && user_permissions.is_supervisor) {
            // Get current user ID from the page props or auth
            const currentUserId = (window as any).user?.id || (window as any).auth?.user?.id;
            if (currentUserId) {
                console.log('Setting up supervisor channel for user:', currentUserId);
                const supervisorChannel = echo.private(`supervisor.${currentUserId}`);

                supervisorChannel.subscribed(() => {
                    console.log('Successfully subscribed to supervisor channel');
                });

                supervisorChannel.error((error: any) => {
                    console.error('Error subscribing to supervisor channel:', error);
                });

                supervisorChannel.listen('.AbsenceRequested', (e: any) => {
                    console.log('Received AbsenceRequested on supervisor channel:', e);
                    if (e && e.absence) {
                        const newAbsence: AbsenceRequestItem = {
                            id: String(e.absence.id),
                            full_name: e.absence.full_name || e.absence.employee_name || 'Employee',
                            employee_id_number: e.absence.employee_id_number || '',
                            department: e.absence.department || '',
                            position: e.absence.position || '',
                            absence_type: e.absence.absence_type,
                            from_date: e.absence.from_date,
                            to_date: e.absence.to_date,
                            submitted_at: e.absence.submitted_at || new Date().toISOString(),
                            days: e.absence.days || 1,
                            reason: e.absence.reason || '',
                            is_partial_day: !!e.absence.is_partial_day,
                            status: e.absence.status || 'pending',
                            picture: e.absence.picture || '',
                            employee_name: e.absence.employee_name || '',
                        };

                        setRequests((prev) => {
                            const exists = prev.some((r) => r.id === newAbsence.id);
                            if (exists) {
                                console.log('Absence already exists, not adding duplicate');
                                return prev;
                            }
                            console.log('Adding new absence request to supervisor list');
                            return [newAbsence, ...prev];
                        });

                        toast.success(`New absence request from ${newAbsence.full_name}`);
                    }
                });
            }
        }

        return () => {
            console.log('Cleaning up Echo listeners');
            notificationsChannel.stopListening('.AbsenceRequested');
            notificationsChannel.stopListening('.RequestStatusUpdated');
            if (user_permissions && user_permissions.is_supervisor) {
                const currentUserId = (window as any).user?.id || (window as any).auth?.user?.id;
                if (currentUserId) {
                    const supervisorChannel = echo.private(`supervisor.${currentUserId}`);
                    supervisorChannel.stopListening('.AbsenceRequested');
                }
            }
        };
    }, []);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return requests.filter((r) => {
            const matchQ = !q || `${r.full_name} ${r.department}`.toLowerCase().includes(q);
            const matchType = typeFilter === 'All' || r.absence_type === typeFilter;
            return matchQ && matchType;
        });
    }, [requests, search, typeFilter]);

    const grouped = useMemo(() => {
        return {
            pending: filtered.filter((r) => r.status === 'pending'),
            approved: filtered.filter((r) => r.status === 'approved'),
            rejected: filtered.filter((r) => r.status === 'rejected'),
        } as Record<AbsenceStatus, AbsenceRequestItem[]>;
    }, [filtered]);

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

    const onDropToColumn = (e: React.DragEvent, newStatus: AbsenceStatus) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('text/plain');
        if (!id) return;

        // Reset opacity for all dragged elements
        const draggedElements = document.querySelectorAll('[draggable="true"]');
        draggedElements.forEach((el) => {
            (el as HTMLElement).style.opacity = '1';
        });

        updateAbsenceStatus(id, newStatus);
    };

    const onDragEnd = (e: React.DragEvent) => {
        // Reset opacity when drag ends
        (e.currentTarget as HTMLElement).style.opacity = '1';
    };

    const updateAbsenceStatus = useCallback(
        (id: string, status: AbsenceStatus) => {
            // Store the original status in case we need to revert
            const originalStatus = requests.find((r) => r.id === id)?.status;

            // Update local state immediately for UI responsiveness (optimistic update)
            setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

            // Make API call using Inertia router
            router.patch(
                route('absence.updateStatus', { absence: id }),
                { status },
                {
                    onSuccess: () => {
                        toast.success(`Absence request ${status} successfully!`);
                    },
                    onError: () => {
                        // Revert local state on error
                        if (originalStatus) {
                            setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: originalStatus } : r)));
                        }
                        toast.error('Failed to update absence status. Please try again.');
                    },
                    preserveScroll: true,
                },
            );
        },
        [requests],
    );

    const approve = (id: string) => updateAbsenceStatus(id, 'approved');
    const reject = (id: string) => updateAbsenceStatus(id, 'rejected');

    return (
        <SidebarProvider>
            <Head title="Absence Approvals" />
            <Toaster position="top-center" richColors />
            <SidebarHoverLogic>
                <SidebarInset>
                    <SiteHeader breadcrumbs={breadcrumbs} title={''} />
                    <Main fixed>
                        <div className="flex items-center gap-3 p-4">
                            <div className="relative flex-1">
                                <Input
                                    placeholder="Search by employee name or department..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="h-10"
                                />
                            </div>
                            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AbsenceType | 'All')}>
                                <SelectTrigger className="h-10 w-40">
                                    <SelectValue placeholder="All Types" />
                                </SelectTrigger>
                                <SelectContent>
                                    {absenceTypesForFilter.map((t) => (
                                        <SelectItem key={t} value={t}>
                                            {t}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
                            <BoardColumn
                                title="Pending Review"
                                count={grouped.pending.length}
                                tone="blue"
                                onDrop={(e) => onDropToColumn(e, 'pending')}
                                onDragOver={onDragOverColumn}
                            >
                                {grouped.pending.map((item) => (
                                    <AbsenceCard
                                        key={`${item.id}-${item.status}`}
                                        item={item}
                                        onDragStart={onDragStart}
                                        onDragEnd={onDragEnd}
                                        onApprove={approve}
                                        onReject={reject}
                                    />
                                ))}
                            </BoardColumn>

                            <BoardColumn
                                title="Approved"
                                count={grouped.approved.length}
                                tone="green"
                                onDrop={(e) => onDropToColumn(e, 'approved')}
                                onDragOver={onDragOverColumn}
                            >
                                {grouped.approved.map((item) => (
                                    <AbsenceCard key={`${item.id}-${item.status}`} item={item} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                                ))}
                            </BoardColumn>

                            <BoardColumn
                                title="Rejected"
                                count={grouped.rejected.length}
                                tone="red"
                                onDrop={(e) => onDropToColumn(e, 'rejected')}
                                onDragOver={onDragOverColumn}
                            >
                                {grouped.rejected.map((item) => (
                                    <AbsenceCard key={`${item.id}-${item.status}`} item={item} onDragStart={onDragStart} onDragEnd={onDragEnd} />
                                ))}
                            </BoardColumn>
                        </div>
                        <CardFooter className="flex justify-start p-4">
                            <Link href={route('absence.index')}>
                                <Button variant="outline" className="flex items-center gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back
                                </Button>
                            </Link>
                        </CardFooter>
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
    tone: 'blue' | 'green' | 'red';
    children: React.ReactNode;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
}) {
    const toneClasses =
        tone === 'blue' ? 'bg-blue-50 border-blue-200' : tone === 'green' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';

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

function AbsenceCard({
    item,
    onDragStart,
    onDragEnd,
    onApprove,
    onReject,
}: {
    item: AbsenceRequestItem;
    onDragStart: (e: React.DragEvent, id: string) => void;
    onDragEnd: (e: React.DragEvent) => void;
    onApprove?: (id: string) => void;
    onReject?: (id: string) => void;
}) {
    const {
        id,
        full_name,
        employee_id_number,
        department,
        position,
        absence_type,
        from_date,
        to_date,
        submitted_at,
        days,
        reason,
        is_partial_day,
        status,
        picture,
    } = item;

    const typeTone =
        absence_type === 'Sick Leave'
            ? 'bg-yellow-100 text-yellow-800'
            : absence_type === 'Personal Leave'
              ? 'bg-blue-100 text-blue-800'
              : absence_type === 'Annual Leave'
                ? 'bg-purple-100 text-purple-800'
                : absence_type === 'Emergency Leave'
                  ? 'bg-red-100 text-red-800'
                  : absence_type === 'Maternity/Paternity'
                    ? 'bg-pink-100 text-pink-800'
                    : 'bg-gray-100 text-gray-800';

    const employeeName = full_name || item.employee_name || 'Unknown Employee';

    return (
        <Card
            draggable
            onDragStart={(e) => onDragStart(e, id)}
            onDragEnd={onDragEnd}
            className="border-main/40 cursor-grab shadow-sm transition hover:shadow-md"
        >
            <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                    <img src={picture || '/Logo.png'} alt={employeeName} className="h-10 w-10 rounded-full border object-cover" />
                    <div className="flex-1">
                        <CardTitle className="text-base">{employeeName}</CardTitle>
                        <CardDescription className="flex items-center gap-1 text-xs">
                            <UserRound className="h-3.5 w-3.5" /> {department} • {position}
                        </CardDescription>
                        <CardDescription className="text-xs text-gray-500">ID: {employee_id_number}</CardDescription>
                    </div>
                    <Badge className={`${typeTone}`}>{absence_type}</Badge>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" /> {from_date} - {to_date}
                    </div>
                    <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" /> {days} {days === 1 ? 'day' : 'days'}
                        {is_partial_day && (
                            <Badge variant="outline" className="text-xs">
                                Partial
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="text-xs text-muted-foreground">Submitted {format(new Date(submitted_at), 'MMM dd, yyyy')}</div>
                <div className="rounded-md bg-muted/40 p-2 text-sm">
                    <span className="font-semibold">Reason: </span>
                    {reason}
                </div>
                {status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                        <Button
                            variant="outline"
                            className="flex-1 border-green-400 text-green-700 hover:bg-green-50"
                            onClick={() => onApprove?.(id)}
                        >
                            <Check className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button variant="outline" className="flex-1 border-red-300 text-red-700 hover:bg-red-50" onClick={() => onReject?.(id)}>
                            <X className="mr-1 h-4 w-4" /> Reject
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
