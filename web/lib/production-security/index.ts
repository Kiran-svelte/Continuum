export { getClientIpFromRequest } from './client-ip';
export { scanRequestForThreats, type ThreatMatch } from './threat-detection';
export {
  isBlockedIp,
  isBlockedIpAsync,
  blockIpTemporarily,
  clearBlockedIpsForTests,
} from './blocked-ips';
export { isPasswordBreached, type BreachCheckResult } from './hibp';
export { recordFailedLoginAttempt, resetFailedLoginStateForTests } from './failed-login-alerts';
export { getProductionSecurityHeaders } from './security-headers';
