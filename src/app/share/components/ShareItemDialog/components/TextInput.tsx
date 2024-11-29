/*eslint-disable @typescript-eslint/no-explicit-any */
/*eslint-disable @typescript-eslint/explicit-module-boundary-types */

import { CSSProperties } from 'react';

export interface TextInputProps {
  className?: string;
  type?: 'text' | 'email' | 'number' | 'password';
  value?: string;
  placeholder?: string;
  required?: boolean;
  id?: string;
  name?: string;
  min?: string | number;
  max?: string | number;
  disabled?: boolean;
  readonly?: boolean;
  autoComplete?:
    | 'false'
    | 'off'
    | 'on'
    | 'name'
    | 'username'
    | 'email'
    | 'password'
    | 'new-password'
    | 'current-password'
    | 'one-time-code'
    | 'cc-name'
    | 'cc-given-name'
    | 'cc-aditional-name'
    | 'cc-family-name'
    | 'cc-number'
    | 'cc-exp'
    | 'cc-exp-month'
    | 'cc-exp-year'
    | 'cc-csc'
    | 'cc-type'
    | 'transaction-currency'
    | 'transaction-ammount'
    | 'language'
    | 'tel'
    | 'url'
    | 'counrty'
    | 'counrty-name'
    | 'postal-code'
    | 'street-adress'
    | 'adress-line1'
    | 'adress-line2'
    | 'adress-line3';
  isPasswordInput?: boolean;
  pattern?: string;
  patternHint?: string;
  passwordError?: boolean;
  onChange?: (e: any) => void | (() => void);
  onChangeText?: (text: string) => void;
  style?: CSSProperties;
  onFocus?: (e: any) => void | (() => void);
  onBlur?: (e: any) => void | (() => void);
  onKeyDown?: (e: any) => void | (() => void);
  autoCompleteOnFocus?: boolean;
}

const TextInput = (props: TextInputProps) => {
  return (
    <input
      type={props.type ?? 'text'}
      placeholder={props.placeholder}
      value={props.value}
      required={props.required}
      style={props.style}
      id={props.id}
      name={props.name}
      min={props.min}
      max={props.max}
      pattern={props.pattern}
      title={props.patternHint}
      disabled={props.disabled}
      readOnly={props.readonly || props.autoCompleteOnFocus}
      autoComplete={props.autoComplete ?? 'off'}
      className={`h-11 w-full appearance-none rounded-lg  border-gray-30 bg-white px-3 ${
        props.isPasswordInput ? 'pr-12' : ''
      } text-lg text-gray-100 shadow-sm transition duration-100 focus:outline-none ${
        props.passwordError ? 'border-2 focus:border-red' : 'border focus:border-primary'
      } focus:shadow-none focus:ring focus:ring-primary/10 disabled:cursor-not-allowed disabled:border-gray-10 disabled:text-gray-30 md:text-base ${
        props.className ?? ''
      }`}
      onChange={props.onChange}
      onKeyPress={() => props.onChangeText}
      onKeyDown={props.onKeyDown}
      onFocus={(e) => {
        if (props.autoCompleteOnFocus) {
          e.target.removeAttribute('readonly');
        }
        if (props.onFocus) {
          props.onFocus(e);
        }
      }}
      onBlur={props.onBlur}
    />
  );
};

export default TextInput;
