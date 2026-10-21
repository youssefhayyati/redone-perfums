import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@shared/theme';
import { IconButton } from '../ui/Button';

export function ThemeToggle({ className }: { className?: string }) {
    const [theme, setTheme] = useTheme();
    const next = theme === 'dark' ? 'light' : 'dark';

    return (
        <IconButton label={next === 'light' ? 'Passer en mode jour' : 'Passer en mode nuit'} onClick={() => setTheme(next)} className={className}>
            {theme === 'dark' ? <Sun className="size-[1.15rem]" strokeWidth={1.25} /> : <Moon className="size-[1.15rem]" strokeWidth={1.25} />}
        </IconButton>
    );
}
