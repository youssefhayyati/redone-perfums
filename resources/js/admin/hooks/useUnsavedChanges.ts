import { useCallback, useEffect, useRef } from 'react';
import { useBlocker, type Blocker, type BlockerFunction } from 'react-router';

/**
 * Protects a long form: leaving the screen with unsaved edits asks for confirmation
 * (in-app navigation through the returned blocker, tab close or reload through the
 * browser's own prompt). Call `allowNavigation()` right before navigating away after
 * a successful save, since React state has not re-rendered yet at that point.
 */
export function useUnsavedChanges(dirty: boolean): { blocker: Blocker; allowNavigation: () => void } {
    const dirtyRef = useRef(dirty);
    const bypassRef = useRef(false);

    useEffect(() => {
        dirtyRef.current = dirty;
        if (dirty) {
            bypassRef.current = false;
        }
    }, [dirty]);

    const shouldBlock = useCallback<BlockerFunction>(
        ({ currentLocation, nextLocation }) => dirtyRef.current && !bypassRef.current && currentLocation.pathname !== nextLocation.pathname,
        [],
    );
    const blocker = useBlocker(shouldBlock);

    useEffect(() => {
        if (!dirty) {
            return;
        }

        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            if (dirtyRef.current && !bypassRef.current) {
                event.preventDefault();
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', onBeforeUnload);

        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [dirty]);

    const allowNavigation = useCallback(() => {
        bypassRef.current = true;
    }, []);

    return { blocker, allowNavigation };
}
