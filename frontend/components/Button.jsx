export default function Button({ children, variant = "primary", ...props }) {
  let className = "btn";
  if (variant === "secondary") className = "btn secondary";
  else if (variant === "danger") className = "btn danger";
  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
}
