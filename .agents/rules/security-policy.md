# Security Policy: Authentication & Login Integrity

## CRITICAL RULE: NO QUICK LOGIN / DEMO LOGIN / PASSWORD BYPASSES
1. **Never implement "Quick Login", "Demo Login", "Quick Demo Switcher", or one-click auto-fill buttons** anywhere on the login screen or throughout the portal.
2. **Never implement master password bypasses** (such as allowing `admin`, `password123`, `teach123`, or role defaults to bypass an employee's actual password).
3. Every user (Faculty, Administrator, Intern, Developer, Sales Counselor) must authenticate by typing their valid registered username or Employee ID and their authentic password.
4. Always return generic authentication failure messages (e.g. "Invalid username or password. Please verify your credentials.") to prevent username enumeration.
