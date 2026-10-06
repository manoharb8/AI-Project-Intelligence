import {StrictMode} from 'react';
import {act, fireEvent, render, screen, within} from '@testing-library/react';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {MemoryRouter} from 'react-router-dom';
import App from '../App';
import {api} from '../api';
import {HealthComparison, HealthMetric, HealthPulse} from './HealthVisuals';
import {ThemeProvider, ThemeToggle} from './Theme';
import type {HealthResult} from '../intelligence/types';

vi.mock('../api', () => ({api: {summary: vi.fn(), agentStatus: vi.fn(), analyze: vi.fn(), upload: vi.fn(), query: vi.fn()}}));
// UI contract fixtures only. These values never enter the application or its database.
const health: HealthResult = {
  status: 'partial', query: 'Review', generated_at: '2026-10-03T10:00:00Z', provider: 'Extractive', evidence: [], retrieved_count: 0, evidence_limited: false, warnings: [],
  overall_score: 45, interpretation: 'Review needed', assessed_dimensions: 3, methodology_version: 'evidence-health-v1', methodology: 'The exact returned methodology.',
  dimensions: [
    {id: 'scope_clarity', label: 'Scope clarity', score: 60, health_contribution: 60, higher_is_better: true, weight: 40, count: 3, state: 'assessed', explanation: 'Scope source explanation.', calculation: 'Exact scope calculation.', references: [], scope_signals: []},
    {id: 'timeline_risk', label: 'Timeline risk', score: 75, health_contribution: 25, higher_is_better: false, weight: 35, count: 3, state: 'assessed', explanation: 'Timeline source explanation.', calculation: 'Exact timeline calculation.', references: [], scope_signals: []},
    {id: 'blocker_health', label: 'Blocker health', score: 50, health_contribution: 50, higher_is_better: true, weight: 25, count: 2, state: 'assessed', explanation: 'Blocker source explanation.', calculation: 'Exact blocker calculation.', references: [], scope_signals: []},
  ],
};
beforeEach(() => {vi.resetAllMocks(); sessionStorage.clear();});
afterEach(() => {vi.restoreAllMocks(); sessionStorage.clear();});

test.each([0, 45, 100])('comparison positions an actual %s score on a 0–100 axis without a circle', score => {
  const {container} = render(<HealthComparison health={{...health, overall_score: score}}/>);
  expect(screen.getByRole('img', {name: `Overall evidence health ${score} out of 100`})).toBeInTheDocument();
  const control = screen.getByRole('button', {name: new RegExp(`Overall evidence health: ${score} out of 100`)});
  expect(control.querySelector('.metric-ribbon')).toHaveStyle({width: `${score}%`});
  expect(screen.getByLabelText('Score scale from 0 to 100')).toHaveTextContent('0255075100');
  expect(screen.getByText('Current evidence assessment · no historical trend')).toBeVisible();
  expect(container.querySelector('circle')).toBeNull();
});

test('dimension ribbons use risk values directly, never their inverse health contribution', () => {
  render(<HealthComparison health={health}/>);
  const risk = screen.getByRole('button', {name: /Timeline risk: 75 out of 100/});
  expect(risk.querySelector('.metric-ribbon')).toHaveStyle({width: '75%'});
  expect(within(risk).getByText('Higher timeline risk = more risk')).toBeVisible();
  expect(screen.getByRole('button', {name: /Scope clarity: 60 out of 100. Higher = better/})).toBeVisible();
  expect(screen.getByRole('button', {name: /Blocker health: 50 out of 100. Higher = better/})).toBeVisible();
  expect(screen.getAllByRole('link', {name: /Calculation & evidence/}).map(link => link.getAttribute('href'))).toEqual(['#dashboard-calculation', '#dashboard-scope_clarity', '#dashboard-timeline_risk', '#dashboard-blocker_health']);
});

test('unavailable values have no plotted marker and never become zero or healthy', () => {
  const {container} = render(<HealthComparison health={null}/>);
  expect(screen.getByRole('img', {name: 'Overall project health not assessed'})).toBeVisible();
  expect(screen.getByText('Assessment unavailable')).toBeVisible();
  expect(screen.getByRole('button', {name: /Overall evidence health: Unknown/})).toBeVisible();
  expect(container.querySelector('.metric-ribbon')).toBeNull();
  expect(screen.queryByText('0 / 100')).not.toBeInTheDocument();
});

test('value inspection reveals exact calculations on hover and focus, dismisses on Escape and exit', () => {
  render(<><HealthMetric label="Timeline risk" score={75} hint="Higher timeline risk = more risk" explanation="Exact source explanation." calculation="Exact returned calculation." evidenceHref="#sources"/><button>Next control</button></>);
  const inspect = screen.getByRole('button', {name: /Inspect value/});
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.mouseEnter(inspect.parentElement!);
  expect(screen.getByRole('tooltip')).toHaveTextContent('Exact returned calculation.');
  fireEvent.mouseLeave(inspect.parentElement!);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  act(() => inspect.focus());
  expect(inspect).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByRole('tooltip')).toHaveTextContent('Exact source explanation.');
  fireEvent.keyDown(inspect, {key: 'Escape'});
  expect(inspect).toHaveFocus();
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  fireEvent.click(inspect);
  expect(screen.getByRole('tooltip')).toBeVisible();
  act(() => screen.getByRole('link', {name: /Calculation & evidence/}).focus());
  expect(screen.getByRole('tooltip')).toBeVisible();
  act(() => screen.getByRole('button', {name: 'Next control'}).focus());
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

test('refresh reveals the new returned value without mutating the assessment', () => {
  const snapshot = JSON.stringify(health);
  const {rerender} = render(<HealthComparison health={health}/>);
  rerender(<HealthComparison health={{...health, overall_score: 82, interpretation: 'Returned interpretation'}}/>);
  expect(screen.queryByRole('img', {name: 'Overall evidence health 45 out of 100'})).not.toBeInTheDocument();
  expect(screen.getByRole('img', {name: 'Overall evidence health 82 out of 100'})).toBeVisible();
  expect(screen.getByText('Returned interpretation')).toBeVisible();
  expect(JSON.stringify(health)).toBe(snapshot);
});

test.each([null, 0, 45, 100])('organic field presents %s without substituting a score or using a donut', score => {
  const {container} = render(<HealthPulse score={score} interpretation={score === null ? 'Insufficient evidence' : 'Returned status'} dimensions={health.dimensions}/>);
  expect(screen.getByRole('img', {name: score === null ? 'Overall project health not assessed' : `Overall evidence health ${score} out of 100`})).toBeVisible();
  expect(container.querySelectorAll('.pulse-layer')).toHaveLength(4);
  expect(container.querySelector('circle')).toBeNull();
  expect(screen.getByText(score === null ? 'Insufficient evidence' : 'Returned status')).toBeVisible();
  expect(screen.getByLabelText('Current health dimension values')).toHaveTextContent('Timeline risk75 / 100');
});

test('theme toggle uses tab-session preference, survives remount and never writes content to local storage', () => {
  const persistent = vi.spyOn(Storage.prototype, 'setItem');
  const first = render(<StrictMode><ThemeProvider><ThemeToggle/></ThemeProvider></StrictMode>);
  const toggle = screen.getByRole('switch', {name: 'Dark mode'});
  expect(toggle).toHaveAttribute('aria-checked', 'false');
  expect(toggle.tagName).toBe('BUTTON');
  fireEvent.click(toggle);
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(toggle).toHaveAttribute('aria-checked', 'true');
  expect(sessionStorage.getItem('project-intelligence-theme')).toBe('dark');
  expect(localStorage.getItem('project-intelligence-theme')).toBeNull();
  expect(persistent.mock.calls.every(([key, value]) => key === 'project-intelligence-theme' && ['dark', 'light'].includes(value))).toBe(true);
  first.unmount();
  render(<ThemeProvider><ThemeToggle/></ThemeProvider>);
  expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  fireEvent.click(screen.getByRole('switch'));
  expect(document.documentElement).toHaveAttribute('data-theme', 'light');
});

test('theme still works in memory when session storage is unavailable', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {throw new Error('Storage disabled');});
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {throw new Error('Storage disabled');});
  render(<ThemeProvider><ThemeToggle/></ThemeProvider>);
  fireEvent.click(screen.getByRole('switch'));
  expect(document.documentElement.dataset.theme).toBe('dark');
});

test('sidebar removes auxiliary branding, preserves every navigation URL/order, and theme changes preserve drafts', async () => {
  vi.mocked(api.summary).mockResolvedValue({document_count: 0, indexed_documents: 0, chunk_count: 0, documents: [], supported_formats: ['pdf','docx','txt','csv'], retrieval_ready: false});
  vi.mocked(api.agentStatus).mockResolvedValue({ready: true, mode: 'extractive', provider: 'Extractive', message: 'Ready', agents: ['scope','risk','blockers']});
  const {container} = render(<MemoryRouter initialEntries={['/scope']}><App/></MemoryRouter>);
  const input = await screen.findByLabelText('Analysis focus');
  fireEvent.change(input, {target: {value: 'Keep this focus'}});
  const nav = screen.getByRole('navigation', {name: 'Main navigation'});
  expect(within(nav).getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(['/dashboard','/documents','/scope','/risks','/blockers','/documentation','/project-health','/assistant']);
  expect(container.querySelector('.workspace')).toBeNull();
  expect(container.querySelector('.sidebar-bottom')).toBeNull();
  expect(screen.queryByText('PI')).not.toBeInTheDocument();
  expect(screen.queryByText('Your workspace')).not.toBeInTheDocument();
  expect(screen.queryByText('Infosys Springboard internship')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Project Intelligence & Risk Advisor')).toHaveTextContent('Project Intelligence & Risk Advisor');
  fireEvent.click(screen.getByRole('switch'));
  expect(input).toHaveValue('Keep this focus');
  expect(api.summary).toHaveBeenCalledTimes(1);
  expect(api.query).not.toHaveBeenCalled();
  expect(api.analyze).not.toHaveBeenCalled();
});
