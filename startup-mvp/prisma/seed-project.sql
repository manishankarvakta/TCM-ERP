-- Seed data for project cmpfmx5qn0005op01m9did2g1
-- Owner: cmp0zwqbd0000nr01hw91k609
-- Milestones: cmpfyqhng0001ckrn0zpew6tf (Phase 1), cmpfyqho2000hckrnuiacle7v (Phase 2), cmpfyqho8000yckrnybjjefyj (Phase 3)

-- ============================================
-- ISSUES for Phase 1: Planning & Foundation
-- ============================================
INSERT INTO "Issue" (id, "issueNumber", title, description, status, priority, type, "milestoneId", "reporterId", "assigneeId", "createdAt", "updatedAt")
VALUES
  ('seed_issue_p1_01', 'WD-101', 'Setup Project Architecture', 'Define folder structure, establish coding standards and set up development environment.', 'COMPLETED', 'CRITICAL', 'TASK', 'cmpfyqhng0001ckrn0zpew6tf', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', NOW() - INTERVAL '14 days', NOW()),
  ('seed_issue_p1_02', 'WD-102', 'Database Schema Design', 'Design and implement the complete Prisma schema with all required models and relationships.', 'COMPLETED', 'HIGH', 'TASK', 'cmpfyqhng0001ckrn0zpew6tf', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', NOW() - INTERVAL '13 days', NOW()),
  ('seed_issue_p1_03', 'WD-103', 'Authentication System', 'Implement NextAuth with credential provider, session management, and role-based access.', 'IN_PROGRESS', 'HIGH', 'TASK', 'cmpfyqhng0001ckrn0zpew6tf', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', NOW() - INTERVAL '12 days', NOW()),
  ('seed_issue_p1_04', 'WD-104', 'API Route Scaffolding', 'Create server actions and API routes for all core CRUD operations.', 'OPEN', 'NORMAL', 'TASK', 'cmpfyqhng0001ckrn0zpew6tf', 'cmp0zwqbd0000nr01hw91k609', NULL, NOW() - INTERVAL '11 days', NOW());

-- ============================================
-- ISSUES for Phase 2: Frontend Development
-- ============================================
INSERT INTO "Issue" (id, "issueNumber", title, description, status, priority, type, "milestoneId", "reporterId", "assigneeId", "createdAt", "updatedAt")
VALUES
  ('seed_issue_p2_01', 'WD-201', 'Dashboard Layout & Navigation', 'Build the main dashboard shell with sidebar navigation, breadcrumbs, and responsive layout.', 'IN_PROGRESS', 'CRITICAL', 'TASK', 'cmpfyqho2000hckrnuiacle7v', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', NOW() - INTERVAL '10 days', NOW()),
  ('seed_issue_p2_02', 'WD-202', 'Project Workspace UI', 'Implement the tabbed project workspace with Overview, Timeline, Issues, and other modules.', 'IN_PROGRESS', 'HIGH', 'TASK', 'cmpfyqho2000hckrnuiacle7v', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', NOW() - INTERVAL '9 days', NOW()),
  ('seed_issue_p2_03', 'WD-203', 'Gantt Chart Implementation', 'Build a custom interactive Gantt chart with dependency lines, zoom control, and hierarchy support.', 'OPEN', 'HIGH', 'TASK', 'cmpfyqho2000hckrnuiacle7v', 'cmp0zwqbd0000nr01hw91k609', NULL, NOW() - INTERVAL '8 days', NOW()),
  ('seed_issue_p2_04', 'WD-204', 'Issue Board - Drag & Drop', 'Implement the Kanban-style issue board with DnD support and real-time status updates.', 'REVIEW', 'NORMAL', 'TASK', 'cmpfyqho2000hckrnuiacle7v', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', NOW() - INTERVAL '7 days', NOW()),
  ('seed_issue_p2_05', 'WD-205', 'Notes & Docs Module', 'Integrate rich text editor for notes and document management within projects.', 'OPEN', 'NORMAL', 'TASK', 'cmpfyqho2000hckrnuiacle7v', 'cmp0zwqbd0000nr01hw91k609', NULL, NOW() - INTERVAL '6 days', NOW());

-- ============================================
-- ISSUES for Phase 3: Testing & QA
-- ============================================
INSERT INTO "Issue" (id, "issueNumber", title, description, status, priority, type, "milestoneId", "reporterId", "assigneeId", "createdAt", "updatedAt")
VALUES
  ('seed_issue_p3_01', 'WD-301', 'Unit Test Coverage', 'Write unit tests for all server actions and critical business logic.', 'OPEN', 'HIGH', 'TASK', 'cmpfyqho8000yckrnybjjefyj', 'cmp0zwqbd0000nr01hw91k609', NULL, NOW() - INTERVAL '5 days', NOW()),
  ('seed_issue_p3_02', 'WD-302', 'Integration Testing', 'End-to-end testing of user workflows: login, project creation, task management.', 'OPEN', 'NORMAL', 'TASK', 'cmpfyqho8000yckrnybjjefyj', 'cmp0zwqbd0000nr01hw91k609', NULL, NOW() - INTERVAL '4 days', NOW()),
  ('seed_issue_p3_03', 'WD-303', 'Performance Optimization', 'Profile and optimize database queries, bundle size, and rendering performance.', 'OPEN', 'NORMAL', 'BUG', 'cmpfyqho8000yckrnybjjefyj', 'cmp0zwqbd0000nr01hw91k609', NULL, NOW() - INTERVAL '3 days', NOW());

-- ============================================
-- TASKS for Issues
-- ============================================
INSERT INTO "Task" (id, title, description, status, priority, "dueDate", "userId", "assigneeId", "projectId", "milestoneId", "issueId", "entityType", "entityId", "createdAt", "updatedAt")
VALUES
  -- Tasks for Issue WD-101 (Setup Project Architecture)
  ('seed_task_01', 'Initialize Next.js project with TypeScript', NULL, 'COMPLETED', 'high', NOW() - INTERVAL '10 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_01', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '14 days', NOW()),
  ('seed_task_02', 'Configure Docker & Docker Compose', NULL, 'COMPLETED', 'high', NOW() - INTERVAL '9 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_01', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '14 days', NOW()),
  ('seed_task_03', 'Setup ESLint & Prettier configuration', NULL, 'COMPLETED', 'medium', NOW() - INTERVAL '8 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_01', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '13 days', NOW()),

  -- Tasks for Issue WD-102 (Database Schema Design)
  ('seed_task_04', 'Design User & Organization models', NULL, 'COMPLETED', 'high', NOW() - INTERVAL '8 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_02', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '13 days', NOW()),
  ('seed_task_05', 'Create Project & Milestone schemas', NULL, 'COMPLETED', 'high', NOW() - INTERVAL '7 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_02', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '12 days', NOW()),
  ('seed_task_06', 'Implement Issue & Task relationships', NULL, 'COMPLETED', 'medium', NOW() - INTERVAL '6 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_02', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '11 days', NOW()),

  -- Tasks for Issue WD-103 (Authentication System)
  ('seed_task_07', 'Setup NextAuth with credentials provider', NULL, 'COMPLETED', 'high', NOW() - INTERVAL '5 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_03', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '12 days', NOW()),
  ('seed_task_08', 'Implement RBAC permission system', NULL, 'todo', 'high', NOW() + INTERVAL '2 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_03', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '10 days', NOW()),
  ('seed_task_09', 'Add password reset flow', NULL, 'todo', 'medium', NOW() + INTERVAL '5 days', 'cmp0zwqbd0000nr01hw91k609', NULL, 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_03', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '9 days', NOW()),

  -- Tasks for Issue WD-201 (Dashboard Layout)
  ('seed_task_10', 'Build sidebar navigation component', NULL, 'COMPLETED', 'high', NOW() - INTERVAL '3 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqho2000hckrnuiacle7v', 'seed_issue_p2_01', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '10 days', NOW()),
  ('seed_task_11', 'Create responsive header with breadcrumbs', NULL, 'in-progress', 'medium', NOW() + INTERVAL '1 day', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqho2000hckrnuiacle7v', 'seed_issue_p2_01', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '8 days', NOW()),
  ('seed_task_12', 'Implement dark mode toggle', NULL, 'todo', 'low', NOW() + INTERVAL '7 days', 'cmp0zwqbd0000nr01hw91k609', NULL, 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqho2000hckrnuiacle7v', 'seed_issue_p2_01', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '7 days', NOW()),

  -- Tasks for Issue WD-202 (Project Workspace UI)
  ('seed_task_13', 'Build Overview tab with role-based widgets', NULL, 'COMPLETED', 'high', NOW() - INTERVAL '2 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqho2000hckrnuiacle7v', 'seed_issue_p2_02', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '9 days', NOW()),
  ('seed_task_14', 'Create tab settings modal', NULL, 'COMPLETED', 'medium', NOW() - INTERVAL '1 day', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqho2000hckrnuiacle7v', 'seed_issue_p2_02', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '8 days', NOW()),
  ('seed_task_15', 'Implement URL-based tab persistence', NULL, 'in-progress', 'medium', NOW() + INTERVAL '3 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqho2000hckrnuiacle7v', 'seed_issue_p2_02', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '6 days', NOW()),

  -- Tasks for Issue WD-204 (Issue Board)
  ('seed_task_16', 'Implement DnD Kit drag and drop', NULL, 'COMPLETED', 'high', NOW() - INTERVAL '1 day', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqho2000hckrnuiacle7v', 'seed_issue_p2_04', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '7 days', NOW()),
  ('seed_task_17', 'Add list view with hierarchy', NULL, 'in-progress', 'medium', NOW() + INTERVAL '2 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqho2000hckrnuiacle7v', 'seed_issue_p2_04', 'project', 'cmpfmx5qn0005op01m9did2g1', NOW() - INTERVAL '5 days', NOW());

-- ============================================
-- SUBTASKS (Tasks with parentId)
-- ============================================
INSERT INTO "Task" (id, title, description, status, priority, "dueDate", "userId", "assigneeId", "projectId", "milestoneId", "issueId", "entityType", "entityId", "parentId", "createdAt", "updatedAt")
VALUES
  ('seed_subtask_01', 'Write Dockerfile for Next.js app', NULL, 'COMPLETED', 'medium', NOW() - INTERVAL '9 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_01', 'project', 'cmpfmx5qn0005op01m9did2g1', 'seed_task_02', NOW() - INTERVAL '14 days', NOW()),
  ('seed_subtask_02', 'Write docker-compose.yml with PostgreSQL', NULL, 'COMPLETED', 'medium', NOW() - INTERVAL '9 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_01', 'project', 'cmpfmx5qn0005op01m9did2g1', 'seed_task_02', NOW() - INTERVAL '14 days', NOW()),
  ('seed_subtask_03', 'Configure health checks', NULL, 'COMPLETED', 'low', NOW() - INTERVAL '8 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_01', 'project', 'cmpfmx5qn0005op01m9did2g1', 'seed_task_02', NOW() - INTERVAL '13 days', NOW()),
  ('seed_subtask_04', 'Setup JWT token configuration', NULL, 'COMPLETED', 'high', NOW() - INTERVAL '5 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_03', 'project', 'cmpfmx5qn0005op01m9did2g1', 'seed_task_07', NOW() - INTERVAL '12 days', NOW()),
  ('seed_subtask_05', 'Create login page UI', NULL, 'COMPLETED', 'medium', NOW() - INTERVAL '4 days', 'cmp0zwqbd0000nr01hw91k609', 'cmp0zwqbd0000nr01hw91k609', 'cmpfmx5qn0005op01m9did2g1', 'cmpfyqhng0001ckrn0zpew6tf', 'seed_issue_p1_03', 'project', 'cmpfmx5qn0005op01m9did2g1', 'seed_task_07', NOW() - INTERVAL '11 days', NOW());
