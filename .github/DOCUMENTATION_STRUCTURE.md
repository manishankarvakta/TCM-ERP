# 📁 Documentation Structure

This document explains the organization of project documentation.

## 📂 Root Directory

```
espacio/
├── README.md                          # Main project README (entry point)
├── docs/                              # All documentation files
│   └── README.md                      # Documentation index
├── docker-compose.yml                 # Local development
├── docker-compose-dokploy.yml         # Production deployment
└── startup-mvp/                       # Application code
```

**Only `README.md` should exist in the root directory for documentation.**

---

## 📚 Documentation Folder (`docs/`)

All `.md` documentation files are located in the `docs/` folder for better organization.

### Structure

```
docs/
├── README.md                          # Documentation index (START HERE)
│
├── Deployment Guides/
│   ├── DOKPLOY_DEPLOYMENT_GUIDE.md   # Complete Dokploy deployment guide ⭐
│   ├── DOKPLOY_SETUP.md              # Dokploy technical details
│   ├── DOKPLOY_CHANGES.md            # Summary of deployment changes
│   └── DOCKER_SETUP.md               # Standalone Docker deployment
│
├── Getting Started/
│   ├── setup.md                      # Initial setup instructions
│   └── ENV_SETUP.md                  # Environment configuration
│
├── Features & Systems/
│   ├── NOTIFICATION_SYSTEM.md        # Notification system docs
│   ├── README_EMAIL_SETUP.md         # Email configuration
│   ├── README_EMAIL_USAGE.md         # Email usage guide
│   ├── README_USER_LOG_USAGE.md      # User logging guide
│   └── README_NOTIFICATION_USAGE.md  # Notification usage
│
├── Technical/
│   ├── PRISMA_WORKFLOW.md            # Database & Prisma guide
│   └── RESTART_SERVER.md             # Server maintenance
│
└── Project/
    ├── CONTRIBUTING.md               # Contribution guidelines
    └── CHANGELOG.md                  # Version history
```

---

## 🎯 Navigation Guide

### For New Users
1. Start with [README.md](../README.md) in root
2. Choose deployment method
3. Follow relevant guide in `docs/`

### For Deployment
**Dokploy (Recommended):**
```
docs/DOKPLOY_DEPLOYMENT_GUIDE.md → Step-by-step deployment
docs/DOKPLOY_SETUP.md            → Technical configuration
docs/DOKPLOY_CHANGES.md          → Changes summary
```

**Docker:**
```
docs/DOCKER_SETUP.md             → Docker production setup
```

### For Development
```
README.md                        → Local development setup
docs/setup.md                    → Detailed setup guide
docs/ENV_SETUP.md                → Environment variables
docs/PRISMA_WORKFLOW.md          → Database development
```

---

## 🔗 Reference Links

### From Root README
All documentation links in root `README.md` point to `docs/` folder:
- `./docs/DOKPLOY_DEPLOYMENT_GUIDE.md`
- `./docs/DOCKER_SETUP.md`
- `./docs/` (documentation index)

### Internal Documentation Links
Documentation files within `docs/` use relative links:
- `./FILENAME.md` (same directory)
- `../README.md` (root README)

---

## ✅ Benefits of This Structure

1. **Clean Root Directory**: Only essential files in root
2. **Centralized Documentation**: All docs in one place
3. **Easy Navigation**: Clear hierarchy and index
4. **Maintainable**: Simple to update and organize
5. **Git-Friendly**: Better version control organization

---

## 📝 Adding New Documentation

When creating new documentation:

1. **Create file in `docs/` folder**
   ```bash
   touch docs/NEW_FEATURE.md
   ```

2. **Add to `docs/README.md` index**
   Update the relevant section with link to new doc

3. **Update root `README.md` if needed**
   Add link only if it's a major guide

4. **Use relative links**
   - To other docs: `./OTHER_DOC.md`
   - To root: `../README.md`

---

## 🔄 Migration History

**December 15, 2024**: Reorganized all documentation
- Moved all `.md` files (except root README) to `docs/`
- Created `docs/README.md` as documentation index
- Updated all references in root README
- Maintained relative links within docs folder

**Files Moved**:
- `DOKPLOY_DEPLOYMENT_GUIDE.md` → `docs/`
- `DOKPLOY_SETUP.md` → `docs/`
- `DOKPLOY_CHANGES.md` → `docs/`
- `DOCKER_SETUP.md` → `docs/` (already there)
- `CONTRIBUTING.md` → `docs/` (already there)

---

## 🎨 Naming Conventions

### File Names
- Use `UPPERCASE_WITH_UNDERSCORES.md` for major guides
- Use descriptive names that indicate content
- Prefix related docs (e.g., `README_EMAIL_*.md`)

### Categories (Internal Organization)
- **Deployment**: Dokploy, Docker, cloud platforms
- **Getting Started**: Setup, environment, installation
- **Features**: Specific system documentation
- **Technical**: Development, workflows, architecture
- **Project**: Contributing, changelog, governance

---

## 📖 Documentation Standards

### Every Documentation File Should Have:
1. **Clear title** (H1 heading)
2. **Brief description** (what the doc covers)
3. **Table of contents** (for long docs)
4. **Sections with clear headings**
5. **Code examples** where applicable
6. **Links to related docs**
7. **Last updated date** (at bottom)

### Example Template:
```markdown
# Document Title

Brief description of what this document covers.

## Table of Contents
- [Section 1](#section-1)
- [Section 2](#section-2)

## Section 1
Content...

## Section 2
Content...

---

**Last Updated**: YYYY-MM-DD
```

---

## 🔍 Quick Reference

| I Want To... | Go To... |
|--------------|----------|
| Get started locally | [README.md](../README.md) |
| Deploy to production | [docs/DOKPLOY_DEPLOYMENT_GUIDE.md](../docs/DOKPLOY_DEPLOYMENT_GUIDE.md) |
| Browse all docs | [docs/README.md](../docs/README.md) |
| Configure environment | [docs/ENV_SETUP.md](../docs/ENV_SETUP.md) |
| Work with database | [docs/PRISMA_WORKFLOW.md](../docs/PRISMA_WORKFLOW.md) |
| Set up email | [docs/README_EMAIL_SETUP.md](../docs/README_EMAIL_SETUP.md) |
| Contribute | [docs/CONTRIBUTING.md](../docs/CONTRIBUTING.md) |
| See changes | [docs/CHANGELOG.md](../docs/CHANGELOG.md) |

---

**Maintained By**: Development Team  
**Last Updated**: December 15, 2024

