interface LogoProps {
  size?: number;
}

export default function Logo({ size = 40 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="40" height="40" rx="8" fill="#2563EB" />
      <path
        d="M12 10H24C25.1 10 26 10.9 26 12V28C26 29.1 25.1 30 24 30H12C10.9 30 10 29.1 10 28V12C10 10.9 10.9 10 12 10Z"
        fill="white"
        opacity="0.9"
      />
      <path
        d="M14 16H22M14 20H22M14 24H19"
        stroke="#2563EB"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M28 14V26C28 27.1 27.1 28 26 28"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}
