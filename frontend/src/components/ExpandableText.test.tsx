import {render, screen, fireEvent, cleanup} from '@testing-library/react';
import {afterEach, expect, test} from 'vitest';
import {ExpandableText, PreviewList} from './ExpandableText';
afterEach(cleanup);
test('long source text is shortened without losing the complete original', () => {
  const text = 'Risk R-02 requires review. '.repeat(20);
  render(<ExpandableText text={text} limit={80}/>);
  const button = screen.getByRole('button', {name: 'Read full text'});
  expect(button.getAttribute('aria-expanded')).toBe('false');
  fireEvent.click(button);
  expect(document.querySelector('.compact-text p')?.textContent).toBe(text);
  fireEvent.click(screen.getByRole('button', {name: 'Show less'}));
  expect(document.querySelector('.compact-text p')?.textContent?.length).toBeLessThan(text.length);
});
test('short unknown state stays unchanged with no unnecessary control', () => {
  render(<ExpandableText text="Not stated"/>);
  expect(screen.getByText('Not stated')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});
test('additional entries remain available in a native disclosure', () => {
  render(<PreviewList count={2}>{[1,2,3,4].map(n => <p key={n}>Risk {n}</p>)}</PreviewList>);
  const disclosure = screen.getByText('Show 2 more entries').closest('details')!;
  expect(disclosure.open).toBe(false);
  fireEvent.click(screen.getByText('Show 2 more entries'));
  expect(disclosure.open).toBe(true);
  expect(screen.getByText('Risk 4')).toBeTruthy();
});
