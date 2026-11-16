import { useRef, useState } from 'react';

/**
 * Shared Pause / Resume / Stop control loop helper for sequential client-side batch jobs.
 */
export function useBatchControl() {
    const [isPaused, setIsPaused] = useState(false);
    const pausedRef = useRef(false);
    const stoppedRef = useRef(false);
    const resumeResolversRef = useRef([]);

    const wakeWaiters = () => {
        const resolvers = resumeResolversRef.current.splice(0);
        resolvers.forEach((resolve) => resolve());
    };

    const reset = () => {
        pausedRef.current = false;
        stoppedRef.current = false;
        setIsPaused(false);
        wakeWaiters();
    };

    const togglePause = () => {
        if (pausedRef.current) {
            pausedRef.current = false;
            setIsPaused(false);
            wakeWaiters();
        } else {
            pausedRef.current = true;
            setIsPaused(true);
        }
    };

    const stop = () => {
        stoppedRef.current = true;
        pausedRef.current = false;
        setIsPaused(false);
        wakeWaiters();
    };

    const waitIfPausedOrStopped = async () => {
        while (pausedRef.current && !stoppedRef.current) {
            await new Promise((resolve) => {
                resumeResolversRef.current.push(resolve);
            });
        }
        return stoppedRef.current;
    };

    return {
        isPaused,
        pausedRef,
        stoppedRef,
        reset,
        togglePause,
        stop,
        waitIfPausedOrStopped,
    };
}
