import React from 'react';
import useAuth from '../hooks/useAuth';
import StaffConsole from '../components/complaints/StaffConsole';

/**
 * Senior Authority workspace. The backend gives SENIOR_AUTHORITY visibility of
 * every complaint, so the queue opens on the escalated ones and floats
 * high/critical priority to the top.
 */
const AuthorityConsole = () => {
  const { t } = useAuth();

  return (
    <StaffConsole
      icon="gavel"
      title={t('authorityConsoleTitle', 'Senior Authority Console')}
      subtitle={t('authorityConsoleSub', 'Escalated and high-priority grievances')}
      initialStatusFilter="ESCALATED"
      emphasisePriorities={['CRITICAL', 'HIGH']}
    />
  );
};

export default AuthorityConsole;
