import React, { useRef } from 'react';
import { Calendar } from 'lucide-react';

interface ThaiDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  maxDate?: string;
  minDate?: string;
}

export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({ value, onChange, maxDate, minDate }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'วว/ดด/ปปปป';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    const beYear = parseInt(y, 10) + 543;
    return `${d}/${m}/${beYear}`;
  };

  const handleContainerClick = () => {
    try {
      if (inputRef.current && 'showPicker' in HTMLInputElement.prototype) {
        inputRef.current.showPicker();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (e) {
      // Fallback if showPicker fails
      inputRef.current?.focus();
    }
  };

  return (
    <div 
      className="relative w-full cursor-pointer"
      onClick={handleContainerClick}
    >
      {/* Hidden Native Date Input */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        max={maxDate}
        min={minDate}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-none"
        style={{ color: 'transparent', background: 'transparent' }}
      />
      
      {/* Custom Display */}
      <div className="w-full text-xs border border-slate-300 rounded-lg p-2 focus:ring-1 focus:ring-brand-500 font-mono bg-white flex items-center justify-between min-h-[34px]">
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {formatDisplayDate(value)}
        </span>
        <Calendar className="w-4 h-4 text-slate-500" />
      </div>
    </div>
  );
};
