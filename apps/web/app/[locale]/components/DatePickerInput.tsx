"use client";

import { useState, useRef, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import { format, parse, isValid } from "date-fns";
import { th, enUS, zhCN } from "date-fns/locale";
import "react-day-picker/dist/style.css";
import { useLocale } from "next-intl";

interface DatePickerInputProps {
  id?: string;
  name: string;
  value: string;
  onChange: (e: any) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const localeMap: Record<string, any> = {
  th,
  en: enUS,
  zh: zhCN,
};

export default function DatePickerInput({
  id,
  name,
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  required = false,
  className = "",
}: DatePickerInputProps) {
  const locale = useLocale() as "th" | "en" | "zh";
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse DD/MM/YYYY format to Date
  function parseInputDate(input: string): Date | undefined {
    if (!input) return undefined;
    const parsed = parse(input, "dd/MM/yyyy", new Date());
    return isValid(parsed) ? parsed : undefined;
  }

  // Format Date to DD/MM/YYYY
  function formatDateValue(date: Date | undefined): string {
    if (!date) return "";
    return format(date, "dd/MM/yyyy");
  }

  // Handle text input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Allow partial input and only validate on blur or when complete
    if (newValue.length === 10) {
      const parsed = parseInputDate(newValue);
      if (parsed) {
        onChange({
          target: { name, value: newValue },
        });
      }
    }
  };

  // Handle input blur
  const handleInputBlur = () => {
    const parsed = parseInputDate(inputValue);
    if (inputValue && !parsed) {
      // Invalid format, keep original
      setInputValue(value);
    }
  };

  // Handle calendar date click
  const handleDateClick = (date: Date) => {
    const formatted = formatDateValue(date);
    setInputValue(formatted);
    onChange({
      target: { name, value: formatted },
    });
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Close picker on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Sync internal state with prop value
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const selectedDate = parseInputDate(inputValue);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        required={required}
        inputMode="numeric"
        className={`w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${className}`}
      />

      {isOpen && (
        <div className="absolute z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) handleDateClick(date);
            }}
            locale={localeMap[locale]}
            disabled={(date) => {
              // Disable past dates for future bookings, but allow any for display
              return false;
            }}
          />
        </div>
      )}
    </div>
  );
}
