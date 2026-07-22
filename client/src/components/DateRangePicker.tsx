import React, { useState } from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
  className?: string;
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [date, setDate] = useState<DateRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  });
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    { label: 'Today', getValue: () => ({ from: new Date(), to: new Date() }) },
    { label: 'Yesterday', getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
    { label: 'Last 7 Days', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
    { label: 'Last 30 Days', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
    { label: 'Last Month', getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
    { label: 'Year to Date', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  ];

  const handleSelectPreset = (preset: { label: string; getValue: () => { from: Date; to: Date } }) => {
    const range = preset.getValue();
    setDate(range);
    onDateRangeChange(range);
    setIsOpen(false);
  };

  const handleApply = () => {
    if (date?.from && date?.to) {
      onDateRangeChange({ from: date.from, to: date.to });
      setIsOpen(false);
    }
  };

  const formatDateLabel = () => {
    if (!dateRange.from) return 'Select dates';
    if (!dateRange.to || dateRange.from.getTime() === dateRange.to.getTime()) {
      return format(dateRange.from, 'MMM dd, yyyy');
    }
    return `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;
  };

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          {/* Mobile: icon-only button. Desktop: full date label */}
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'text-left font-normal bg-white h-9',
              // Mobile: square icon-only button
              'w-9 px-0 justify-center sm:w-[260px] sm:px-3 sm:justify-between',
              !date && 'text-muted-foreground'
            )}
            title={formatDateLabel()}
          >
            <CalendarIcon className="h-4 w-4 text-slate-500 shrink-0" />
            {/* Full label on sm+ */}
            <span className="hidden sm:block text-[13px] text-slate-700 font-medium truncate flex-1 text-left ml-2">
              {formatDateLabel()}
            </span>
            <ChevronDown className="hidden sm:block h-4 w-4 text-slate-400 shrink-0" />
          </Button>
        </PopoverTrigger>

        {/*
          Mobile: single column (flex-col), popover fills screen width minus margins.
          Desktop: side-by-side (flex-row), full two-month layout.
        */}
        <PopoverContent
          className="p-0 flex flex-col sm:flex-row bg-white border-slate-200 shadow-xl rounded-xl overflow-hidden"
          style={{ width: 'min(calc(100vw - 2rem), 560px)' }}
          align="end"
          sideOffset={8}
        >
          {/* Presets — wrap horizontally on mobile, vertical column on desktop */}
          <div className="flex flex-row flex-wrap sm:flex-col gap-0.5 border-b sm:border-b-0 sm:border-r border-slate-100 px-2 py-2 sm:w-36 bg-slate-50/50 shrink-0">
            <span className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-2 pt-1">Custom</span>
            {presets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleSelectPreset(preset)}
                className="text-left px-2.5 py-1 text-[13px] sm:text-xs text-slate-600 hover:bg-slate-100 hover:text-slate-900 rounded-md transition-colors whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Calendar — single month on mobile, two months on desktop */}
          <div className="px-2 py-2 sm:p-3 flex flex-col min-w-0 w-full">
            {/* Mobile: 1 month */}
            <div className="sm:hidden w-full">
              <Calendar
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={1}
                className="bg-white w-full"
              />
            </div>
            {/* Desktop: 2 months */}
            <div className="hidden sm:block">
              <Calendar
                mode="range"
                defaultMonth={date?.from}
                selected={date}
                onSelect={setDate}
                numberOfMonths={2}
                className="bg-white"
              />
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
              <div className="text-[11px] text-slate-500 font-medium">
                {date?.from ? format(date.from, 'MMM dd, yyyy') : 'Start'}
                {' '} – {' '}
                {date?.to ? format(date.to, 'MMM dd, yyyy') : 'End'}
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button size="sm" className="h-8 text-xs bg-slate-800 hover:bg-slate-900 text-white px-4" onClick={handleApply} disabled={!date?.from || !date?.to}>Apply</Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
