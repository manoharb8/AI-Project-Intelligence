import {StrictMode} from 'react';
import {act,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import {Toast} from './Notifications';
import {useNotifications,type ToastTone} from './useNotifications';
function Harness({tone='success'}:{tone?:ToastTone}){
 const {notifications,notify,dismissNotification}=useNotifications();
 return <><button onClick={()=>notify('Operation finished','Source details retained',tone)}>Notify</button><button onClick={()=>notify('Another event','','info')}>Another</button>{notifications.map(item=><Toast key={item.id} item={item} dismiss={dismissNotification}/>)}</>;
}
beforeEach(()=>vi.useFakeTimers());afterEach(()=>vi.useRealTimers());
test.each(['success','info','warning','error'] as ToastTone[])('%s notification exits and disappears in 2.7 seconds under Strict Mode',tone=>{
 render(<StrictMode><Harness tone={tone}/></StrictMode>);fireEvent.click(screen.getByText('Notify'));
 act(()=>vi.advanceTimersByTime(2500));expect(screen.getByText('Operation finished')).toBeVisible();
 act(()=>vi.advanceTimersByTime(20));expect(screen.getByText('Operation finished').closest('.operation-toast')).toHaveClass('toast-exiting');
 act(()=>vi.advanceTimersByTime(180));expect(screen.queryByText('Operation finished')).not.toBeInTheDocument();
});
test('unrelated notifications do not restart an existing expiry timer',()=>{
 render(<Harness/>);fireEvent.click(screen.getByText('Notify'));act(()=>vi.advanceTimersByTime(1500));fireEvent.click(screen.getByText('Another'));
 act(()=>vi.advanceTimersByTime(1020));act(()=>vi.advanceTimersByTime(180));expect(screen.queryByText('Operation finished')).not.toBeInTheDocument();expect(screen.getByText('Another event')).toBeVisible();
});
test('hover and keyboard focus pause expiry; leaving resumes the remaining duration',()=>{
 render(<Harness/>);fireEvent.click(screen.getByText('Notify'));const toast=screen.getByText('Operation finished').closest('.operation-toast')!;
 act(()=>vi.advanceTimersByTime(1000));fireEvent.mouseEnter(toast);act(()=>vi.advanceTimersByTime(5000));expect(toast).not.toHaveClass('toast-exiting');fireEvent.mouseLeave(toast);
 const close=screen.getByRole('button',{name:'Dismiss Operation finished'});act(()=>close.focus());act(()=>vi.advanceTimersByTime(5000));expect(toast).not.toHaveClass('toast-exiting');act(()=>screen.getByText('Notify').focus());
 act(()=>vi.advanceTimersByTime(1520));act(()=>vi.advanceTimersByTime(180));expect(screen.queryByText('Operation finished')).not.toBeInTheDocument();
});
test('close uses the exit transition and then removes the toast',()=>{
 render(<Harness/>);fireEvent.click(screen.getByText('Notify'));fireEvent.click(screen.getByRole('button',{name:'Dismiss Operation finished'}));
 expect(screen.getByText('Operation finished').closest('.operation-toast')).toHaveClass('toast-exiting');act(()=>vi.advanceTimersByTime(180));expect(screen.queryByText('Operation finished')).not.toBeInTheDocument();
});

test('repeated events never grow beyond two toasts and the latest events expire',()=>{
 render(<Harness/>);
 for(let i=0;i<8;i++)fireEvent.click(screen.getByText('Notify'));
 expect(screen.getAllByText('Operation finished')).toHaveLength(2);
 act(()=>vi.advanceTimersByTime(2520));act(()=>vi.advanceTimersByTime(180));
 expect(screen.queryByText('Operation finished')).not.toBeInTheDocument();
 fireEvent.click(screen.getByText('Notify'));
 expect(screen.getByText('Operation finished')).toBeVisible();
 act(()=>vi.advanceTimersByTime(2520));act(()=>vi.advanceTimersByTime(180));
 expect(screen.queryByText('Operation finished')).not.toBeInTheDocument();
});

test.each(['Documents uploaded successfully','Project analysis started','Analysis completed successfully','Project intelligence updated','Incomplete evidence','Refresh failed'])('event %s dismisses without receiving focus',title=>{
 const dismiss=vi.fn();render(<Toast item={{id:1,title,detail:'Actual operation',tone:'info'}} dismiss={dismiss}/>);
 expect(screen.getByRole('button',{name:`Dismiss ${title}`})).not.toHaveFocus();
 act(()=>vi.advanceTimersByTime(2520));act(()=>vi.advanceTimersByTime(180));expect(dismiss).toHaveBeenCalledWith(1);
});

test('route changes clear stale hover and a changing callback cannot restart exit',()=>{
 const item={id:1,title:'Upload complete',detail:'Indexed',tone:'success' as const};
 const dismiss=vi.fn(),later=vi.fn();const {rerender}=render(<Toast item={item} dismiss={dismiss} routeKey="documents"/>);
 const toast=screen.getByText(item.title).closest('.operation-toast')!;
 act(()=>vi.advanceTimersByTime(1000));fireEvent.mouseEnter(toast);act(()=>vi.advanceTimersByTime(4000));
 rerender(<Toast item={item} dismiss={dismiss} routeKey="overview"/>);
 act(()=>vi.advanceTimersByTime(1520));act(()=>vi.advanceTimersByTime(100));
 rerender(<Toast item={item} dismiss={later} routeKey="overview"/>);
 act(()=>vi.advanceTimersByTime(80));expect(later).toHaveBeenCalledOnce();
});

test('pointer movement outside and focus moving elsewhere both release stale pause',()=>{
 render(<Harness/>);fireEvent.click(screen.getByText('Notify'));
 const toast=screen.getByText('Operation finished').closest('.operation-toast')!,close=screen.getByRole('button',{name:'Dismiss Operation finished'});
 fireEvent.mouseEnter(toast);act(()=>close.focus());act(()=>vi.advanceTimersByTime(4000));
 fireEvent.pointerMove(screen.getByText('Notify'));act(()=>screen.getByText('Notify').focus());
 act(()=>vi.advanceTimersByTime(2520));act(()=>vi.advanceTimersByTime(180));expect(screen.queryByText('Operation finished')).not.toBeInTheDocument();
});
