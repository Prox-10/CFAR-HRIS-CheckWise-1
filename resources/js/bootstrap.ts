import Echo from 'laravel-echo';

// Get CSRF token more reliably
const getCSRFToken = () => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (!token) {
        console.warn('CSRF token not found, broadcasting authentication may fail');
    }
    return token || '';
};

// Initialize Echo with Reverb
try {
    const reverbHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
    const reverbPort = import.meta.env.VITE_REVERB_PORT || 8080;
    const isLocalhost =
        reverbHost === 'localhost' || reverbHost === '127.0.0.1' || reverbHost.startsWith('192.168.') || reverbHost.startsWith('10.0.');

    window.Echo = new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY || 'your-reverb-key',
        wsHost: reverbHost,
        wsPort: reverbPort,
        wssPort: reverbPort,
        forceTLS: !isLocalhost, // Force TLS only for non-localhost connections
        enabledTransports: isLocalhost ? ['ws'] : ['ws', 'wss'], // Only use ws:// for localhost
        disableStats: true,
        authEndpoint: '/broadcasting/auth',
        withCredentials: true,
        auth: {
            headers: {
                'X-CSRF-TOKEN': getCSRFToken(),
                'X-Requested-With': 'XMLHttpRequest',
                Accept: 'application/json',
            },
        },
    });

    console.log('[Echo Bootstrap] Initialized successfully with Reverb');
    console.log('[Echo Bootstrap] Config:', {
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY || 'your-reverb-key',
        wsHost: reverbHost,
        wsPort: reverbPort,
        forceTLS: !isLocalhost,
        enabledTransports: isLocalhost ? ['ws'] : ['ws', 'wss'],
        isLocalhost,
        authEndpoint: '/broadcasting/auth',
    });

    // Monitor connection state
    const connector = window.Echo.connector;
    if (connector && connector.pusher && connector.pusher.connection) {
        connector.pusher.connection.bind('connected', () => {
            console.log('[Echo Bootstrap] Connection established');
        });

        connector.pusher.connection.bind('disconnected', () => {
            console.warn('[Echo Bootstrap] Connection disconnected');
        });

        connector.pusher.connection.bind('error', (error: any) => {
            console.error('[Echo Bootstrap] Connection error:', error);
        });

        connector.pusher.connection.bind('state_change', (states: any) => {
            console.log('[Echo Bootstrap] Connection state changed:', states.previous, '->', states.current);
        });

        // Log initial state
        console.log('[Echo Bootstrap] Initial connection state:', connector.pusher.connection.state);
    }
} catch (error) {
    console.error('Failed to initialize Echo:', error);
}

// Add type declaration for global Echo
declare global {
    interface Window {
        Echo: Echo;
    }
}
