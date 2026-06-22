export default function OnScreenKeypad({ value, onChange, allowDecimal = false, onClose }) {
  const keys = allowDecimal ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'] : ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

  const append = (key) => {
    if (key === '.' && value.includes('.')) return;
    onChange(`${value}${key}`);
  };

  const backspace = () => {
    onChange(value.slice(0, -1));
  };

  const clearAll = () => {
    onChange('');
  };

  return (
    <div className="onscreen-shell mt-3 max-w-full p-3">
      <p className="ui-hand-label mb-3 inline-block">On-Screen Keypad</p>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => append(key)}
            className="touch-btn onscreen-key px-3 py-2 text-lg"
          >
            {key}
          </button>
        ))}
        <button
          type="button"
          onClick={backspace}
          className="touch-btn onscreen-key onscreen-key-warn px-3 py-2 text-sm"
        >
          Backspace
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="touch-btn onscreen-key onscreen-key-danger col-span-2 px-3 py-2 text-sm"
        >
          Clear
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="touch-btn onscreen-key onscreen-key-close col-span-3 px-3 py-2 text-sm"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
