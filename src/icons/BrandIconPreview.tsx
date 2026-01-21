export default function IconPreview({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <mask id="mask0_1732_1514" style={{ maskType: 'luminance' }} maskUnits="userSpaceOnUse" x="1" y="5" width="22" height="14">
        <path d="M12 18C17.523 18 22 12 22 12C22 12 17.523 6 12 6C6.477 6 2 12 2 12C2 12 6.477 18 12 18Z" fill="white" stroke="white" strokeWidth="2" strokeLinejoin="round" />
        <path
          d="M12 14.5C12.663 14.5 13.2989 14.2366 13.7678 13.7678C14.2366 13.2989 14.5 12.663 14.5 12C14.5 11.337 14.2366 10.7011 13.7678 10.2322C13.2989 9.76339 12.663 9.5 12 9.5C11.337 9.5 10.7011 9.76339 10.2322 10.2322C9.76339 10.7011 9.5 11.337 9.5 12C9.5 12.663 9.76339 13.2989 10.2322 13.7678C10.7011 14.2366 11.337 14.5 12 14.5Z"
          fill="black"
          stroke="black"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </mask>
      <g mask="url(#mask0_1732_1514)">
        <path d="M0 0H24V24H0V0Z" fill="currentColor" />
      </g>
    </svg>
  );
}
