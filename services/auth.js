// ================================================================
//  AUTH SERVICE - Optional Victim/User Accounts
//
//  Deliberately lightweight: a successful register/login returns
//  { id, email, mobile, token } and the frontend keeps that in
//  sessionStorage (see advanced_dashboard.html) - it clears when the
//  browser tab closes, which matters here since some people using this
//  tool are on a shared or unsafe device (e.g. fleeing an abuser) and
//  should never have a signed-in session persist past their visit.
//  `token` is a per-user random value (see UserStore.createUser), sent
//  back as the x-user-token header on requests like "My Cases" that need
//  to know who's asking - not a server-wide secret, so there's nothing to
//  configure on the deployment.
//
//  Password hashing uses bcryptjs (pure JS, no native build step) -
//  this needs no server configuration or environment variable, unlike
//  the earlier authority-dashboard access code, which is exactly what
//  made that hard to deploy.
// ================================================================

import bcrypt from 'bcryptjs';
import UserStore from '../utils/userStore.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Loosely validates a mobile number: optional leading +, 7-15 digits.
// Deliberately permissive rather than India-only (+91-specific), since
// rejecting a real number a caseworker needs to reach someone on is a
// worse failure mode than accepting a slightly malformed one.
const MOBILE_RE = /^\+?\d{7,15}$/;

class AuthService {
    constructor() {
        this.users = new UserStore();
    }

    async register({ email, password, mobile }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanMobile = (mobile || '').replace(/[\s-]/g, '');

        if (!EMAIL_RE.test(cleanEmail)) {
            return { success: false, status: 400, error: 'Enter a valid email address.' };
        }
        if (!MOBILE_RE.test(cleanMobile)) {
            return { success: false, status: 400, error: 'Enter a valid mobile number.' };
        }
        if (!password || password.length < 8) {
            return { success: false, status: 400, error: 'Password must be at least 8 characters.' };
        }
        if (this.users.findByEmail(cleanEmail)) {
            return { success: false, status: 409, error: 'An account with this email already exists.' };
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = this.users.createUser({ email: cleanEmail, mobile: cleanMobile, passwordHash });
        return { success: true, user: { id: user.id, email: user.email, mobile: user.mobile, token: user.sessionToken } };
    }

    async login({ email, password }) {
        const cleanEmail = (email || '').trim().toLowerCase();
        const user = this.users.findByEmail(cleanEmail);
        // Same generic error whether the email doesn't exist or the
        // password is wrong, so a login attempt can't be used to probe
        // which emails have accounts.
        if (!user) {
            return { success: false, status: 401, error: 'Incorrect email or password.' };
        }
        const matches = await bcrypt.compare(password || '', user.passwordHash);
        if (!matches) {
            return { success: false, status: 401, error: 'Incorrect email or password.' };
        }
        return { success: true, user: { id: user.id, email: user.email, mobile: user.mobile, token: user.sessionToken } };
    }

    // Resolves the user identified by an x-user-token header (see
    // getMyCases in the controller). Returns null for a missing/unknown
    // token rather than throwing, so callers can treat it as "not logged in".
    getUserByToken(token) {
        const user = this.users.findByToken(token);
        return user ? { id: user.id, email: user.email, mobile: user.mobile } : null;
    }
}

export default AuthService;
