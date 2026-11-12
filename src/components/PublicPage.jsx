import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { overviewPath } from '@/lib/routes.mjs'
import { CalendarIcon, ChartIcon, ChecklistIcon, PeopleIcon, ProgressIcon, TargetIcon } from '@/components/ui/icons'

export const workflow = [
  { title: 'Plan', section: 'how-it-works', Icon: CalendarIcon, summary: 'Set monthly priorities', detail: 'Assign owners and deadlines to the work that needs to happen next.' },
  { title: 'Track', section: 'features', Icon: ChartIcon, summary: 'Review measurable progress', detail: 'Compare planned and completed work, record hours, and review accomplishments and blockers.' },
  { title: 'Focus', section: 'use-cases', Icon: TargetIcon, summary: 'Agree on what’s next', detail: 'Turn the review into a dated plan your team can refer to throughout the month.' },
]

const content = {
  features: {
    heading: 'See the whole month clearly.',
    description: 'Each review connects the work you planned, the progress you made, and the decisions that carry into next month.',
    items: [
      { title: 'Progress at a glance', Icon: ProgressIcon, detail: 'Compare planned and completed tasks on one bar and see overall project completion, hours, and reporting compliance.' },
      { title: 'Accomplishments and blockers', Icon: ChecklistIcon, detail: 'Record what shipped, what slowed the team down, and how the team responded.' },
      { title: 'Deadline calendar', Icon: CalendarIcon, detail: 'See next month’s deadlines together and select a date to filter the agenda.' },
    ],
  },
  'how-it-works': {
    heading: 'From monthly review to next month’s plan.',
    description: 'Open a project and choose a report month. Follow the same sequence each time you review the work.',
    items: workflow,
  },
  'use-cases': {
    heading: 'One review for different roles.',
    description: 'Use the same report in a live discussion, a project handoff, or an asynchronous update.',
    items: [
      { title: 'Project leads', Icon: TargetIcon, detail: 'Walk through progress and blockers, then review upcoming deadlines and owners with the team.' },
      { title: 'Delivery teams', Icon: PeopleIcon, detail: 'See what was completed and check the agenda for upcoming work and responsibilities.' },
      { title: 'Stakeholders', Icon: ChartIcon, detail: 'Open a shared report and go straight to the chapter you need.' },
    ],
  },
  updates: {
    heading: 'What’s new in Project Lens.',
    items: [
      { title: 'Planned and completed in one view', Icon: ProgressIcon, detail: 'The Progress chapter now puts completed work and the monthly target on the same bar.' },
      { title: 'An easier way to move between chapters', Icon: ChecklistIcon, detail: 'Progress, Accomplishments, Blockers, and Next month now sit above the report.' },
      { title: 'A calendar you can collapse', Icon: CalendarIcon, detail: 'Hide the calendar to keep the agenda in view, or expand it to see the month at a glance.' },
    ],
  },
}

export function PublicPage({ section, pageLabel }) {
  const { heading, description, items } = content[section]
  const workflowPage = section === 'how-it-works'
  const List = workflowPage ? 'ol' : 'ul'

  return <div className="public-content" data-section={section}>
    <header className="public-intro">
      <h1>{heading}</h1>
      {description && <p>{description}</p>}
    </header>
    <List className="public-details" aria-label={pageLabel}>
      {items.map(({ title, Icon, detail }) => <li key={title}>
        <span className="public-detail-icon" aria-hidden="true"><Icon label="" /></span>
        <div><h2>{title}</h2><p>{detail}</p></div>
      </li>)}
    </List>
    <Button asChild className="public-explore"><Link to={overviewPath}>Explore</Link></Button>
  </div>
}
