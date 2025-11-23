# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of AppWhistler seriously. If you discover a security vulnerability, please follow these steps:

### How to Report

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please report vulnerabilities through one of these secure channels:

1. **GitHub Security Advisories** (Preferred)
   - Go to the [Security tab](https://github.com/aresforblue-ai/appwhistler-production/security/advisories)
   - Click "Report a vulnerability"
   - Fill in the details

2. **Email** (when email is set up)
   - If you cannot use GitHub Security Advisories, open a private discussion thread
   - Include "SECURITY" in the subject line
   - Provide detailed information about the vulnerability

### What to Include

Please include the following information in your report:

- **Type of vulnerability** (e.g., XSS, SQL injection, authentication bypass)
- **Full paths or URLs** of affected source files
- **Location** of the affected code (tag/branch/commit or direct URL)
- **Step-by-step instructions** to reproduce the issue
- **Proof of concept** or exploit code (if possible)
- **Impact** of the vulnerability
- **Suggested fix** (if you have one)

### Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Varies based on severity
  - Critical: 1-7 days
  - High: 7-14 days
  - Medium: 14-30 days
  - Low: 30-90 days

### What to Expect

1. **Acknowledgment**: We'll confirm receipt of your report
2. **Assessment**: We'll evaluate the severity and impact
3. **Fix Development**: We'll work on a patch
4. **Disclosure**: We'll coordinate public disclosure with you
5. **Credit**: We'll credit you in the security advisory (if desired)

## Security Best Practices

### For Users

1. **Always use strong passwords**
   - Minimum 12 characters
   - Mix of uppercase, lowercase, numbers, and symbols
   - Never reuse passwords across sites

2. **Keep your software updated**
   - Regularly update to the latest version
   - Enable automatic security updates when possible

3. **Use HTTPS**
   - Always access AppWhistler over HTTPS in production
   - Never transmit sensitive data over unencrypted connections

4. **Review permissions**
   - Only grant necessary permissions to applications
   - Regularly audit connected apps and API keys

### For Developers

1. **Environment Variables**
   - Never commit `.env` files or secrets to git
   - Use `.env.example` as a template
   - Store production secrets in secure vaults (AWS Secrets Manager, etc.)

2. **Dependencies**
   - Run `npm audit` regularly to check for vulnerabilities
   - Keep dependencies updated with `npm update`
   - Use `npm audit fix` to automatically fix issues

3. **Authentication**
   - Always use strong, randomly generated JWT secrets
   - Never use default passwords or secrets in production
   - Implement proper session management and token expiration

4. **Input Validation**
   - Validate all user input on both client and server
   - Use parameterized queries to prevent SQL injection
   - Sanitize user-generated content to prevent XSS

5. **CORS Configuration**
   - Only allow trusted origins in production
   - Never use `ALLOWED_ORIGINS=*` in production

6. **Rate Limiting**
   - Implement rate limiting on all API endpoints
   - Use stricter limits for sensitive operations (login, registration)

7. **Error Handling**
   - Don't expose stack traces or sensitive info in production
   - Log errors securely without including sensitive data
   - Use proper error monitoring (Sentry, etc.)

## Security Features

AppWhistler includes the following built-in security features:

### Authentication & Authorization
- JWT-based authentication
- Bcrypt password hashing
- Token expiration and refresh mechanisms
- Role-based access control (RBAC)

### API Security
- Helmet.js security headers
- CORS protection
- Rate limiting (per-user and per-IP)
- GraphQL query complexity limiting
- Input validation and sanitization

### Data Protection
- SQL injection prevention via parameterized queries
- XSS prevention via content sanitization
- CSRF protection
- Secure session management

### Monitoring
- Sentry error tracking (optional)
- Database connection pool monitoring
- Request/response logging
- Security event logging

### Infrastructure
- HTTPS enforcement in production
- Database connection encryption
- Secure cookie settings
- Environment-based configuration

## Known Security Considerations

### Third-Party Services

When using optional third-party services, be aware of:

1. **API Keys**: Store securely, rotate regularly, use least-privilege access
2. **Rate Limits**: Respect API limits to avoid service disruption
3. **Data Sharing**: Review privacy policies and data handling practices
4. **Dependency Risks**: Regularly audit and update third-party packages

### Blockchain Integration

If using blockchain features:

1. **Private Keys**: Never commit to version control
2. **Gas Costs**: Monitor and limit transaction costs
3. **Smart Contracts**: Audit before deployment
4. **Network Selection**: Use testnets for development

### Database Security

1. **Connection Strings**: Never hardcode or commit credentials
2. **Backups**: Encrypt backups and store securely
3. **Access Control**: Use principle of least privilege
4. **Encryption**: Enable encryption at rest and in transit

## Security Updates

Subscribe to security updates:

- Watch the repository for security advisories
- Enable GitHub's Dependabot alerts
- Follow our security bulletin (if available)
- Check CHANGES.md for security-related updates

## Compliance

AppWhistler is designed with compliance in mind:

- **GDPR**: Data export and deletion endpoints
- **CCPA**: Privacy controls and data access
- **SOC 2**: Audit logging and access controls (in progress)

## Security Audit History

| Date | Auditor | Findings | Status |
|------|---------|----------|--------|
| TBD  | TBD     | TBD      | Pending |

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [GraphQL Security](https://graphql.org/learn/authorization/)

## Questions?

If you have questions about security that aren't covered here, please open a discussion in the repository or contact us through the appropriate channels.

---

**Last Updated**: 2025-11-23
**Version**: 1.0.0
