import React from 'react';
import useAuth from '../hooks/useAuth';
import StaffConsole from '../components/complaints/StaffConsole';

/**
 * Officer workspace. GET /api/complaints already scopes an OFFICER to their own
 * department server side, so this is the department queue without any extra
 * client-side filtering.
 */
const OfficerConsole = () => {
  const { t } = useAuth();

  return (
    <StaffConsole
      icon="engineering"
      title={t('officerConsoleTitle', 'Officer Console')}
      subtitle={t('officerConsoleSub', 'Complaints assigned to your department')}
      initialStatusFilter="ALL"
    />
  );
};

export default OfficerConsole;
