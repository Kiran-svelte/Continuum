export { TutorialProvider, useTutorial, StartTutorialButton } from './tutorial-provider';
export type { TutorialConfig, TutorialStep } from './tutorial-provider';
export {
  gettingStartedTutorial,
  employeeTutorial,
  hrTutorial,
  managerTutorial,
  featuresToutorial,
  allTutorials
} from './tutorials';
export type { TutorialId } from './tutorials';
export { WelcomeModal, FloatingTutorialButton } from './welcome-modal';

// New tutorial system
export { 
  TutorialGuide, 
  TooltipGuide, 
  FeatureHighlight 
} from './tutorial-guide';

export { 
  getTutorialByRole,
  getSuperAdminTutorial,
  getAdminTutorial,
  getHRTutorial as getHRTutorialNew,
  getManagerTutorial as getManagerTutorialNew,
  getEmployeeTutorial as getEmployeeTutorialNew,
} from './tutorial-configs';
