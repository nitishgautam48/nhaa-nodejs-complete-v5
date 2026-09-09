// ================================================================
//  AUTHORITY ACCESS CONTROL
//
//  The case-management endpoints (/api/v1/cases*) return real victim
//  case records - SC/ST atrocity testimony, suicide-risk assessments,
//  free-text disclosures - with no prior access control. The authority
//  dashboard was reachable from the public landing page with a single
//  click and no login of any kind, so anyone with the URL could read
//  every submitted case. This gates those endpoints behind a single
//  shared access code (AUTHORITY_ACCESS_CODE).
//
//  This is a lightweight shared-secret gate, not a full user-account
//  system (no per-officer identity, roles, or audit trail) - proportionate
//  to what this app currently has (no user database at all), but a real
//  deployment handling this kind of data should move to per-officer
//  accounts before going further into production use.
// ================================================================

import crypto from 'crypto';

// crypto.timingSafeEqual requires equal-length buffers and throws otherwise -
// hashing both sides first gives two fixed-length (32-byte) digests, so the
// comparison is always well-defined and never leaks the secret's real length
// or short-circuits early on a length mismatch.
function timingSafeEqual(a, b) {
    const hashA = crypto.createHash('sha256').update(String(a ?? '')).digest();
    const hashB = crypto.createHash('sha256').update(String(b ?? '')).digest();
    return crypto.timingSafeEqual(hashA, hashB);
}

// Fails CLOSED: if the operator never set AUTHORITY_ACCESS_CODE, protected
// routes refuse every request (503) rather than silently serving victim
// case data to anyone, which is what happened before this middleware existed.
export function requireAuthorityAccess(req, res, next) {
    const configuredCode = process.env.AUTHORITY_ACCESS_CODE;
    if (!configuredCode) {
        return res.status(503).json({
            success: false,
            error: 'Authority access is not configured on this server. Set AUTHORITY_ACCESS_CODE in the environment and restart.'
        });
    }

    const provided = req.headers['x-authority-key'];
    if (!provided || !timingSafeEqual(provided, configuredCode)) {
        return res.status(401).json({ success: false, error: 'Invalid or missing authority access code.' });
    }

    next();
}

// Shared by the /authority/verify endpoint, which the dashboard's login
// gate calls once so it can tell the user "wrong code" instead of only
// discovering it's wrong when the first /cases fetch silently 401s.
export function verifyAuthorityCode(code) {
    const configuredCode = process.env.AUTHORITY_ACCESS_CODE;
    if (!configuredCode) {
        return { configured: false, valid: false };
    }
    return { configured: true, valid: !!code && timingSafeEqual(code, configuredCode) };
}
