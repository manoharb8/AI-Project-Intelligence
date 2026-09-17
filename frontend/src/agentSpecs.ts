export const agentSpecs = {
  scope: {title: 'Scope & Deliverables',description: 'Find the goals, dates, deliverables, and responsibilities stated in your sources.',query: 'Review project goals, milestones, timelines, responsibilities, and deliverables.',path: '/scope'},
  risk: {title: 'Risk & Delivery',description: 'Review documented schedule risks, dependency gaps, and delivery challenges.',query: 'Review schedule risks, dependency gaps, delivery challenges, and the stated delivery forecast.',path: '/risks'},
  blockers: {title: 'Blockers & Actions',description: 'Bring pending decisions, unresolved issues, and assigned actions into view.',query: 'Review meeting notes and sprint updates for pending decisions, unresolved issues, and action items.',path: '/blockers'},
};

export const categoryLabels: Record<string, string> = {
  goals: 'Project goals', milestones: 'Milestones', timelines: 'Timelines', responsibilities: 'Responsibilities', deliverables: 'Deliverables',
  schedule_risks: 'Schedule risks', dependency_gaps: 'Dependency gaps', delivery_challenges: 'Delivery challenges', delivery_forecast: 'Stated delivery outlook',
  pending_decisions: 'Pending decisions', unresolved_issues: 'Unresolved issues', action_items: 'Action items',
};
