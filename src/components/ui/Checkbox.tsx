import React from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ label, className, ...props }) => {
  const id = props.id || `checkbox-${Math.random().toString(36).substring(2, 9)}`;
  
  return (
    <div className="flex items-center">
      <div className="relative flex items-center">
        <input
          id={id}
          type="checkbox"
          className="sr-only"
          {...props}
        />
        <div
          className={`w-5 h-5 border rounded flex items-center justify-center ${
            props.checked
              ? 'bg-indigo-600 border-indigo-600'
              : 'bg-white border-gray-300'
          } ${props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
        >
          {props.checked && (
            <Check className="h-3 w-3 text-white" />
          )}
        </div>
      </div>
      {label && (
        <label
          htmlFor={id}
          className={`ml-2 text-sm text-gray-700 ${
            props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox; 