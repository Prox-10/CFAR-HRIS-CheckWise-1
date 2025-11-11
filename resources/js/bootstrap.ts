/**
 * Bootstrap file - No longer initializes Echo
 * Echo is now configured in app.tsx using @laravel/echo-react
 * This file is kept for type declarations and potential future bootstrap needs
 */

import Pusher from 'pusher-js';

// Add type declaration for global Pusher and Echo (as any to avoid type conflicts)
declare global {
    interface Window {
        Echo: any;
        Pusher: typeof Pusher;
    }
}
