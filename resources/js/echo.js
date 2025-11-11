import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Set Pusher globally for Laravel Echo
window.Pusher = Pusher;

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

    console.log('Echo initialized successfully with Reverb');
    console.log('Echo config:', {
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY || 'your-reverb-key',
        wsHost: reverbHost,
        wsPort: reverbPort,
        forceTLS: !isLocalhost,
        enabledTransports: isLocalhost ? ['ws'] : ['ws', 'wss'],
        isLocalhost,
    });
} catch (error) {
    console.error('Failed to initialize Echo:', error);
}

// Echo is now available globally on window.Echo
