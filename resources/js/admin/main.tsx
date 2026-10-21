import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import '../../css/admin.css';
import { createAdminRouter } from './routes';
import { loadSession } from './session';

// Start checking the session before React renders anything.
void loadSession();

createRoot(document.getElementById('app')!).render(
    <StrictMode>
        <RouterProvider router={createAdminRouter()} />
    </StrictMode>,
);
