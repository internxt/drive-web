const AuthButton = ({
  isDisabled,
  text,
  textWhenDisabled,
}: {
  isDisabled: boolean;
  text: string;
  textWhenDisabled: string;
}): JSX.Element => (
  <button
    type="submit"
    className={`base-button easi-in-out flex w-full items-center justify-center transition duration-200 ${
      isDisabled ? 'cursor-default bg-gray-30' : 'bg-primary hover:bg-primary-dark'
    } rounded py-2 text-sm text-white`}
    disabled={isDisabled}
  >
    <span>{isDisabled ? textWhenDisabled : text}</span>
  </button>
);

export default AuthButton;
