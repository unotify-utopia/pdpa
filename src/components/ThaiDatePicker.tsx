import React, { useState, useEffect, useRef } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface ThaiDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  maxDate?: string;
  minDate?: string;
}

export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({ value, onChange, maxDate, minDate }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // current viewing month/year (CE)
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const [y, m] = value.split('-');
      return new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
    }
    return new Date();
  });

  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return 'วว/ดด/ปปปป';
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    const beYear = parseInt(y, 10) + 543;
    return `${d}/${m}/${beYear}`;
  };

  const monthsTh = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const daysTh = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const y = viewDate.getFullYear();
    const m = (viewDate.getMonth() + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const newDate = `${y}-${m}-${d}`;
    
    // Check min/max bounds
    if (maxDate && newDate > maxDate) {
      return;
    }
    if (minDate && newDate < minDate) {
      return;
    }

    onChange(newDate);
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      const currentDateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`;
      const isSelected = value === currentDateStr;
      
      let isDisabled = false;
      if (maxDate && currentDateStr > maxDate) isDisabled = true;
      if (minDate && currentDateStr < minDate) isDisabled = true;

      days.push(
        <button
          key={`day-${i}`}
          onClick={(e) => { e.stopPropagation(); handleDayClick(i); }}
          disabled={isDisabled}
          type="button"
          className={`h-8 w-8 text-xs rounded-full flex items-center justify-center transition-colors
            ${isDisabled ? 'text-slate-300 cursor-not-allowed' : 'hover:bg-brand-100 text-slate-700'}
            ${isSelected && !isDisabled ? 'bg-brand-600 text-white hover:bg-brand-700' : ''}
          `}
        >
          {i}
        </button>
      );
    }

    return (
      <div className="absolute z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl p-3 w-[260px]">
        <div className="flex justify-between items-center mb-3">
          <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-full">
            <ChevronLeft className="w-4 h-4 text-slate-600" />
          </button>
          <div className="text-sm font-bold text-slate-800">
            {monthsTh[month]} {year + 543}
          </div>
          <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-full">
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysTh.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-slate-500">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days}
        </div>
        <div className="mt-3 pt-2 border-t border-slate-100 text-center">
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(''); setIsOpen(false); }}
            className="text-[10px] text-slate-500 hover:text-slate-800 underline"
          >
            ล้างค่า
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Custom Display */}
      <div 
        className={`w-full cursor-pointer text-xs border rounded-lg p-2 font-mono flex items-center justify-between min-h-[34px] transition-colors
          ${isOpen ? 'border-brand-500 ring-1 ring-brand-500 bg-white' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {formatDisplayDate(value)}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-500" />
      </div>
      
      {isOpen && renderCalendar()}
    </div>
  );
};
