import { Separator } from '@/components/ui/separator';
import { usePage } from '@inertiajs/react';
import { BellNotification } from './customize/bell-notification';
import { ProfileDropdown } from './customize/profile-dropdown';

// Add BreadcrumbItem type import if not present
import { type BreadcrumbItem } from '@/types';
import { useEffect, useState } from 'react';
import { SidebarTrigger } from './ui/sidebar';

interface Props {
    title: string;
    breadcrumbs?: BreadcrumbItem[];
}

export function SiteHeader({ title, breadcrumbs }: Props) {
    const { notifications = [], unreadNotificationCount = 0, employee, auth } = usePage().props as any;
    const [unreadCount, setUnreadCount] = useState<number>(unreadNotificationCount);
    const [notificationList, setNotificationList] = useState<any[]>(notifications);

    // Get current user info
    const currentUser = auth?.user;
    const isSupervisor = currentUser?.isSupervisor;
    const isSuperAdmin = currentUser?.isSuperAdmin;

    useEffect(() => {
        // Listen on user-specific notification channels
        const echo: any = (window as any).Echo;
        if (!echo) {
            console.error('Echo not found in window object');
            return;
        }

        console.log('Setting up Echo listeners for user-specific notifications');

        // Check Echo connection state
        const connector = echo.connector;
        if (!connector || !connector.pusher || !connector.pusher.connection) {
            console.error('[Bell Notification] Echo connector not available');
            return;
        }

        const connection = connector.pusher.connection;
        const currentState = connection.state;
        console.log('[Bell Notification] Echo connection state:', currentState);

        // Store channel reference for cleanup
        let notificationChannel: any = null;

        // Function to set up channel subscription and listeners
        const setupChannelSubscription = () => {
            // Use supervisor-specific channel or general notifications channel based on user role
            const channelName = isSupervisor && currentUser?.id ? `supervisor.${currentUser.id}` : 'notifications';
            const isPrivate = isSupervisor && currentUser?.id;
            notificationChannel = isPrivate ? echo.private(channelName) : echo.channel(channelName);

            console.log(`[Bell Notification] Attempting to subscribe to ${isPrivate ? 'private' : 'public'} channel:`, channelName);

            // Test connection with timeout
            const subscriptionTimeout = setTimeout(() => {
                console.warn('[Bell Notification] Subscription timeout: Channel subscription took too long.');
                console.warn('[Bell Notification] Current connection state:', connection.state);
            }, 10000); // Increased to 10 seconds

            notificationChannel.subscribed(() => {
                clearTimeout(subscriptionTimeout);
                console.log('[Bell Notification] ✅ Successfully subscribed to notification channel:', channelName);
                console.log('[Bell Notification] User info:', {
                    isSupervisor,
                    isSuperAdmin,
                    userId: currentUser?.id,
                    userName: currentUser?.name,
                });
            });

            notificationChannel.error((error: any) => {
                clearTimeout(subscriptionTimeout);
                console.error('[Bell Notification] ❌ Error with notification channel:', error);
                console.error('[Bell Notification] Error details:', JSON.stringify(error, null, 2));
                if (error.status === 403) {
                    console.error('[Bell Notification] Authentication failed. Check if user is properly authenticated.');
                }
            });

            // Set up event listeners
            notificationChannel
                .listen('.LeaveRequested', (e: any) => {
                    console.log('[Bell Notification] Received LeaveRequested event:', e);
                    console.log('[Bell Notification] Event payload:', JSON.stringify(e, null, 2));
                    // Handle both flat and nested structures
                    const leaveData = e.leave || e;

                    // Check if notification already exists to avoid duplicates
                    const existingId = leaveData.leave_id || leaveData.id;
                    setNotificationList((prev) => {
                        const exists = prev.some((n) => n.data?.leave_id === existingId);
                        if (exists) {
                            console.log('Leave notification already exists, skipping');
                            return prev;
                        }

                        const newNotification = {
                            id: Date.now(), // Temporary ID
                            type: 'leave_request',
                            data: {
                                leave_id: leaveData.leave_id || leaveData.id,
                                employee_name: leaveData.employee_name || 'Employee',
                                leave_type: leaveData.leave_type,
                                leave_start_date: leaveData.leave_start_date,
                                leave_end_date: leaveData.leave_end_date,
                                department: leaveData.department,
                            },
                            read_at: null,
                            created_at: new Date().toISOString(),
                        };

                        setUnreadCount((prev) => prev + 1);
                        return [newNotification, ...prev];
                    });
                })
                .listen('.AbsenceRequested', (e: any) => {
                    console.log('[Bell Notification] Received AbsenceRequested event:', e);
                    console.log('[Bell Notification] Event payload:', JSON.stringify(e, null, 2));
                    // Handle both flat and nested structures
                    const absenceData = e.absence || e;

                    // Check if notification already exists to avoid duplicates
                    const existingId = absenceData.absence_id || absenceData.id;
                    setNotificationList((prev) => {
                        const exists = prev.some((n) => n.data?.absence_id === existingId);
                        if (exists) {
                            console.log('Absence notification already exists, skipping');
                            return prev;
                        }

                        const newNotification = {
                            id: Date.now(), // Temporary ID
                            type: 'absence_request',
                            data: {
                                absence_id: absenceData.absence_id || absenceData.id,
                                employee_name: absenceData.employee_name || absenceData.full_name || 'Employee',
                                absence_type: absenceData.absence_type,
                                from_date: absenceData.from_date,
                                to_date: absenceData.to_date,
                                department: absenceData.department,
                            },
                            read_at: null,
                            created_at: new Date().toISOString(),
                        };

                        setUnreadCount((prev) => prev + 1);
                        return [newNotification, ...prev];
                    });
                })
                .listen('.ReturnWorkRequested', (e: any) => {
                    console.log('[Bell Notification] Received ReturnWorkRequested event:', e);
                    console.log('[Bell Notification] Event payload:', JSON.stringify(e, null, 2));
                    // Handle flat structure (ReturnWorkRequested broadcasts flat payload)
                    const returnWorkData = e;

                    // Check if notification already exists to avoid duplicates
                    const existingId = returnWorkData.return_work_id;
                    setNotificationList((prev) => {
                        const exists = prev.some((n) => n.data?.return_work_id === existingId || n.data?.resume_id === existingId);
                        if (exists) {
                            console.log('Return work notification already exists, skipping');
                            return prev;
                        }

                        const newNotification = {
                            id: Date.now(), // Temporary ID
                            type: 'resume_to_work', // Match the type expected by bell-notification component
                            data: {
                                resume_id: returnWorkData.return_work_id, // Map to resume_id for bell component
                                return_work_id: returnWorkData.return_work_id,
                                employee_name: returnWorkData.employee_name || 'Employee',
                                employee_id_number: returnWorkData.employee_id_number,
                                department: returnWorkData.department,
                                return_date: returnWorkData.return_date,
                                absence_type: returnWorkData.absence_type,
                                reason: returnWorkData.reason,
                            },
                            read_at: null,
                            created_at: new Date().toISOString(),
                        };

                        setUnreadCount((prev) => prev + 1);
                        return [newNotification, ...prev];
                    });
                });
        };

        // Wait for connection if not already connected
        if (currentState === 'connected') {
            console.log('[Bell Notification] Connection already established, subscribing immediately');
            setupChannelSubscription();
        } else if (currentState === 'connecting') {
            console.log('[Bell Notification] Connection in progress, waiting for connection...');
            connection.bind('connected', () => {
                console.log('[Bell Notification] Connection established, now subscribing to channels');
                setupChannelSubscription();
            });
        } else {
            console.warn('[Bell Notification] Connection state is:', currentState);
            console.warn('[Bell Notification] Attempting to connect...');

            // Try to connect
            connection.connect();

            // Wait for connection
            connection.bind('connected', () => {
                console.log('[Bell Notification] Connection established, now subscribing to channels');
                setupChannelSubscription();
            });

            connection.bind('error', (error: any) => {
                console.error('[Bell Notification] Connection error:', error);
            });
        }

        return () => {
            console.log('[Bell Notification] Cleaning up Echo listeners');
            if (notificationChannel) {
                try {
                    notificationChannel.stopListening('.LeaveRequested');
                    notificationChannel.stopListening('.AbsenceRequested');
                    notificationChannel.stopListening('.ReturnWorkRequested');
                } catch (e) {
                    console.warn('[Bell Notification] Error stopping listeners:', e);
                }
            }
            if (isSupervisor && currentUser?.id) {
                try {
                    echo.leave(`supervisor.${currentUser.id}`);
                } catch (e) {
                    console.warn('[Bell Notification] Error leaving supervisor channel:', e);
                }
            } else {
                try {
                    echo.leave('notifications');
                } catch (e) {
                    console.warn('[Bell Notification] Error leaving notifications channel:', e);
                }
            }
        };
    }, [currentUser?.id, isSupervisor]);

    return (
        <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
            <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
                <div className="flex flex-1 flex-col">
                    {/* Breadcrumbs */}
                    {breadcrumbs && breadcrumbs.length > 0 && (
                        <nav className="mb-1 text-base font-medium text-muted-foreground">
                            {breadcrumbs.map((crumb, idx) => (
                                <span key={crumb.href}>
                                    <a href={crumb.href} className="hover:underline">
                                        {crumb.title}
                                    </a>
                                    {idx < breadcrumbs.length - 1 && ' / '}
                                </span>
                            ))}
                        </nav>
                    )}
                    <h1 className="text-base font-medium">{title}</h1>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <div className="mr-auto flex items-center space-x-4">
                        {/* <ModeToggle/> */}
                        <BellNotification notifications={notificationList} unreadCount={unreadCount} />
                        <ProfileDropdown />
                    </div>
                </div>
            </div>
        </header>
    );
}
