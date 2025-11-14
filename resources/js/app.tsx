import '../css/app.css';
import { toast, Toaster } from 'sonner';
import { createInertiaApp } from '@inertiajs/react';
import Echo from 'laravel-echo';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import Pusher from 'pusher-js';
import { createRoot } from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import { configureEcho } from '@laravel/echo-react';

configureEcho({
    broadcaster: 'reverb',
});

// Make Pusher available globally
window.Pusher = Pusher;

// Get CSRF token for authentication
const getCSRFToken = () => {
    const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    if (!token) {
        console.warn('[Echo Config] CSRF token not found, broadcasting authentication may fail');
    }
    return token || '';
};

// Determine host configuration
const configuredHost = import.meta.env.VITE_REVERB_HOST || window.location.hostname;
const reverbPort = import.meta.env.VITE_REVERB_PORT || 8080;
const isLocalhost =
    configuredHost === 'localhost' || configuredHost === '127.0.0.1' || configuredHost.startsWith('192.168.') || configuredHost.startsWith('10.0.');

const reverbHost = isLocalhost ? '127.0.0.1' : configuredHost;

// Configure Echo with Laravel Reverb
console.log('[Echo Config] Configuring Laravel Echo with Reverb...', {
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'your-reverb-key',
    wsHost: reverbHost,
    wsPort: reverbPort,
    forceTLS: !isLocalhost,
    isLocalhost,
});

// Initialize Echo with Reverb
window.Echo = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || 'your-reverb-key',
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
console.log('[Echo Config] Connection state:', window.Echo.connector?.pusher?.connection?.state || 'unknown');

const appName = import.meta.env.VITE_APP_NAME || 'CFARBEMCO';

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(  <>
                <App {...props} />
                <Toaster position="top-center" richColors swipeDirections={['right']} />
            </>);
    },
    progress: {
        color: '#F8FFE5',
    },
});

// This will set light / dark mode on load...
initializeTheme();
