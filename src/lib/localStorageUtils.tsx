export function clearLocalStorage() {
  localStorage.removeItem('xUser');
  localStorage.removeItem('xToken');
  localStorage.removeItem('xMnemonic');
  localStorage.removeItem('xTeam');
  localStorage.removeItem('xTokenTeam');
}