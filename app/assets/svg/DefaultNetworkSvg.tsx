/**
 * Default SVG icon for networks without a logo.
 *
 * @returns SVG icon representing a generic network.
 */
export default function DefaultNetworkSvg() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" fill="#9CA3AF" />
      <circle cx="5" cy="12" r="2" fill="white" />
      <circle cx="19" cy="12" r="2" fill="white" />
      <circle cx="12" cy="5" r="2" fill="white" />
      <circle cx="12" cy="19" r="2" fill="white" />
      <line x1="12" y1="7" x2="12" y2="17" stroke="white" strokeWidth="1.5" />
      <line x1="7" y1="12" x2="17" y2="12" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}
