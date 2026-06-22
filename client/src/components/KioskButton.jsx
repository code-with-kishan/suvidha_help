export default function KioskButton({ children, onClick, className = '', type = 'button' }) {
  const handleClick = (event) => {
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    if (onClick) onClick(event);
  };

  return (
    <button
      type={type}
      onClick={handleClick}
      className={`touch-btn kiosk-primary-btn ${className}`}
    >
      {children}
    </button>
  );
}
