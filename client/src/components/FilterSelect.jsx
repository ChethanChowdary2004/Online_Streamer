import { useState, useRef, useEffect } from 'react'

export default function FilterSelect({ label, value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Find selected option by comparing as strings to handle both string and number values
  const selectedOption = options.find((o) => String(o.value) === String(value))
  // Default to first option if no value provided or not found
  const displayOption = selectedOption || options[0]
  const selectedLabel = displayOption?.label || 'Select...'

  return (
    <div className="filter-dropdown-wrapper" ref={dropdownRef}>
      <label className="filter-group">
        <span className="filter-label">{label}</span>
        <button
          type="button"
          className="filter-dropdown-button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
        >
          <span className="filter-dropdown-value">{selectedLabel}</span>
          <span className={`filter-dropdown-arrow${isOpen ? ' open' : ''}`}>
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        </button>
      </label>

      {isOpen && (
        <div className="filter-dropdown-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`filter-dropdown-item${String(option.value) === String(value) ? ' active' : ''}`}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
