export default function Avatar({ fullName, diameter }: { fullName: string; diameter: number }): JSX.Element {
  const initials = nameToInitials(fullName);

  return (
    <div
      style={{ width: diameter, height: diameter, fontSize: diameter / 4 }}
      className="flex items-center justify-center rounded-full bg-primary-dark bg-opacity-5 font-medium text-primary-dark"
    >
      <p>{initials}</p>
    </div>
  );
}

function nameToInitials(fullName: string) {
  const namesArray = fullName.trim().split(' ');
  if (namesArray.length === 1) return `${namesArray[0].charAt(0)}`;
  else {
    const first = namesArray[0].charAt(0);
    const second = namesArray[namesArray.length - 1].charAt(0);
    return first + second;
  }
}
