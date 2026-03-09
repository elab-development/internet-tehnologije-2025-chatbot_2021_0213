export default function Alert({ type = "error", children, onClose }) {
  if (!children) return null;
  const isError = type === "error";
  return (
    <div className={`alert ${isError ? "alert-error" : "alert-success"}`}>
      <span>{children}</span>
      {onClose && (
        <button className="alert-close" onClick={onClose}>×</button>
      )}
    </div>
  );
}
