import React, { useState, useEffect } from 'react';

interface ThaiDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  maxDate?: string;
  minDate?: string;
}

export const ThaiDatePicker: React.FC<ThaiDatePickerProps> = ({ value, onChange, maxDate, minDate }) => {
  const [day, setDay] = useState<string>('');
  const [month, setMonth] = useState<string>('');
  const [year, setYear] = useState<string>(''); // This will be BE year

  // Parse incoming value
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const [y, m, d] = parts;
        setYear((parseInt(y, 10) + 543).toString());
        setMonth(parseInt(m, 10).toString());
        setDay(parseInt(d, 10).toString());
      }
    } else {
      setDay('');
      setMonth('');
      setYear('');
    }
  }, [value]);

  // Handle changes
  const updateValue = (d: string, m: string, y: string) => {
    if (d && m && y) {
      // Ensure month and day are 2 digits
      const ceYear = (parseInt(y, 10) - 543).toString();
      const paddedMonth = m.padStart(2, '0');
      const paddedDay = d.padStart(2, '0');
      const newValue = `${ceYear}-${paddedMonth}-${paddedDay}`;
      
      // Basic min/max validation (optional, can be handled by parent too)
      if (maxDate && newValue > maxDate) {
        // Exceeds max
        onChange(maxDate);
        return;
      }
      if (minDate && newValue < minDate) {
        // Below min
        onChange(minDate);
        return;
      }

      onChange(newValue);
    } else {
      onChange(''); // If incomplete, pass empty or handle as needed
    }
  };

  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const months = [
    { value: 1, label: 'มกราคม' },
    { value: 2, label: 'กุมภาพันธ์' },
    { value: 3, label: 'มีนาคม' },
    { value: 4, label: 'เมษายน' },
    { value: 5, label: 'พฤษภาคม' },
    { value: 6, label: 'มิถุนายน' },
    { value: 7, label: 'กรกฎาคม' },
    { value: 8, label: 'สิงหาคม' },
    { value: 9, label: 'กันยายน' },
    { value: 10, label: 'ตุลาคม' },
    { value: 11, label: 'พฤศจิกายน' },
    { value: 12, label: 'ธันวาคม' }
  ];

  const currentYearCE = new Date().getFullYear();
  const currentYearBE = currentYearCE + 543;
  const years = Array.from({ length: 100 }, (_, i) => currentYearBE - i);

  return (
    <div className="flex gap-2">
      <select
        value={day}
        onChange={(e) => {
          setDay(e.target.value);
          updateValue(e.target.value, month, year);
        }}
        className="flex-1 text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 bg-white"
      >
        <option value="">วัน</option>
        {days.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <select
        value={month}
        onChange={(e) => {
          setMonth(e.target.value);
          updateValue(day, e.target.value, year);
        }}
        className="flex-[1.5] text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 bg-white"
      >
        <option value="">เดือน</option>
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => {
          setYear(e.target.value);
          updateValue(day, month, e.target.value);
        }}
        className="flex-1 text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-brand-500 bg-white"
      >
        <option value="">ปี (พ.ศ.)</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
};
