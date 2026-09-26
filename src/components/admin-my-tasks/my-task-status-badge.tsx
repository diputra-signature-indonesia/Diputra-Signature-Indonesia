const statusStyles: Record<string, string> = {
  IN_PROGRESS: 'border-[#E4B400] bg-[#FFF9E8] text-[#6C5600]',
  ON_HOLD: 'border-[#194DB8] bg-[#EAF1FF] text-[#073A98]',
  OBSTACLE: 'border-[#E33434] bg-[#FFF0F0] text-[#B51414]',
  NOT_STARTED: 'border-[#8A94A3] bg-[#F6F7F8] text-[#667080]',
  COMPLETED: 'border-[#1CA35B] bg-[#EDFBF3] text-[#14864B]',
};

export function MyTaskStatusBadge({ status, code }: { status: string; code: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold uppercase ${statusStyles[code] ?? 'border-[#8A94A3] bg-[#F6F7F8] text-[#667080]'}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
