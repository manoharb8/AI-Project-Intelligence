import {render,screen} from '@testing-library/react';
import {expect,test} from 'vitest';
import IntelligenceMark from './IntelligenceMark';
import SidebarBrand from './SidebarBrand';

test('sidebar and workspace share the open monogram without duplicating the accessible wordmark',()=>{
 const {container}=render(<><SidebarBrand/><button aria-label="Workspace selector"><IntelligenceMark/></button></>);
 expect(screen.getByRole('img',{name:'Project Intelligence & Risk Advisor'})).toBeVisible();
 const marks=container.querySelectorAll('.intelligence-core-brand');expect(marks).toHaveLength(2);
 expect(marks[0].querySelector('img')).toHaveAttribute('src',expect.stringContaining('intelligence-monogram.png'));
 expect(marks[0].querySelector('img')?.getAttribute('src')).toBe(marks[1].querySelector('img')?.getAttribute('src'));
 marks.forEach(mark=>{expect(mark).toHaveClass('intelligence-open-mark');expect(mark.querySelector('img')).toHaveAttribute('alt','');expect(mark.querySelector('svg')).toBeNull();});
 marks.forEach(mark=>expect(mark).toHaveAttribute('aria-hidden','true'));
 expect(screen.getAllByRole('button')).toHaveLength(1);
});
