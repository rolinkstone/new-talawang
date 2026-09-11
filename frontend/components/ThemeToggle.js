import { FaSun, FaMoon } from 'react-icons/fa';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label={theme === 'light' ? 'Ganti ke mode gelap' : 'Ganti ke mode terang'}
      title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
    >
      {theme === 'light' ? (
        <FaMoon className="text-gray-600 dark:text-gray-300 text-lg" />
      ) : (
        <FaSun className="text-yellow-400 text-lg" />
      )}
    </button>
  );
}
