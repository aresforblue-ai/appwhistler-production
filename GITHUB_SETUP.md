# GitHub Repository Setup Guide

This guide provides recommendations for configuring your GitHub repository settings before making it public, including branch protection rules, security features, and best practices.

## Table of Contents

- [Repository Settings](#repository-settings)
- [Branch Protection Rules](#branch-protection-rules)
- [Security Features](#security-features)
- [Actions and Workflows](#actions-and-workflows)
- [Webhooks and Integrations](#webhooks-and-integrations)
- [Pre-Launch Checklist](#pre-launch-checklist)

## Repository Settings

### General Settings

#### Basic Information
- **Repository Name**: `appwhistler-production`
- **Description**: "Truth-first app recommender platform with AI-powered fact-checking"
- **Website**: Add your production URL
- **Topics**: `graphql`, `react`, `postgresql`, `fact-checking`, `app-recommendations`, `nodejs`, `apollo-server`, `tailwindcss`

#### Features
- ✅ **Issues**: Enable for bug tracking and feature requests
- ✅ **Projects**: Enable for project management
- ✅ **Discussions**: Enable for community Q&A
- ✅ **Wiki**: Optional - may use docs/ folder instead
- ❌ **Sponsorships**: Optional

#### Pull Requests
- ✅ **Allow squash merging**: Enable (recommended)
- ✅ **Allow merge commits**: Enable
- ❌ **Allow rebase merging**: Optional (disable for simpler history)
- ✅ **Automatically delete head branches**: Enable
- ✅ **Allow auto-merge**: Enable
- ✅ **Suggest updating pull request branches**: Enable

#### Merge Button
- ✅ **Default to squash merge**
- ✅ **Default commit message**: Pull request title

## Branch Protection Rules

### Main Branch (`main`)

Navigate to: **Settings → Branches → Add branch protection rule**

#### Branch name pattern
```
main
```

#### Protect matching branches

**Require a pull request before merging**
- ✅ Enable this setting
- **Required approvals**: 1 (minimum)
- ✅ **Dismiss stale pull request approvals when new commits are pushed**
- ✅ **Require review from Code Owners** (if you have a CODEOWNERS file)
- ❌ **Restrict who can dismiss pull request reviews** (optional for small teams)
- ✅ **Allow specified actors to bypass required pull requests** (for emergency hotfixes - use sparingly)

**Require status checks to pass before merging**
- ✅ Enable this setting
- ✅ **Require branches to be up to date before merging**
- Required status checks (from `.github/workflows/test.yml`):
  - ✅ `backend-tests`
  - ✅ `frontend-tests`
  - ✅ `e2e-tests`
  - ✅ `lint`

**Require conversation resolution before merging**
- ✅ Enable - All PR comments must be resolved

**Require signed commits**
- ⚠️ Optional but recommended for high-security environments
- Requires contributors to sign commits with GPG keys

**Require linear history**
- ❌ Disable (conflicts with merge commits)
- OR enable if you only want squash/rebase merges

**Require deployments to succeed before merging**
- ⚠️ Optional - Enable if you have staging deployment checks

**Lock branch**
- ❌ Disable (too restrictive for active development)

**Do not allow bypassing the above settings**
- ✅ Enable to enforce rules for everyone (including admins)
- OR ❌ Disable to allow admin overrides for emergencies

**Restrict who can push to matching branches**
- ⚠️ Optional - Limit to specific users/teams
- Useful for open source projects

**Allow force pushes**
- ❌ **Disable** - Never allow force pushes to main

**Allow deletions**
- ❌ **Disable** - Protect main branch from deletion

### Develop Branch (Optional)

If you use a `develop` branch for active development:

```
develop
```

Apply similar rules but with more flexibility:
- Required approvals: 1
- Require status checks: ✅ Same as main
- Less restrictive than main for faster iteration

## Security Features

### Code Security and Analysis

Navigate to: **Settings → Code security and analysis**

#### Dependency Graph
- ✅ **Enable** - Visualize your dependencies

#### Dependabot Alerts
- ✅ **Enable** - Get notified of vulnerable dependencies
- Automatically creates issues for security vulnerabilities

#### Dependabot Security Updates
- ✅ **Enable** - Auto-create PRs to update vulnerable dependencies
- Configure in `.github/dependabot.yml`:

```yaml
version: 2
updates:
  # Frontend dependencies
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    reviewers:
      - "your-username"
    
  # Backend dependencies
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
```

#### Dependabot Version Updates
- ✅ **Enable** - Keep dependencies up to date (not just security fixes)

#### Code Scanning (Advanced Security)

⚠️ **Requires GitHub Advanced Security** (free for public repos)

- ✅ **Enable** - Automatically scan for security vulnerabilities
- Uses CodeQL to find security issues
- Configure in `.github/workflows/codeql.yml`:

```yaml
name: "CodeQL"

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly scan

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    strategy:
      fail-fast: false
      matrix:
        language: [ 'javascript' ]

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Initialize CodeQL
      uses: github/codeql-action/init@v3
      with:
        languages: ${{ matrix.language }}

    - name: Autobuild
      uses: github/codeql-action/autobuild@v3

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3
```

#### Secret Scanning
- ✅ **Enable** - Automatically detect committed secrets
- ✅ **Enable push protection** - Prevent secrets from being pushed

#### Private Vulnerability Reporting
- ✅ **Enable** - Allow security researchers to report vulnerabilities privately

## Actions and Workflows

### Repository Permissions

Navigate to: **Settings → Actions → General**

#### Actions permissions
- ✅ **Allow all actions and reusable workflows**
- OR **Allow select actions and reusable workflows** (more restrictive)

#### Workflow permissions
- ✅ **Read and write permissions** - Needed for automated PRs (Dependabot)
- ✅ **Allow GitHub Actions to create and approve pull requests**

#### Fork pull request workflows
- ⚠️ **Require approval for first-time contributors**
- Prevents malicious workflow runs from forks

### Secrets and Variables

Navigate to: **Settings → Secrets and variables → Actions**

#### Repository Secrets
Add these secrets for CI/CD:

```
CODECOV_TOKEN          # For code coverage uploads
SENTRY_DSN             # For error monitoring (if used)
# Add production deployment secrets as needed
```

#### Repository Variables
Add non-sensitive configuration:

```
NODE_VERSION=18
POSTGRES_VERSION=14
REDIS_VERSION=7
```

## Webhooks and Integrations

### Recommended Integrations

1. **Codecov** - Code coverage tracking
   - URL: https://codecov.io/
   - Enable in `.github/workflows/test.yml`

2. **Sentry** - Error monitoring
   - Configure in backend and frontend

3. **Vercel/Netlify** - Automatic preview deployments
   - Connect your repository for PR previews

4. **Linear/Jira** - Issue tracking integration (optional)

## Pre-Launch Checklist

### Critical Items (Must Complete)

- [ ] ✅ Remove `.env` file from git history
- [ ] ✅ Create `.env.example` files
- [ ] ✅ Add `SECURITY.md` file
- [ ] ✅ Configure branch protection for `main`
- [ ] ✅ Enable Dependabot alerts
- [ ] ✅ Enable secret scanning
- [ ] ✅ Review all files for sensitive data
- [ ] ✅ Update README with public information
- [ ] ✅ Add LICENSE file (MIT already present)
- [ ] ✅ Verify .gitignore is comprehensive

### Recommended Items

- [ ] Enable code scanning (CodeQL)
- [ ] Set up Dependabot version updates
- [ ] Add CODEOWNERS file
- [ ] Configure issue templates
- [ ] Configure pull request template
- [ ] Add CONTRIBUTING.md (already present)
- [ ] Set up GitHub Discussions
- [ ] Configure topics/tags
- [ ] Add repository description and URL
- [ ] Set up automated deployments
- [ ] Configure code coverage tracking

### Before Making Public

1. **Final Security Scan**
   ```bash
   # Check for secrets
   npm install -g @trufflesecurity/trufflehog
   trufflehog git file://. --only-verified
   
   # Check dependencies
   npm audit
   cd backend && npm audit
   
   # Check for sensitive files
   git ls-files | grep -E '(\.env|secret|key|password|credential|token)'
   ```

2. **Repository Visibility**
   - Go to **Settings → Danger Zone → Change repository visibility**
   - Select **Make public**
   - Confirm by typing the repository name

3. **Announcement**
   - Update README with public links
   - Create GitHub Release for v1.0.0
   - Share on social media/developer communities

## Post-Launch Monitoring

### Week 1
- [ ] Monitor GitHub Insights → Traffic
- [ ] Review security alerts
- [ ] Check CI/CD pipeline performance
- [ ] Respond to initial issues/PRs

### Ongoing
- [ ] Weekly Dependabot PR review
- [ ] Monthly security audit
- [ ] Quarterly dependency updates
- [ ] Review and improve documentation

## Rollback Plan

If you need to make the repository private again:

1. Go to **Settings → Danger Zone → Change repository visibility**
2. Select **Make private**
3. Confirm the action

Note: Making a repository private after it was public doesn't remove forks or cached data. Once public, assume all data has been copied.

## Additional Resources

- [GitHub Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)
- [GitHub Security Features](https://docs.github.com/en/code-security)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

## Support

If you have questions about these settings, please:
- Review GitHub's documentation
- Open a discussion in the repository
- Contact the maintainers

---

**Last Updated**: 2025-11-23
**Version**: 1.0.0
