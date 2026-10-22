import { Link } from 'react-router';
import { useConfig } from '../../config';

export function AnnouncementBar() {
    const { announcement } = useConfig();

    if (!announcement.enabled || !announcement.text) {
        return null;
    }

    const text = <span>{announcement.text}</span>;

    return (
        <div className="border-b border-line bg-raised text-center text-2xs tracking-[0.16em] text-muted uppercase">
            <p className="container-page py-2.5">
                {announcement.link ? (
                    <Link to={announcement.link} className="link-draw hover:text-ink">
                        {text}
                    </Link>
                ) : (
                    text
                )}
            </p>
        </div>
    );
}
