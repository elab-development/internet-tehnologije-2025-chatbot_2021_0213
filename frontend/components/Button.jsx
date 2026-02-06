export default function Button({ children, variant = "primary", ...props }) {
  const className =
    variant === "secondary" ? "btn secondary" : "btn";
  return (
    <button className={className} {...props}>
      {children}
    </button>
  );
}
