export default function KioskButton({ children, onClick, className = '', type = 'button', disabled = false }) {
  const handleClick = (event) => {
    if (disabled) return;
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    if (onClick) onClick(event);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={disabled}
      className={`touch-btn kiosk-primary-btn disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
