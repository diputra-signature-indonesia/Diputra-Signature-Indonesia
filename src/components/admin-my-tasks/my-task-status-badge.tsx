import type { MyTaskStatus } from '@/data/admin-my-tasks/my-tasks-dummy-data';

const statusStyles: Record<MyTaskStatus, string> = {
  'In Progress': 'border-[#E4B400] bg-[#FFF9E8] text-[#6C5600]',
  'On Hold': 'border-[#194DB8] bg-[#EAF1FF] text-[#073A98]',
  Obstacle: 'border-[#E33434] bg-[#FFF0F0] text-[#B51414]',
  'Not Started': 'border-[#8A94A3] bg-[#F6F7F8] text-[#667080]',
  Completed: 'border-[#1CA35B] bg-[#EDFBF3] text-[#14864B]',
};

export function MyTaskStatusBadge({ status }: { status: MyTaskStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold uppercase ${statusStyles[status]}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
