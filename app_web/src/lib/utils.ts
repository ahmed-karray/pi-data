export function defaultRouteForRole(role: string) {
  switch (role) {
    case 'security_analyst':
      return '/live-detection';
    case 'data_scientist':
      return '/monitoring';
    case 'administrator':
      return '/settings';
    default:
      return '/dashboard';
  }
}

export function getRoleLabel(role: string) {
  switch (role) {
    case 'security_analyst':
      return 'Analyst';
    case 'data_scientist':
      return 'Scientist';
    case 'administrator':
      return 'Admin';
    default:
      return 'User';
  }
}

export function getRoleColor(role: string) {
  switch (role) {
    case 'security_analyst':
      return 'bg-brand-500 text-white';
    case 'data_scientist':
      return 'bg-[#1565C0] text-white';
    case 'administrator':
      return 'bg-[#BA7517] text-slate-950';
    default:
      return 'bg-slate-500 text-white';
  }
}
