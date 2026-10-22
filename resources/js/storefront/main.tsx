import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import '../../css/storefront.css';
import { createRouter } from './routes';

createRoot(document.getElementById('app')!).render(
    <StrictMode>
        <RouterProvider router={createRouter()} />
    </StrictMode>,
);
