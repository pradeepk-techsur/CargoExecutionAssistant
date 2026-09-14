// Temporary Task-1 mount so `npm run build:web` produces a bundle before the
// full shell lands in Task 2. Task 2 replaces this file entirely with the real
// bootstrap (session check → AnnounceProvider → RouterProvider).
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const rootEl = document.getElementById('root');
if (rootEl !== null) {
  createRoot(rootEl).render(
    <StrictMode>
      <p>CargoExec</p>
    </StrictMode>,
  );
}
