import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Add type declaration for global Pusher and Echo
declare global {
    interface Window {
        Echo: any;
        Pusher: typeof Pusher;
    }
}

// Make Pusher available globally (required for Echo to work with Reverb)
// Reverb uses the Pusher protocol, so we need pusher-js library
window.Pusher = Pusher;

// CSRF token helper
const getCSRFToken = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

// Determine host configuration
const configuredHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
const reverbPort = Number(import.meta.env.VITE_REVERB_PORT) || 8080;
const isLocalhost =
    configuredHost === 'localhost' || configuredHost === '127.0.0.1' || configuredHost.startsWith('192.168.') || configuredHost.startsWith('10.');

const reverbHost = isLocalhost ? '127.0.0.1' : configuredHost;

console.log('[Echo Config] Configuring Laravel Echo with Reverb...', {
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: reverbHost,
    wsPort: reverbPort,
    forceTLS: !isLocalhost,
});

// Initialize Echo
window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: reverbHost,
    wsPort: reverbPort,
    wssPort: reverbPort,
    forceTLS: !isLocalhost,
    enabledTransports: isLocalhost ? ['ws'] : ['ws', 'wss'],
    disableStats: true,
    authEndpoint: '/broadcasting/auth',
    auth: {
        headers: {
            'X-CSRF-TOKEN': getCSRFToken(),
            'X-Requested-With': 'XMLHttpRequest',
            Accept: 'application/json',
        },
    },
});

console.log('[Echo Config] ✅ Echo configured successfully with Reverb');
console.log('[Echo Config] window.Echo is now available:', !!window.Echo);
console.log('[Echo Config] Connection state:', window.Echo.connector?.connection?.state || 'unknown');
