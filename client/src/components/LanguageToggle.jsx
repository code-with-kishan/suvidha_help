import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { setLanguage } from '../redux/store';

const options = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
  { code: 'ur', label: 'اردو' },
  { code: 'ne', label: 'नेपाली' },
  { code: 'ks', label: 'کٲشُر' },
  { code: 'doi', label: 'डोगरी' }
];

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const dispatch = useDispatch();
  const selected = useSelector((state) => state.ui.language);

  const onChange = (code) => {
    dispatch(setLanguage(code));
    i18n.changeLanguage(code);
  };

  return (
    <div className="lang-toggle-shell max-w-full">
      <div className="flex max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap">
        {options.map((option) => (
          <button
            key={option.code}
            onClick={() => onChange(option.code)}
            className={`touch-btn lang-toggle-btn shrink-0 sm:text-sm ${
              selected === option.code ? 'lang-toggle-btn-active' : ''
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
