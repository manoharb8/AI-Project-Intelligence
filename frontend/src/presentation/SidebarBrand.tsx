import {useId} from 'react';

/** Decorative brand geometry; not a link or an unavailable product action. */
export default function SidebarBrand() {
  const id = useId().replace(/:/g, '');
  return <div className="brand-identity" role="img" aria-label="Project Intelligence & Risk Advisor">
    <span className="intelligence-brand-symbol" aria-hidden="true">
      <svg viewBox="0 0 56 60" fill="none">
        <defs>
          <linearGradient id={`${id}-base`} x1="8" y1="4" x2="47" y2="56" gradientUnits="userSpaceOnUse"><stop stopColor="#365573"/><stop offset="1" stopColor="#142b44"/></linearGradient>
          <linearGradient id={`${id}-edge`} x1="10" y1="7" x2="44" y2="54" gradientUnits="userSpaceOnUse"><stop stopColor="#9cbada"/><stop offset="1" stopColor="#355572"/></linearGradient>
          <linearGradient id={`${id}-amber`} x1="15" y1="18" x2="42" y2="29" gradientUnits="userSpaceOnUse"><stop stopColor="#ffe1a1"/><stop offset="1" stopColor="#e5ad4d"/></linearGradient>
        </defs>
        <path d="M28 3 49 15v30L28 57 7 45V15L28 3Z" fill={`url(#${id}-base)`} stroke={`url(#${id}-edge)`}/>
        <path d="M12 18 28 9l16 9" stroke="#a9c9e9" strokeOpacity=".18"/>
        <g className="brand-layer brand-layer-bottom"><path d="m15 35 13 7 13-7v5l-13 7-13-7v-5Z" fill="#5792bd" fillOpacity=".2"/><path d="m15 35 13 7 13-7" stroke="#8bafd0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></g>
        <g className="brand-layer brand-layer-middle"><path d="m15 28 13 7 13-7v5l-13 7-13-7v-5Z" fill="#68a6d1" fillOpacity=".15"/><path d="m15 28 13 7 13-7" stroke="#c1d8ed" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></g>
        <g className="brand-layer brand-layer-top"><path d="m14 22 14-8 14 8-14 8-14-8Z" fill="#f4c777" fillOpacity=".08" stroke={`url(#${id}-amber)`} strokeWidth="1.8" strokeLinejoin="round"/><path d="m23 22 5-3 5 3-5 3-5-3Z" fill="#f2c16b"/></g>
        <path d="M28 47v5" stroke="#e5b868" strokeOpacity=".5" strokeLinecap="round"/>
      </svg>
    </span>
    <span className="brand-wordmark">Project Intelligence <small>&amp; Risk Advisor</small></span>
  </div>;
}
