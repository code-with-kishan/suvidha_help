import { useTranslation } from 'react-i18next';

const letterRowsByLanguage = {
  en: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ],
  hi: [
    ['क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ'],
    ['ड', 'ढ', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ'],
    ['ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'स', 'ह']
  ],
  mr: [
    ['क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ'],
    ['ड', 'ढ', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ'],
    ['ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'स', 'ह']
  ],
  ne: [
    ['क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ'],
    ['ड', 'ढ', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ'],
    ['ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'स', 'ह']
  ],
  doi: [
    ['क', 'ख', 'ग', 'घ', 'च', 'छ', 'ज', 'झ', 'ट', 'ठ'],
    ['ड', 'ढ', 'त', 'थ', 'द', 'ध', 'न', 'प', 'फ'],
    ['ब', 'भ', 'म', 'य', 'र', 'ल', 'व', 'स', 'ह']
  ],
  pa: [
    ['ਕ', 'ਖ', 'ਗ', 'ਘ', 'ਚ', 'ਛ', 'ਜ', 'ਝ', 'ਟ', 'ਠ'],
    ['ਡ', 'ਢ', 'ਤ', 'ਥ', 'ਦ', 'ਧ', 'ਨ', 'ਪ', 'ਫ'],
    ['ਬ', 'ਭ', 'ਮ', 'ਯ', 'ਰ', 'ਲ', 'ਵ', 'ਸ', 'ਹ']
  ],
  ur: [
    ['ا', 'ب', 'پ', 'ت', 'ٹ', 'ث', 'ج', 'چ', 'ح', 'خ'],
    ['د', 'ڈ', 'ذ', 'ر', 'ڑ', 'ز', 'ژ', 'س', 'ش'],
    ['ص', 'ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'ل']
  ],
  ks: [
    ['ا', 'ب', 'پ', 'ت', 'ٹ', 'ث', 'ج', 'چ', 'ح', 'خ'],
    ['د', 'ڈ', 'ذ', 'ر', 'ز', 'ژ', 'س', 'ش', 'ص'],
    ['ض', 'ط', 'ظ', 'ع', 'غ', 'ف', 'ق', 'ک', 'ل', 'م']
  ]
};

const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];

export default function OnScreenKeyboard({
  value,
  onChange,
  maxLength = 300,
  language = 'en',
  mode = 'text',
  onClose
}) {
  const { t } = useTranslation();
  const letterRows = letterRowsByLanguage[language] || letterRowsByLanguage.en;
  const isRtl = ['ur', 'ks'].includes(language);

  const append = (char) => {
    if (value.length >= maxLength) return;
    onChange(`${value}${char}`);
  };

  const backspace = () => {
    onChange(value.slice(0, -1));
  };

  const clearAll = () => {
    onChange('');
  };

  const extraKeys = mode === 'email' ? ['@', '.', '_', '-'] : ['.', ',', '-', '/'];

  return (
    <div className="onscreen-shell mt-3 max-w-full p-3" dir={isRtl ? 'rtl' : 'ltr'}>
      <p className="ui-hand-label mb-3 inline-block">{t('onscreenKeyboard')}</p>
      <div className="space-y-2">
        <div className="grid grid-cols-10 gap-1">
          {numberRow.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => append(key)}
              className="touch-btn onscreen-key px-2 py-2 text-sm"
            >
              {key}
            </button>
          ))}
        </div>

        {letterRows.map((row) => (
          <div key={row.join('')} className="grid grid-cols-10 gap-1">
            {row.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => append(key)}
                className="touch-btn onscreen-key px-2 py-2 text-sm"
              >
                {key}
              </button>
            ))}
          </div>
        ))}

        <div className="grid grid-cols-4 gap-1">
          {extraKeys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => append(key)}
              className="touch-btn onscreen-key px-2 py-2 text-sm"
            >
              {key}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-10 gap-1">
          <button
            type="button"
            onClick={() => append(' ')}
            className="touch-btn onscreen-key onscreen-key-soft col-span-5 px-2 py-2 text-sm"
          >
            Space
          </button>
          <button
            type="button"
            onClick={backspace}
            className="touch-btn onscreen-key onscreen-key-warn col-span-3 px-2 py-2 text-sm"
          >
            Backspace
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="touch-btn onscreen-key onscreen-key-danger col-span-2 px-2 py-2 text-sm"
          >
            Clear
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="touch-btn onscreen-key onscreen-key-close col-span-10 px-2 py-2 text-sm"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
