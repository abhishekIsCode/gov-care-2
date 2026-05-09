/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthProvider } from './hooks/useAuth';
import HealthPortal from './components/HealthPortal';

export default function App() {
  return (
    <AuthProvider>
      <HealthPortal />
    </AuthProvider>
  );
}
