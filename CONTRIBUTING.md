# Contributing to CareSync

Thank you for your interest in contributing to CareSync! This document outlines our development process, conventions, and guidelines.

---

## 🛠️ Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pritiverse/Hospital_application.git
   cd Hospital_application
   ```

2. **Install workspace dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   ```bash
   cp .env.example .env
   ```
   Update `.env` with your local PostgreSQL and Redis configurations.

4. **Initialize Database & Seed Data:**
   ```bash
   npm run db:migrate
   npm run db:generate
   npm run db:seed
   ```

5. **Start Development Services:**
   - **Frontend & Backend:** `npm run dev`
   - **Background Notification Worker:** `npm run dev:worker`

---

## 🌿 Branching Strategy & Git Workflow

- **`main`**: Production-ready, stable codebase.
- **Feature / Fix branches**:
  - `feat/feature-name` for new functionality
  - `fix/bug-name` for bug fixes
  - `refactor/component-name` for code refactoring
  - `docs/doc-update` for documentation changes

### Commit Messages
Follow the Conventional Commits specification:
- `feat: add Google Calendar event sync retry endpoint`
- `fix: resolve slot availability check during doctor leave`
- `docs: update API documentation for visit recording`
- `chore: clean workspace dependencies`

---

## 🧪 Code Quality & Testing

Before submitting a pull request:
1. Run the TypeScript linter across all workspaces:
   ```bash
   npm run lint
   ```
2. Format codebase using Prettier:
   ```bash
   npm run format
   ```
3. Verify production build:
   ```bash
   npm run build
   ```
4. Run UI test suite:
   ```bash
   npm run test:ui
   ```

---

## 📥 Pull Request Guidelines

1. Ensure all lint checks and builds pass.
2. Provide a clear description of the problem solved and changes introduced.
3. Keep pull requests focused on a single concern.
4. Avoid committing `.env` or any sensitive credentials.
