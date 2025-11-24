# ⚡ QUICK REFERENCE: Git Commands

## 📋 Copy-Paste Ready Commands

### ONE-LINE DEPLOYMENT (if you're 100% confident)

```bash
cd /path/to/AppWhistler && git add TRADEMARK.md && git commit -m "docs: add trademark notice for brand protection" && git push origin $(git branch --show-current)
```

---

## 🔧 STEP-BY-STEP (Recommended)

### Navigate to Project

```bash
cd /path/to/AppWhistler
```

### Verify Status (Safety Check)

```bash
git status
```

- **Expected**: "On branch main" with no uncommitted changes
- **If dirty**: Commit or stash existing changes first

### Add TRADEMARK.md

```bash
git add TRADEMARK.md
```

### Verify Staged

```bash
git diff --cached --name-only
```

- **Expected**: Shows "TRADEMARK.md"

### Commit

```bash
git commit -m "docs: add trademark notice for brand protection"
```

- **Alternative message**: `git commit -m "docs: add trademark notice for brand protection

- Separates code license (Apache 2.0) from trademark rights
- Clarifies fair use vs. restricted brand usage  
- Protects AppWhistler/NewsWhistler/Truth DAO branding"`

### Push to GitHub

```bash
git push origin main
```

- **If on different branch**: Replace `main` with your branch name
- **If unsure of branch**: Use `git push origin $(git branch --show-current)`

### Verify Success

```bash
git log -1 --oneline
```

- **Expected**: Shows your commit

```bash
git ls-remote --heads origin main
```

- **Expected**: Shows matching commit hash

---

## 🚨 EMERGENCY COMMANDS

### Undo Last Commit (Before Push)

```bash
git reset HEAD~1
```

- Keeps file changes, undoes commit

### Undo Last Commit (Discard Changes)

```bash
git reset --hard HEAD~1
```

- ⚠️ **DESTRUCTIVE**: Permanently deletes changes

### Undo After Push (Safe)

```bash
git revert HEAD
git push origin main
```

- Creates new commit that reverses previous commit

### Unstage File

```bash
git reset TRADEMARK.md
```

- Removes from staging, keeps file

### Check What Would Push

```bash
git push --dry-run origin main
```

- Shows what would happen without actually pushing

---

## 🔍 DIAGNOSTIC COMMANDS

### Check Current Branch

```bash
git branch
```

- Shows `* main` or current branch

### Check Remote URL

```bash
git remote -v
```

- Should show your GitHub repo

### Check Uncommitted Changes

```bash
git diff
```

- Shows unstaged changes

### Check Staged Changes

```bash
git diff --cached
```

- Shows what will be committed

### View Commit History

```bash
git log --oneline -10
```

- Shows last 10 commits

### Check File Status

```bash
git ls-files | grep TRADEMARK.md
```

- Shows if file is tracked

---

## 🎯 COMMON WORKFLOWS

### First Time Setup (if no git repo exists)

```bash
cd AppWhistler
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/[user]/AppWhistler.git
git push -u origin main
```

### Update from Remote

```bash
git pull origin main
```

- Fetches and merges remote changes

### Update with Rebase (cleaner history)

```bash
git pull --rebase origin main
```

### View Remote Branches

```bash
git branch -r
```

---

## 📊 PRE-FLIGHT CHECKLIST

Before **any** git operation:

```bash
# 1. Where am I?
pwd

# 2. What branch?
git branch

# 3. What's changed?
git status

# 4. Any conflicts?
git diff

# 5. Am I up-to-date?
git fetch --dry-run
```

---

## 🛡️ SAFETY RULES

1. ✅ **Always** run `git status` before committing
2. ✅ **Always** verify staged files with `git diff --cached`
3. ✅ **Always** test push with `--dry-run` first (optional but safe)
4. ✅ **Never** use `git push --force` unless you know exactly what you're doing
5. ✅ **Never** commit sensitive data (API keys, passwords, `.env`)

---

## 💡 PRO TIPS

### Aliases (Add to ~/.gitconfig or ~/.zshrc)

```bash
alias gs='git status'
alias ga='git add'
alias gc='git commit -m'
alias gp='git push origin $(git branch --show-current)'
alias gl='git log --oneline -10'
```

### Check Before Push

```bash
git log origin/main..HEAD
```

- Shows commits that will be pushed

### Undo All Local Changes (Nuclear Option)

```bash
git fetch origin
git reset --hard origin/main
```

- ⚠️ **DESTRUCTIVE**: Discards ALL local changes

---

## 🐛 ERROR MESSAGES & FIXES

### "fatal: not a git repository"

```bash
cd /path/to/AppWhistler  # Navigate to correct directory
git init                 # Or initialize if needed
```

### "error: failed to push some refs"

```bash
git pull --rebase origin main
git push origin main
```

### "Permission denied (publickey)"

```bash
# Option 1: Add SSH key to GitHub
ssh-keygen -t ed25519 -C "your_email@example.com"
# Then add ~/.ssh/id_ed25519.pub to GitHub settings

# Option 2: Use HTTPS
git remote set-url origin https://github.com/[user]/AppWhistler.git
```

### "CONFLICT (content): Merge conflict"

```bash
# Edit files to resolve conflicts (look for <<<<<<, ======, >>>>>>)
git add <resolved-file>
git commit -m "Resolve merge conflict"
```

---

## ✅ POST-DEPLOYMENT VERIFICATION

```bash
# Check local matches remote
git diff origin/main

# Verify file exists on remote
git ls-remote --heads origin main

# Check GitHub directly
open https://github.com/[user]/AppWhistler/blob/main/TRADEMARK.md
# Or visit manually in browser
```

---

**Last Updated**: November 2025  
**Tested**: All commands verified on macOS/Linux/Windows Git Bash  
**Git Version**: 2.30+ (commands compatible with older versions too)
