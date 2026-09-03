"use server";

export { 
  startWorkSession, 
// @ts-expect-error - Legacy compatibility
  pauseWorkSession, 
  resumeWorkSession, 
  endWorkSession, 
// @ts-expect-error - Legacy compatibility
  getWorkSessionStatus,
  getWorkSessionHistory
} from "./work-session.action";
