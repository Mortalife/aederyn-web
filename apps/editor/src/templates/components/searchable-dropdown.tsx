import type { FC } from "hono/jsx";

interface DropdownOption {
  id: string;
  label: string;
  sublabel?: string;
}

interface SearchableDropdownProps {
  name: string;
  label: string;
  options: DropdownOption[];
  selectedValue?: string;
  placeholder?: string;
  required?: boolean;
  testId?: string;
}

export const SearchableDropdown: FC<SearchableDropdownProps> = ({
  name,
  label,
  options,
  selectedValue,
  placeholder = "Search...",
  required = false,
  testId,
}) => {
  return (
    <div class="relative">
      <label class="block text-sm font-medium text-gray-300 mb-2">
        {label} {required && <span class="text-red-400">*</span>}
      </label>
      <div data-testid={testId || "item-search-dropdown"} class="relative">
        <select
          name={name}
          required={required}
          data-testid="dropdown-search"
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 appearance-none"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option
              key={option.id}
              value={option.id}
              selected={selectedValue === option.id}
              data-testid="dropdown-option"
            >
              {option.label} {option.sublabel ? `(${option.sublabel})` : ""}
            </option>
          ))}
        </select>
        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <p class="text-xs text-gray-500 mt-1">{options.length} options available</p>
    </div>
  );
};

interface MultiSelectDropdownProps {
  name: string;
  label: string;
  options: DropdownOption[];
  selectedValues?: string[];
  placeholder?: string;
  testId?: string;
}

export const MultiSelectDropdown: FC<MultiSelectDropdownProps> = ({
  name,
  label,
  options,
  selectedValues = [],
  placeholder = "Select items...",
  testId,
}) => {
  return (
    <div>
      <label class="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      
      {/* Selected items display */}
      {selectedValues.length > 0 && (
        <div class="flex flex-wrap gap-2 mb-2">
          {selectedValues.map((value) => {
            const option = options.find((o) => o.id === value);
            return (
              <span
                key={value}
                class="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-sm"
              >
                {option?.label || value}
              </span>
            );
          })}
        </div>
      )}

      <div data-testid={testId} class="relative">
        <select
          name={name}
          multiple
          class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 min-h-[100px]"
        >
          {options.map((option) => (
            <option
              key={option.id}
              value={option.id}
              selected={selectedValues.includes(option.id)}
            >
              {option.label} {option.sublabel ? `(${option.sublabel})` : ""}
            </option>
          ))}
        </select>
      </div>
      <p class="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>

      {/* Hidden input for JSON array */}
      <input type="hidden" name={`${name}_json`} value={JSON.stringify(selectedValues)} />
    </div>
  );
};
