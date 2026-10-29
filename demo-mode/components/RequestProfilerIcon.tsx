type RequestProfilerIconProps = {
  className?: string
}

/** Gears + funnel icon for the dev request profiler header trigger. */
export default function RequestProfilerIcon({ className }: RequestProfilerIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 120"
      className={className}
      aria-hidden
    >
      <defs>
        <g id="request-profiler-gear">
          <path
            d="M 0,-14 L -2,-14 -3,-10 -5,-10 -7,-13 -10,-11 -8,-8 -9,-6 -13,-6 -13,-3 -9,-2 -9,0 -13,1 -13,4 -9,4 -8,7 -11,9 -9,12 -6,10 -4,11 -3,15 0,15 2,11 4,11 6,13 9,11 7,8 8,6 12,6 12,3 8,2 8,0 12,-1 12,-4 8,-4 7,-7 10,-9 8,-12 5,-10 3,-11 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinejoin="round"
          />
          <circle
            cx={0}
            cy={0}
            r={3.5}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
          />
        </g>
      </defs>

      <use href="#request-profiler-gear" transform="translate(36, 28) scale(0.85) rotate(15)" />
      <use href="#request-profiler-gear" transform="translate(60, 26) scale(1.05) rotate(45)" />
      <use href="#request-profiler-gear" transform="translate(44, 42) scale(0.95) rotate(5)" />

      <path
        d="M 23,49 C 23,46 77,46 77,49 C 77,52 23,52 23,49 Z"
        className="fill-white dark:fill-gray-800"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <path
        d="M 23,49 L 44,76 L 44,93 L 56,93 L 56,76 L 77,49"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
