import React from 'react';
import { ToastProvider } from './ToastContext';
import { AuthProvider } from './AuthContext';
import { AccountsProvider } from './AccountsContext';
import { FilesProvider } from './FilesContext';
import { TransfersProvider } from './TransfersContext';
import { CodeProjectsProvider } from './CodeProjectsContext';

export default function AppProviders({ children }) {
  return (
    <ToastProvider>
      <AuthProvider>
        <AccountsProvider>
          <TransfersProvider>
            <FilesProvider>
              <CodeProjectsProvider>
                {children}
              </CodeProjectsProvider>
            </FilesProvider>
          </TransfersProvider>
        </AccountsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}
