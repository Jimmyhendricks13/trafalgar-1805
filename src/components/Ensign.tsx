/** The colours flown at the close of the action. */
export const Ensign = ({ won }: { readonly won: boolean }) =>
  won ? (
    <div className="ensign ensign--tricolore" role="img" aria-label="The French tricolore" />
  ) : (
    <svg
      className="ensign"
      viewBox="0 0 60 30"
      role="img"
      aria-label="The Union Jack"
      xmlns="http://www.w3.org/2000/svg"
    >
      <clipPath id="union-jack-saltire">
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <rect width="60" height="30" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6" />
      <path
        d="M0,0 L60,30 M60,0 L0,30"
        clipPath="url(#union-jack-saltire)"
        stroke="#c8102e"
        strokeWidth="4"
      />
      <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#c8102e" strokeWidth="6" />
    </svg>
  )
